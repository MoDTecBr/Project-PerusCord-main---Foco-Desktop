import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus, Prisma } from '@prisma/client';
import { Permission, hasPermission } from '@relay/permissions';
import { RealtimeEvent } from '@relay/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsEvaluatorService } from '../common/services/permissions-evaluator.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ListMessagesDto } from './dto/list-messages.dto';

const AUTHOR_SELECT = {
  select: { id: true, username: true, displayName: true, avatarUrl: true },
} as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluator: PermissionsEvaluatorService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(channelId: string, authorId: string, dto: CreateMessageDto) {
    const channel = await this.getChannelOrThrow(channelId);
    await this.assertCanSend(channel, authorId);

    const hasText = !!dto.content?.trim();
    const hasAttachments = !!dto.attachments?.length;
    if (!hasText && !hasAttachments) {
      throw new BadRequestException('Mensagem precisa ter texto ou pelo menos um anexo.');
    }

    if (dto.replyToId) {
      const replyTo = await this.prisma.message.findUnique({ where: { id: dto.replyToId } });
      if (!replyTo || replyTo.channelId !== channelId) {
        throw new BadRequestException('Mensagem respondida não pertence a este canal.');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        channelId,
        authorId,
        content: dto.content ?? '',
        replyToId: dto.replyToId,
        attachments: hasAttachments ? (dto.attachments as unknown as Prisma.InputJsonValue) : undefined,
      },
      include: { author: AUTHOR_SELECT },
    });

    await this.broadcast(channel, RealtimeEvent.MESSAGE_CREATE, message);
    return message;
  }

  async list(channelId: string, userId: string, query: ListMessagesDto) {
    const channel = await this.getChannelOrThrow(channelId);
    await this.assertCanRead(channel, userId);

    const limit = query.limit ?? 50;
    return this.prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        ...(query.before ? { id: { lt: query.before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { author: AUTHOR_SELECT },
    });
  }

  /**
   * Busca simples por substring (case-insensitive). Funciona bem no volume de
   * um servidor pequeno; se o volume de mensagens crescer, o próximo passo é
   * uma coluna `tsvector` gerada + índice GIN (Postgres full-text search).
   */
  async search(channelId: string, userId: string, q: string) {
    const channel = await this.getChannelOrThrow(channelId);
    await this.assertCanRead(channel, userId);

    return this.prisma.message.findMany({
      where: { channelId, deletedAt: null, content: { contains: q, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { author: AUTHOR_SELECT },
    });
  }

  async update(messageId: string, userId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) {
      throw new NotFoundException('Mensagem não encontrada.');
    }
    if (message.authorId !== userId) {
      throw new ForbiddenException('Só o autor pode editar a mensagem.');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: dto.content, editedAt: new Date() },
      include: { author: AUTHOR_SELECT },
    });

    const channel = await this.getChannelOrThrow(message.channelId);
    await this.broadcast(channel, RealtimeEvent.MESSAGE_UPDATE, updated);
    return updated;
  }

  async remove(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) {
      throw new NotFoundException('Mensagem não encontrada.');
    }

    const channel = await this.getChannelOrThrow(message.channelId);
    if (message.authorId !== userId) {
      if (!channel.serverId) {
        throw new ForbiddenException('Só o autor pode apagar a mensagem em uma DM.');
      }
      const bitfield = await this.evaluator.computeBitfield(channel.serverId, userId, {
        channelId: channel.id,
        categoryId: channel.categoryId ?? undefined,
      });
      if (bitfield === null || !hasPermission(bitfield, Permission.MANAGE_MESSAGES)) {
        throw new ForbiddenException('Você não tem permissão para apagar esta mensagem.');
      }
    }

    await this.prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
    await this.broadcast(channel, RealtimeEvent.MESSAGE_DELETE, { id: messageId, channelId: channel.id });
  }

  private async getChannelOrThrow(channelId: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
      throw new NotFoundException('Canal não encontrado.');
    }
    return channel;
  }

  private async assertCanSend(
    channel: { id: string; serverId: string | null; categoryId: string | null },
    userId: string,
  ): Promise<void> {
    if (channel.serverId) {
      const bitfield = await this.evaluator.computeBitfield(channel.serverId, userId, {
        channelId: channel.id,
        categoryId: channel.categoryId ?? undefined,
      });
      if (bitfield === null || !hasPermission(bitfield, Permission.SEND_MESSAGES)) {
        throw new ForbiddenException('Você não tem permissão para enviar mensagens neste canal.');
      }
      return;
    }
    await this.assertDmParticipant(channel.id, userId);
    await this.assertNotBlockedInDm(channel.id, userId);
  }

  private async assertCanRead(
    channel: { id: string; serverId: string | null; categoryId: string | null },
    userId: string,
  ): Promise<void> {
    if (channel.serverId) {
      const bitfield = await this.evaluator.computeBitfield(channel.serverId, userId, {
        channelId: channel.id,
        categoryId: channel.categoryId ?? undefined,
      });
      if (bitfield === null || !hasPermission(bitfield, Permission.READ_MESSAGE_HISTORY)) {
        throw new ForbiddenException('Você não tem permissão para ver o histórico deste canal.');
      }
      return;
    }
    await this.assertDmParticipant(channel.id, userId);
  }

  private async assertDmParticipant(channelId: string, userId: string): Promise<void> {
    const participant = await this.prisma.dMParticipant.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!participant) {
      throw new ForbiddenException('Você não participa desta conversa.');
    }
  }

  /**
   * `DMParticipant` não muda quando alguém bloqueia o outro — o canal de DM
   * persiste independente da amizade. Sem essa checagem, um usuário
   * bloqueado continuaria mandando mensagem na conversa já existente.
   *
   * Só bloqueia o ENVIO de quem foi bloqueado — quem bloqueou continua livre
   * para mandar mensagem se quiser (bloquear não é uma via de mão dupla).
   */
  private async assertNotBlockedInDm(channelId: string, userId: string): Promise<void> {
    const others = await this.prisma.dMParticipant.findMany({
      where: { channelId, userId: { not: userId } },
    });

    for (const other of others) {
      const wasBlockedByOther = await this.prisma.friendship.findFirst({
        where: {
          requesterId: other.userId,
          addresseeId: userId,
          status: FriendshipStatus.BLOCKED,
        },
      });
      if (wasBlockedByOther) {
        throw new ForbiddenException('Não é possível enviar mensagens para este usuário.');
      }
    }
  }

  private async broadcast(
    channel: { id: string; serverId: string | null },
    event: string,
    payload: unknown,
  ): Promise<void> {
    if (channel.serverId) {
      this.realtime.emitToServer(channel.serverId, event, payload);
      return;
    }
    const participants = await this.prisma.dMParticipant.findMany({ where: { channelId: channel.id } });
    for (const p of participants) {
      this.realtime.emitToUser(p.userId, event, payload);
    }
  }
}
