import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChannelType, FriendshipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PARTICIPANT_SELECT = {
  select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
} as const;

@Injectable()
export class DmService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retorna o canal de DM com este amigo, criando-o na primeira vez. */
  async getOrCreateWithFriend(userId: string, username: string) {
    const target = await this.prisma.user.findUnique({ where: { username } });
    if (!target) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (target.id === userId) {
      throw new BadRequestException('Você não pode abrir uma DM consigo mesmo.');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: userId, addresseeId: target.id },
          { requesterId: target.id, addresseeId: userId },
        ],
      },
    });
    if (!friendship) {
      throw new ForbiddenException('Só é possível abrir uma DM com um amigo.');
    }

    const existing = await this.prisma.channel.findFirst({
      where: {
        type: ChannelType.DM,
        AND: [
          { dmParticipants: { some: { userId } } },
          { dmParticipants: { some: { userId: target.id } } },
        ],
      },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const channel = await tx.channel.create({
        data: { type: ChannelType.DM, name: 'dm', serverId: null },
      });
      await tx.dMParticipant.createMany({
        data: [
          { channelId: channel.id, userId },
          { channelId: channel.id, userId: target.id },
        ],
      });
      return channel;
    });
  }

  async listForUser(userId: string) {
    const channels = await this.prisma.channel.findMany({
      where: { type: ChannelType.DM, dmParticipants: { some: { userId } } },
      include: {
        dmParticipants: { where: { userId: { not: userId } }, include: { user: PARTICIPANT_SELECT } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return channels.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      participant: c.dmParticipants[0]?.user ?? null,
    }));
  }
}
