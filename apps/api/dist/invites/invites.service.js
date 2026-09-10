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
exports.InvitesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const nanoid_1 = require("nanoid");
const shared_types_1 = require("@relay/shared-types");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const nanoid = (0, nanoid_1.customAlphabet)('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
let InvitesService = class InvitesService {
    prisma;
    audit;
    realtime;
    constructor(prisma, audit, realtime) {
        this.prisma = prisma;
        this.audit = audit;
        this.realtime = realtime;
    }
    async create(serverId, actorId, dto) {
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
            action: client_1.AuditLogAction.INVITE_CREATE,
            targetId: invite.id,
        });
        return invite;
    }
    async listForServer(serverId) {
        return this.prisma.invite.findMany({
            where: { serverId },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { id: true, username: true } } },
        });
    }
    async delete(serverId, inviteId, actorId) {
        const invite = await this.prisma.invite.findUnique({ where: { id: inviteId } });
        if (!invite || invite.serverId !== serverId) {
            throw new common_1.NotFoundException('Convite não encontrado neste servidor.');
        }
        await this.prisma.invite.delete({ where: { id: inviteId } });
        await this.audit.record({
            serverId,
            actorId,
            action: client_1.AuditLogAction.INVITE_DELETE,
            targetId: inviteId,
        });
    }
    async joinByCode(code, userId) {
        const invite = await this.prisma.invite.findUnique({ where: { code } });
        if (!invite) {
            throw new common_1.NotFoundException('Convite inválido ou expirado.');
        }
        if (invite.expiresAt && invite.expiresAt < new Date()) {
            throw new common_1.ForbiddenException('Este convite expirou.');
        }
        if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
            throw new common_1.ForbiddenException('Este convite atingiu o limite de usos.');
        }
        const existingMember = await this.prisma.member.findUnique({
            where: { serverId_userId: { serverId: invite.serverId, userId } },
        });
        if (existingMember) {
            throw new common_1.ConflictException('Você já é membro deste servidor.');
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
        this.realtime.emitToServer(invite.serverId, shared_types_1.RealtimeEvent.MEMBER_JOIN, { serverId: invite.serverId, userId });
        return server;
    }
};
exports.InvitesService = InvitesService;
exports.InvitesService = InvitesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        realtime_gateway_1.RealtimeGateway])
], InvitesService);
//# sourceMappingURL=invites.service.js.map