import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FriendshipStatus, PresenceStatus } from '@prisma/client';
import { RealtimeEvent } from '@relay/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';
import { PresenceService } from './presence.service';

interface AuthedSocket extends Socket {
  data: { userId: string };
}

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = await this.authenticate(client);
      (client as AuthedSocket).data.userId = userId;

      await client.join(`user:${userId}`);
      const memberships = await this.prisma.member.findMany({
        where: { userId },
        select: { serverId: true },
      });
      await Promise.all(memberships.map((m) => client.join(`server:${m.serverId}`)));

      const becameOnline = await this.presence.addSocket(userId, client.id);
      if (becameOnline) {
        await this.broadcastPresence(userId);
      }
    } catch (error) {
      this.logger.warn(`Conexão recusada: ${error instanceof Error ? error.message : error}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = (client as AuthedSocket).data?.userId;
    if (!userId) return;

    const becameOffline = await this.presence.removeSocket(userId, client.id);
    if (becameOffline) {
      await this.broadcastPresence(userId);
    }
  }

  @SubscribeMessage(RealtimeEvent.PRESENCE_SET)
  async handlePresenceSet(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { status: PresenceStatus },
  ): Promise<void> {
    const allowed: PresenceStatus[] = [
      PresenceStatus.ONLINE,
      PresenceStatus.IDLE,
      PresenceStatus.DO_NOT_DISTURB,
    ];
    if (!allowed.includes(body.status)) return;

    await this.prisma.user.update({
      where: { id: client.data.userId },
      data: { status: body.status },
    });
    await this.broadcastPresence(client.data.userId);
  }

  @SubscribeMessage(RealtimeEvent.TYPING_START)
  async handleTypingStart(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { channelId: string },
  ): Promise<void> {
    await this.relayTyping(client, body.channelId, RealtimeEvent.TYPING_START);
  }

  @SubscribeMessage(RealtimeEvent.TYPING_STOP)
  async handleTypingStop(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { channelId: string },
  ): Promise<void> {
    await this.relayTyping(client, body.channelId, RealtimeEvent.TYPING_STOP);
  }

  // --- API usada por outros módulos (MessagesService, InvitesService, FriendsService...) ---

  emitToServer(serverId: string, event: string, payload: unknown): void {
    this.server.to(`server:${serverId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  async joinUserToServerRoom(userId: string, serverId: string): Promise<void> {
    const sockets = await this.server.in(`user:${userId}`).fetchSockets();
    await Promise.all(sockets.map((s) => s.join(`server:${serverId}`)));
  }

  // --- internos ---

  private async relayTyping(
    client: AuthedSocket,
    channelId: string,
    event: string,
  ): Promise<void> {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) return;

    const payload = { channelId, userId: client.data.userId };
    if (channel.serverId) {
      client.to(`server:${channel.serverId}`).emit(event, payload);
    } else {
      const participants = await this.prisma.dMParticipant.findMany({
        where: { channelId, userId: { not: client.data.userId } },
      });
      for (const p of participants) {
        client.to(`user:${p.userId}`).emit(event, payload);
      }
    }
  }

  /** Anuncia a presença do usuário para todo mundo que "importa": membros
   * dos mesmos servidores e amigos aceitos (mesmo sem servidor em comum). */
  private async broadcastPresence(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!user) return;
    const status = await this.presence.effectiveStatus(userId, user.status);
    const payload = { userId, status };

    const [memberships, friendships] = await Promise.all([
      this.prisma.member.findMany({ where: { userId }, select: { serverId: true } }),
      this.prisma.friendship.findMany({
        where: {
          status: FriendshipStatus.ACCEPTED,
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
      }),
    ]);

    for (const m of memberships) {
      this.emitToServer(m.serverId, RealtimeEvent.PRESENCE_UPDATE, payload);
    }
    for (const f of friendships) {
      const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId;
      this.emitToUser(friendId, RealtimeEvent.PRESENCE_UPDATE, payload);
    }
  }

  private async authenticate(client: Socket): Promise<string> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.headers.authorization?.replace('Bearer ', '') as string | undefined);
    if (!token) {
      throw new UnauthorizedException('Token de acesso ausente no handshake.');
    }
    const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
      secret: this.config.get('jwt', { infer: true }).accessSecret,
    });
    return payload.sub;
  }
}
