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
exports.ServersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permissions_1 = require("@relay/permissions");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const presence_service_1 = require("../realtime/presence.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const SERVER_DETAIL_INCLUDE = {
    categories: { orderBy: { position: 'asc' } },
    channels: { orderBy: { position: 'asc' } },
    roles: { orderBy: { position: 'asc' } },
    members: {
        include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
            roles: { select: { roleId: true } },
        },
    },
};
let ServersService = class ServersService {
    prisma;
    audit;
    realtime;
    presence;
    constructor(prisma, audit, realtime, presence) {
        this.prisma = prisma;
        this.audit = audit;
        this.realtime = realtime;
        this.presence = presence;
    }
    async withLiveMemberStatus(server) {
        server.members = await Promise.all(server.members.map(async (member) => ({
            ...member,
            user: {
                ...member.user,
                status: await this.presence.effectiveStatus(member.user.id, member.user.status),
            },
        })));
        return server;
    }
    async create(ownerId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const server = await tx.server.create({
                data: { name: dto.name, description: dto.description, ownerId },
            });
            const everyoneRole = await tx.role.create({
                data: {
                    serverId: server.id,
                    name: '@everyone',
                    permissions: permissions_1.DEFAULT_EVERYONE_PERMISSIONS,
                    position: 0,
                    isEveryone: true,
                },
            });
            const ownerRole = await tx.role.create({
                data: {
                    serverId: server.id,
                    name: 'Dono',
                    permissions: permissions_1.ALL_PERMISSIONS,
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
                    type: client_1.ChannelType.TEXT,
                    position: 0,
                },
            });
            return tx.server.findUniqueOrThrow({
                where: { id: server.id },
                include: SERVER_DETAIL_INCLUDE,
            });
        }).then(async (server) => {
            await this.realtime.joinUserToServerRoom(ownerId, server.id);
            return this.withLiveMemberStatus(server);
        });
    }
    async listForUser(userId) {
        return this.prisma.server.findMany({
            where: { members: { some: { userId } } },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getDetail(serverId, userId) {
        await this.assertMember(serverId, userId);
        const server = await this.prisma.server.findUniqueOrThrow({
            where: { id: serverId },
            include: SERVER_DETAIL_INCLUDE,
        });
        return this.withLiveMemberStatus(server);
    }
    async update(serverId, actorId, dto) {
        const server = await this.prisma.server.update({
            where: { id: serverId },
            data: dto,
        });
        await this.audit.record({
            serverId,
            actorId,
            action: client_1.AuditLogAction.SERVER_UPDATE,
            metadata: dto,
        });
        return server;
    }
    async deleteAsOwner(serverId, userId) {
        const server = await this.prisma.server.findUnique({ where: { id: serverId } });
        if (!server) {
            throw new common_1.NotFoundException('Servidor não encontrado.');
        }
        if (server.ownerId !== userId) {
            throw new common_1.ForbiddenException('Só o dono do servidor pode excluí-lo.');
        }
        await this.prisma.server.delete({ where: { id: serverId } });
    }
    async assertMember(serverId, userId) {
        const member = await this.prisma.member.findUnique({
            where: { serverId_userId: { serverId, userId } },
        });
        if (!member) {
            throw new common_1.ForbiddenException('Você não é membro deste servidor.');
        }
    }
};
exports.ServersService = ServersService;
exports.ServersService = ServersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        realtime_gateway_1.RealtimeGateway,
        presence_service_1.PresenceService])
], ServersService);
//# sourceMappingURL=servers.service.js.map