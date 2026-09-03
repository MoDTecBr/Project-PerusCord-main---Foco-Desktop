import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { ChannelType } from '@prisma/client';
import { Permission, hasPermission } from '@relay/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsEvaluatorService } from '../common/services/permissions-evaluator.service';
import { AppConfig } from '../config/configuration';

export interface VoiceTokenResult {
  token: string;
  url: string;
  roomName: string;
}

export interface VoicePresenceParticipant {
  identity: string;
  name: string;
  isSharingScreen: boolean;
  /** Timestamp (ms desde epoch) de quando a pessoa entrou na call. */
  joinedAtMs: number;
}

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);
  private readonly livekitConfig: AppConfig['livekit'];
  private readonly roomService: RoomServiceClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluator: PermissionsEvaluatorService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.livekitConfig = config.get('livekit', { infer: true });
    // RoomServiceClient fala HTTP(S) com o LiveKit, não WS — mesma origem do
    // `url` de conexão do cliente, só trocando o protocolo.
    const httpUrl = this.livekitConfig.url.replace(/^ws/, 'http');
    this.roomService = new RoomServiceClient(
      httpUrl,
      this.livekitConfig.apiKey,
      this.livekitConfig.apiSecret,
    );
  }

  /**
   * Emite um token de acesso ao LiveKit para o usuário entrar na "sala"
   * correspondente a um canal de voz/vídeo — a sala é o próprio id do canal,
   * então cada canal de voz/vídeo é 1:1 com uma sala do LiveKit.
   */
  async mintVoiceToken(channelId: string, userId: string): Promise<VoiceTokenResult> {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
      throw new NotFoundException('Canal não encontrado.');
    }
    if (channel.type !== ChannelType.VOICE && channel.type !== ChannelType.VIDEO) {
      throw new BadRequestException('Este canal não é de voz nem de vídeo.');
    }
    if (!channel.serverId) {
      throw new BadRequestException('Chamada em DM ainda não é suportada.');
    }

    const bitfield = await this.evaluator.computeBitfield(channel.serverId, userId, {
      channelId: channel.id,
      categoryId: channel.categoryId ?? undefined,
    });
    if (bitfield === null || !hasPermission(bitfield, Permission.CONNECT)) {
      throw new ForbiddenException('Você não tem permissão para entrar neste canal.');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const at = new AccessToken(this.livekitConfig.apiKey, this.livekitConfig.apiSecret, {
      identity: userId,
      name: user.displayName,
      ttl: '4h',
    });
    at.addGrant({
      roomJoin: true,
      room: channel.id,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return { token: await at.toJwt(), url: this.livekitConfig.url, roomName: channel.id };
  }

  /**
   * Quem está conectado em cada canal de voz/vídeo do servidor agora — para
   * a sidebar mostrar isso antes mesmo de você entrar, como Discord/Slack.
   * Uma sala do LiveKit só existe enquanto tem alguém dentro; consultar uma
   * sala vazia/inexistente é esperado e não é erro, só retorna vazio.
   */
  async getVoicePresence(
    serverId: string,
    userId: string,
  ): Promise<Record<string, VoicePresenceParticipant[]>> {
    const member = await this.prisma.member.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Você não é membro deste servidor.');
    }

    const channels = await this.prisma.channel.findMany({
      where: { serverId, type: { in: [ChannelType.VOICE, ChannelType.VIDEO] } },
    });

    const entries = await Promise.all(
      channels.map(async (channel): Promise<[string, VoicePresenceParticipant[]]> => {
        try {
          const participants = await this.roomService.listParticipants(channel.id);
          return [
            channel.id,
            participants.map((p) => ({
              identity: p.identity,
              name: p.name,
              isSharingScreen: p.tracks.some(
                (t) => t.source === TrackSource.SCREEN_SHARE && !t.muted,
              ),
              joinedAtMs: Number(p.joinedAtMs),
            })),
          ];
        } catch (error) {
          // Sala nunca foi criada (ninguém entrou ainda) — comportamento normal, não loga como erro.
          this.logger.debug(`Sem sala ativa para o canal ${channel.id}: ${error}`);
          return [channel.id, []];
        }
      }),
    );

    return Object.fromEntries(entries);
  }
}
