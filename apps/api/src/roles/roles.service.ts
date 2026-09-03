import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogAction } from '@prisma/client';
import { hasPermission } from '@relay/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(serverId: string, actorId: string, dto: CreateRoleDto) {
    const requestedPermissions = BigInt(dto.permissions);
    await this.assertActorCanGrant(serverId, actorId, requestedPermissions);

    const position = await this.prisma.role.count({ where: { serverId } });
    const role = await this.prisma.role.create({
      data: {
        serverId,
        name: dto.name,
        color: dto.color,
        permissions: requestedPermissions,
        position,
      },
    });

    await this.audit.record({
      serverId,
      actorId,
      action: AuditLogAction.ROLE_CREATE,
      targetId: role.id,
    });

    return this.serialize(role);
  }

  async update(serverId: string, roleId: string, actorId: string, dto: UpdateRoleDto) {
    const role = await this.getRoleInServer(serverId, roleId);
    await this.assertActorOutranks(serverId, actorId, role.position);

    if (dto.permissions !== undefined) {
      await this.assertActorCanGrant(serverId, actorId, BigInt(dto.permissions));
    }

    const updated = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: dto.name,
        color: dto.color,
        permissions: dto.permissions !== undefined ? BigInt(dto.permissions) : undefined,
      },
    });

    await this.audit.record({
      serverId,
      actorId,
      action: AuditLogAction.ROLE_UPDATE,
      targetId: roleId,
    });

    return this.serialize(updated);
  }

  async delete(serverId: string, roleId: string, actorId: string): Promise<void> {
    const role = await this.getRoleInServer(serverId, roleId);
    if (role.isEveryone) {
      throw new BadRequestException('O cargo @everyone não pode ser excluído.');
    }
    await this.assertActorOutranks(serverId, actorId, role.position);

    await this.prisma.role.delete({ where: { id: roleId } });
    await this.audit.record({
      serverId,
      actorId,
      action: AuditLogAction.ROLE_DELETE,
      targetId: roleId,
    });
  }

  async assignToMember(serverId: string, memberId: string, roleId: string, actorId: string) {
    const role = await this.getRoleInServer(serverId, roleId);
    await this.assertActorOutranks(serverId, actorId, role.position);
    await this.assertMemberInServer(serverId, memberId);

    await this.prisma.memberRole.upsert({
      where: { memberId_roleId: { memberId, roleId } },
      create: { memberId, roleId },
      update: {},
    });

    await this.audit.record({
      serverId,
      actorId,
      action: AuditLogAction.MEMBER_ROLE_UPDATE,
      targetId: memberId,
      metadata: { roleId, op: 'assign' },
    });
  }

  async removeFromMember(serverId: string, memberId: string, roleId: string, actorId: string) {
    const role = await this.getRoleInServer(serverId, roleId);
    if (role.isEveryone) {
      throw new BadRequestException('O cargo @everyone não pode ser removido de um membro.');
    }
    await this.assertActorOutranks(serverId, actorId, role.position);
    await this.assertMemberInServer(serverId, memberId);

    await this.prisma.memberRole.deleteMany({ where: { memberId, roleId } });

    await this.audit.record({
      serverId,
      actorId,
      action: AuditLogAction.MEMBER_ROLE_UPDATE,
      targetId: memberId,
      metadata: { roleId, op: 'remove' },
    });
  }

  private serialize(role: { permissions: bigint } & Record<string, unknown>) {
    return { ...role, permissions: role.permissions.toString() };
  }

  private async getRoleInServer(serverId: string, roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role || role.serverId !== serverId) {
      throw new NotFoundException('Cargo não encontrado neste servidor.');
    }
    return role;
  }

  private async assertMemberInServer(serverId: string, memberId: string): Promise<void> {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.serverId !== serverId) {
      throw new NotFoundException('Membro não encontrado neste servidor.');
    }
  }

  /** Dono sempre pode; do contrário, o ator só gerencia um cargo abaixo do seu mais alto. */
  private async assertActorOutranks(
    serverId: string,
    actorId: string,
    targetPosition: number,
  ): Promise<void> {
    const server = await this.prisma.server.findUniqueOrThrow({ where: { id: serverId } });
    if (server.ownerId === actorId) return;

    const topPosition = await this.getActorTopRolePosition(serverId, actorId);
    if (targetPosition >= topPosition) {
      throw new ForbiddenException(
        'Você só pode gerenciar cargos abaixo do seu cargo mais alto na hierarquia.',
      );
    }
  }

  /** Impede que alguém conceda a um cargo uma permissão que ela mesma não possui (escalonamento de privilégio). */
  private async assertActorCanGrant(
    serverId: string,
    actorId: string,
    requested: bigint,
  ): Promise<void> {
    const server = await this.prisma.server.findUniqueOrThrow({ where: { id: serverId } });
    if (server.ownerId === actorId) return;

    const member = await this.prisma.member.findUnique({
      where: { serverId_userId: { serverId, userId: actorId } },
      include: { roles: { include: { role: true } } },
    });
    const actorBitfield = (member?.roles ?? []).reduce((acc, mr) => acc | mr.role.permissions, 0n);

    if (!hasPermission(actorBitfield, requested)) {
      throw new ForbiddenException(
        'Você não pode conceder a um cargo permissões que você mesmo não possui.',
      );
    }
  }

  private async getActorTopRolePosition(serverId: string, actorId: string): Promise<number> {
    const member = await this.prisma.member.findUnique({
      where: { serverId_userId: { serverId, userId: actorId } },
      include: { roles: { include: { role: true } } },
    });
    if (!member || member.roles.length === 0) return -1;
    return Math.max(...member.roles.map((mr) => mr.role.position));
  }
}
