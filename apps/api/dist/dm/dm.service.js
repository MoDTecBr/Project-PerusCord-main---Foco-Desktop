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
exports.DmService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const presence_service_1 = require("../realtime/presence.service");
const PARTICIPANT_SELECT = {
    select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
};
let DmService = class DmService {
    prisma;
    presence;
    constructor(prisma, presence) {
        this.prisma = prisma;
        this.presence = presence;
    }
    async getOrCreateWithFriend(userId, username) {
        const target = await this.prisma.user.findUnique({ where: { username } });
        if (!target) {
            throw new common_1.NotFoundException('Usuário não encontrado.');
        }
        if (target.id === userId) {
            throw new common_1.BadRequestException('Você não pode abrir uma DM consigo mesmo.');
        }
        const friendship = await this.prisma.friendship.findFirst({
            where: {
                status: client_1.FriendshipStatus.ACCEPTED,
                OR: [
                    { requesterId: userId, addresseeId: target.id },
                    { requesterId: target.id, addresseeId: userId },
                ],
            },
        });
        if (!friendship) {
            throw new common_1.ForbiddenException('Só é possível abrir uma DM com um amigo.');
        }
        const existing = await this.prisma.channel.findFirst({
            where: {
                type: client_1.ChannelType.DM,
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
                data: { type: client_1.ChannelType.DM, name: 'dm', serverId: null },
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
    async listForUser(userId) {
        const channels = await this.prisma.channel.findMany({
            where: { type: client_1.ChannelType.DM, dmParticipants: { some: { userId } } },
            include: {
                dmParticipants: { where: { userId: { not: userId } }, include: { user: PARTICIPANT_SELECT } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return Promise.all(channels.map(async (c) => {
            const participant = c.dmParticipants[0]?.user ?? null;
            return {
                id: c.id,
                createdAt: c.createdAt,
                participant: participant && {
                    ...participant,
                    status: await this.presence.effectiveStatus(participant.id, participant.status),
                },
            };
        }));
    }
};
exports.DmService = DmService;
exports.DmService = DmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        presence_service_1.PresenceService])
], DmService);
//# sourceMappingURL=dm.service.js.map