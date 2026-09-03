import { Injectable } from '@nestjs/common';
import { ALL_PERMISSIONS, applyOverwrite } from '@relay/permissions';
import { PrismaService } from '../../prisma/prisma.service';

interface ChannelScope {
  channelId?: string;
  categoryId?: string;
}

/**
 * Calcula o bitfield efetivo de um membro num servidor, aplicando overwrites
 * de categoria e depois de canal (canal sempre vence em caso de conflito).
 * Usado tanto pelo `PermissionsGuard` (rotas REST) quanto por serviços que já
 * têm o registro do canal em mãos (ex: `MessagesService`) e não precisam
 * repetir essa lógica de resolução de escopo/overwrite.
 */
@Injectable()
export class PermissionsEvaluatorService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retorna `null` se o usuário não é membro do servidor (sem nenhum acesso). */
  async computeBitfield(
    serverId: string,
    userId: string,
    scope: ChannelScope = {},
  ): Promise<bigint | null> {
    const server = await this.prisma.server.findUniqueOrThrow({ where: { id: serverId } });
    if (server.ownerId === userId) {
      return ALL_PERMISSIONS;
    }

    const member = await this.prisma.member.findUnique({
      where: { serverId_userId: { serverId, userId } },
      include: { roles: { include: { role: true } } },
    });
    if (!member) return null;

    let bitfield = member.roles.reduce((acc, mr) => acc | mr.role.permissions, 0n);
    if (!scope.channelId && !scope.categoryId) {
      return bitfield;
    }

    const overwrites = await this.prisma.permissionOverwrite.findMany({
      where: {
        OR: [
          scope.categoryId ? { categoryId: scope.categoryId } : undefined,
          scope.channelId ? { channelId: scope.channelId } : undefined,
        ].filter((clause): clause is { categoryId: string } | { channelId: string } => !!clause),
      },
    });

    const roleIds = new Set(member.roles.map((mr) => mr.roleId));
    const applies = (ow: { roleId: string | null; memberId: string | null }) =>
      (ow.roleId && roleIds.has(ow.roleId)) || ow.memberId === member.id;

    // Categoria primeiro, canal depois — overwrite de canal tem a palavra final.
    for (const ow of overwrites.filter((o) => o.categoryId)) {
      if (applies(ow)) bitfield = applyOverwrite(bitfield, ow.allow, ow.deny);
    }
    for (const ow of overwrites.filter((o) => o.channelId)) {
      if (applies(ow)) bitfield = applyOverwrite(bitfield, ow.allow, ow.deny);
    }

    return bitfield;
  }
}
