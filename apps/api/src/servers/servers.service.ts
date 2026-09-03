import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogAction, ChannelType, Prisma } from '@prisma/client';
import { ALL_PERMISSIONS, DEFAULT_EVERYONE_PERMISSIONS } from '@relay/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';

const SERVER_DETAIL_INCLUDE = {
  categories: { orderBy: { position: 'asc' as const } },
  channels: { orderBy: { position: 'asc' as const } },
  roles: { orderBy: { position: 'asc' as const } },
  members: {
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
      roles: { select: { roleId: true } },
    },
  },
};

@Injectable()
export class ServersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Cria o servidor com sua estrutura mínima viável: cargo @everyone, o dono
   * como membro já com esse cargo, uma categoria "Geral" e um canal de texto
   * "geral" — o mesmo bootstrap que qualquer novo servidor precisa para ser
   * usável no primeiro acesso.
   */
  async create(ownerId: string, dto: CreateServerDto) {
    return this.prisma.$transaction(async (tx) => {
      const server = await tx.server.create({
        data: { name: dto.name, description: dto.description, ownerId },
      });

      const everyoneRole = await tx.role.create({
        data: {
          serverId: server.id,
          name: '@everyone',
          permissions: DEFAULT_EVERYONE_PERMISSIONS,
          position: 0,
          isEveryone: true,
        },
      });

      const ownerRole = await tx.role.create({
        data: {
          serverId: server.id,
          name: 'Dono',
          permissions: ALL_PERMISSIONS,
          position: 1,
        },
      });

      const member = await tx.member.create({
        data: { serverId: server.id, userId: ownerId },
      });

      await tx.memberRole.createMany({
        data: [
          { memberId: member.id, roleId: everyoneRole.id },
          { memberId: member.id, roleId: ownerRole.id },
        ],
      });

      const category = await tx.category.create({
        data: { serverId: server.id, name: 'Geral', position: 0 },
      });

      await tx.channel.create({
        data: {
          serverId: server.id,
          categoryId: category.id,
          name: 'geral',
          type: ChannelType.TEXT,
          position: 0,
        },
      });

      return tx.server.findUniqueOrThrow({
        where: { id: server.id },
        include: SERVER_DETAIL_INCLUDE,
      });
    }).then(async (server) => {
      // O dono pode já estar com um socket conectado (aberto antes de criar o
      // servidor) — sem isso, ele só passaria a receber eventos do servidor
      // na próxima reconexão.
      await this.realtime.joinUserToServerRoom(ownerId, server.id);
      return server;
    });
  }

  async listForUser(userId: string) {
    return this.prisma.server.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDetail(serverId: string, userId: string) {
    await this.assertMember(serverId, userId);
    return this.prisma.server.findUniqueOrThrow({
      where: { id: serverId },
      include: SERVER_DETAIL_INCLUDE,
    });
  }

  async update(serverId: string, actorId: string, dto: UpdateServerDto) {
    const server = await this.prisma.server.update({
      where: { id: serverId },
      data: dto,
    });
    await this.audit.record({
      serverId,
      actorId,
      action: AuditLogAction.SERVER_UPDATE,
      metadata: dto as unknown as Prisma.InputJsonValue,
    });
    return server;
  }

  async deleteAsOwner(serverId: string, userId: string): Promise<void> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) {
      throw new NotFoundException('Servidor não encontrado.');
    }
    if (server.ownerId !== userId) {
      throw new ForbiddenException('Só o dono do servidor pode excluí-lo.');
    }
    await this.prisma.server.delete({ where: { id: serverId } });
  }

  private async assertMember(serverId: string, userId: string): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Você não é membro deste servidor.');
    }
  }
}
