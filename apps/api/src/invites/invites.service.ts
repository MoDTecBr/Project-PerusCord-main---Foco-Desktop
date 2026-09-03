import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogAction } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { RealtimeEvent } from '@relay/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateInviteDto } from './dto/create-invite.dto';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(serverId: string, actorId: string, dto: CreateInviteDto) {
    const invite = await this.prisma.invite.create({
      data: {
        serverId,
        createdById: actorId,
        code: nanoid(),
        maxUses: dto.maxUses,
        expiresAt: dto.expiresInSeconds
          ? new Date(Date.now() + dto.expiresInSeconds * 1000)
          : null,
      },
    });

    await this.audit.record({
      serverId,
      actorId,
      action: AuditLogAction.INVITE_CREATE,
      targetId: invite.id,
    });

    return invite;
  }

  async listForServer(serverId: string) {
    return this.prisma.invite.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, username: true } } },
    });
  }

  async delete(serverId: string, inviteId: string, actorId: string): Promise<void> {
    const invite = await this.prisma.invite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.serverId !== serverId) {
      throw new NotFoundException('Convite não encontrado neste servidor.');
    }
    await this.prisma.invite.delete({ where: { id: inviteId } });
    await this.audit.record({
      serverId,
      actorId,
      action: AuditLogAction.INVITE_DELETE,
      targetId: inviteId,
    });
  }

  /** Resgata um convite: adiciona o usuário ao servidor com o cargo @everyone. */
  async joinByCode(code: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { code } });
    if (!invite) {
      throw new NotFoundException('Convite inválido ou expirado.');
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ForbiddenException('Este convite expirou.');
    }
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw new ForbiddenException('Este convite atingiu o limite de usos.');
    }

    const existingMember = await this.prisma.member.findUnique({
      where: { serverId_userId: { serverId: invite.serverId, userId } },
    });
    if (existingMember) {
      throw new ConflictException('Você já é membro deste servidor.');
    }

    const everyoneRole = await this.prisma.role.findFirstOrThrow({
      where: { serverId: invite.serverId, isEveryone: true },
    });

    const server = await this.prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: { serverId: invite.serverId, userId },
      });
      await tx.memberRole.create({ data: { memberId: member.id, roleId: everyoneRole.id } });
      await tx.invite.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } });
      return tx.server.findUniqueOrThrow({ where: { id: invite.serverId } });
    });

    await this.realtime.joinUserToServerRoom(userId, invite.serverId);
    this.realtime.emitToServer(invite.serverId, RealtimeEvent.MEMBER_JOIN, { serverId: invite.serverId, userId });

    return server;
  }
}
