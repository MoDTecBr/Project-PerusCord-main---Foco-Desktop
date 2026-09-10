"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permissions_1 = require("@relay/permissions");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let RolesService = class RolesService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(serverId, actorId, dto) {
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
            action: client_1.AuditLogAction.ROLE_CREATE,
            targetId: role.id,
        });
        return this.serialize(role);
    }
    async update(serverId, roleId, actorId, dto) {
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
            action: client_1.AuditLogAction.ROLE_UPDATE,
            targetId: roleId,
        });
        return this.serialize(updated);
    }
    async delete(serverId, roleId, actorId) {
        const role = await this.getRoleInServer(serverId, roleId);
        if (role.isEveryone) {
            throw new common_1.BadRequestException('O cargo @everyone não pode ser excluído.');
        }
        await this.assertActorOutranks(serverId, actorId, role.position);
        await this.prisma.role.delete({ where: { id: roleId } });
        await this.audit.record({
            serverId,
            actorId,
            action: client_1.AuditLogAction.ROLE_DELETE,
            targetId: roleId,
        });
    }
    async assignToMember(serverId, memberId, roleId, actorId) {
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
            action: client_1.AuditLogAction.MEMBER_ROLE_UPDATE,
            targetId: memberId,
            metadata: { roleId, op: 'assign' },
        });
    }
    async removeFromMember(serverId, memberId, roleId, actorId) {
        const role = await this.getRoleInServer(serverId, roleId);
        if (role.isEveryone) {
            throw new common_1.BadRequestException('O cargo @everyone não pode ser removido de um membro.');
        }
        await this.assertActorOutranks(serverId, actorId, role.position);
        await this.assertMemberInServer(serverId, memberId);
        await this.prisma.memberRole.deleteMany({ where: { memberId, roleId } });
        await this.audit.record({
            serverId,
            actorId,
            action: client_1.AuditLogAction.MEMBER_ROLE_UPDATE,
            targetId: memberId,
            metadata: { roleId, op: 'remove' },
        });
    }
    serialize(role) {
        return { ...role, permissions: role.permissions.toString() };
    }
    async getRoleInServer(serverId, roleId) {
        const role = await this.prisma.role.findUnique({ where: { id: roleId } });
        if (!role || role.serverId !== serverId) {
            throw new common_1.NotFoundException('Cargo não encontrado neste servidor.');
        }
        return role;
    }
    async assertMemberInServer(serverId, memberId) {
        const member = await this.prisma.member.findUnique({ where: { id: memberId } });
        if (!member || member.serverId !== serverId) {
            throw new common_1.NotFoundException('Membro não encontrado neste servidor.');
        }
    }
    async assertActorOutranks(serverId, actorId, targetPosition) {
        const server = await this.prisma.server.findUniqueOrThrow({ where: { id: serverId } });
        if (server.ownerId === actorId)
            return;
        const topPosition = await this.getActorTopRolePosition(serverId, actorId);
        if (targetPosition >= topPosition) {
            throw new common_1.ForbiddenException('Você só pode gerenciar cargos abaixo do seu cargo mais alto na hierarquia.');
        }
    }
    async assertActorCanGrant(serverId, actorId, requested) {
        const server = await this.prisma.server.findUniqueOrThrow({ where: { id: serverId } });
        if (server.ownerId === actorId)
            return;
        const member = await this.prisma.member.findUnique({
            where: { serverId_userId: { serverId, userId: actorId } },
            include: { roles: { include: { role: true } } },
        });
        const actorBitfield = (member?.roles ?? []).reduce((acc, mr) => acc | mr.role.permissions, 0n);
        if (!(0, permissions_1.hasPermission)(actorBitfield, requested)) {
            throw new common_1.ForbiddenException('Você não pode conceder a um cargo permissões que você mesmo não possui.');
        }
    }
    async getActorTopRolePosition(serverId, actorId) {
        const member = await this.prisma.member.findUnique({
            where: { serverId_userId: { serverId, userId: actorId } },
            include: { roles: { include: { role: true } } },
        });
        if (!member || member.roles.length === 0)
            return -1;
        return Math.max(...member.roles.map((mr) => mr.role.position));
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], RolesService);
//# sourceMappingURL=roles.service.js.map