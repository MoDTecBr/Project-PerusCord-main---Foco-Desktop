import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { RealtimeEvent } from '@relay/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

const PUBLIC_SELECT = {
  select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
} as const;

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async sendRequest(requesterId: string, dto: SendFriendRequestDto) {
    const target = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!target) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (target.id === requesterId) {
      throw new BadRequestException('Você não pode adicionar a si mesmo como amigo.');
    }

    const existing = await this.findRelationship(requesterId, target.id);

    if (existing) {
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new ForbiddenException('Não é possível enviar uma solicitação para este usuário.');
      }
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('Vocês já são amigos.');
      }
      if (existing.status === FriendshipStatus.PENDING) {
        throw new ConflictException('Já existe uma solicitação pendente entre vocês.');
      }
      // Estava DECLINED — deixa tentar de novo, reabrindo a mesma linha.
      const reopened = await this.prisma.friendship.update({
        where: { id: existing.id },
        data: { status: FriendshipStatus.PENDING, requesterId, addresseeId: target.id },
      });
      this.realtime.emitToUser(target.id, RealtimeEvent.FRIEND_REQUEST_CREATE, reopened);
      return reopened;
    }

    const created = await this.prisma.friendship.create({
      data: { requesterId, addresseeId: target.id },
    });
    this.realtime.emitToUser(target.id, RealtimeEvent.FRIEND_REQUEST_CREATE, created);
    return created;
  }

  async respond(userId: string, friendshipId: string, accept: boolean) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.addresseeId !== userId) {
      throw new NotFoundException('Solicitação não encontrada.');
    }
    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Esta solicitação já foi respondida.');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: accept ? FriendshipStatus.ACCEPTED : FriendshipStatus.DECLINED },
    });
    this.realtime.emitToUser(friendship.requesterId, RealtimeEvent.FRIEND_REQUEST_UPDATE, updated);
    return updated;
  }

  async remove(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
      throw new NotFoundException('Amizade ou solicitação não encontrada.');
    }

    await this.prisma.friendship.delete({ where: { id: friendshipId } });
    const otherId = friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId;
    this.realtime.emitToUser(otherId, RealtimeEvent.FRIEND_REQUEST_UPDATE, {
      id: friendshipId,
      status: 'REMOVED',
    });
  }

  async block(userId: string, username: string) {
    const target = await this.prisma.user.findUnique({ where: { username } });
    if (!target) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (target.id === userId) {
      throw new BadRequestException('Você não pode bloquear a si mesmo.');
    }

    const existing = await this.findRelationship(userId, target.id);
    if (existing) {
      return this.prisma.friendship.update({
        where: { id: existing.id },
        data: { status: FriendshipStatus.BLOCKED, requesterId: userId, addresseeId: target.id },
      });
    }
    return this.prisma.friendship.create({
      data: { requesterId: userId, addresseeId: target.id, status: FriendshipStatus.BLOCKED },
    });
  }

  async listFriends(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: { requester: PUBLIC_SELECT, addressee: PUBLIC_SELECT },
    });
    return rows.map((r) => (r.requesterId === userId ? r.addressee : r.requester));
  }

  async listPending(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.friendship.findMany({
        where: { addresseeId: userId, status: FriendshipStatus.PENDING },
        include: { requester: PUBLIC_SELECT },
      }),
      this.prisma.friendship.findMany({
        where: { requesterId: userId, status: FriendshipStatus.PENDING },
        include: { addressee: PUBLIC_SELECT },
      }),
    ]);
    return { incoming, outgoing };
  }

  /** Verifica se já existe QUALQUER relação (nos dois sentidos) entre os dois usuários. */
  private async findRelationship(userAId: string, userBId: string) {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userAId, addresseeId: userBId },
          { requesterId: userBId, addresseeId: userAId },
        ],
      },
    });
  }
}
