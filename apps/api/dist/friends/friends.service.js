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
exports.FriendsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const shared_types_1 = require("@relay/shared-types");
const prisma_service_1 = require("../prisma/prisma.service");
const presence_service_1 = require("../realtime/presence.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const PUBLIC_SELECT = {
    select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
};
let FriendsService = class FriendsService {
    prisma;
    realtime;
    presence;
    constructor(prisma, realtime, presence) {
        this.prisma = prisma;
        this.realtime = realtime;
        this.presence = presence;
    }
    async sendRequest(requesterId, dto) {
        const target = await this.prisma.user.findUnique({ where: { username: dto.username } });
        if (!target) {
            throw new common_1.NotFoundException('Usuário não encontrado.');
        }
        if (target.id === requesterId) {
            throw new common_1.BadRequestException('Você não pode adicionar a si mesmo como amigo.');
        }
        const existing = await this.findRelationship(requesterId, target.id);
        if (existing) {
            if (existing.status === client_1.FriendshipStatus.BLOCKED) {
                throw new common_1.ForbiddenException('Não é possível enviar uma solicitação para este usuário.');
            }
            if (existing.status === client_1.FriendshipStatus.ACCEPTED) {
                throw new common_1.ConflictException('Vocês já são amigos.');
            }
            if (existing.status === client_1.FriendshipStatus.PENDING) {
                throw new common_1.ConflictException('Já existe uma solicitação pendente entre vocês.');
            }
            const reopened = await this.prisma.friendship.update({
                where: { id: existing.id },
                data: { status: client_1.FriendshipStatus.PENDING, requesterId, addresseeId: target.id },
            });
            this.realtime.emitToUser(target.id, shared_types_1.RealtimeEvent.FRIEND_REQUEST_CREATE, reopened);
            return reopened;
        }
        const created = await this.prisma.friendship.create({
            data: { requesterId, addresseeId: target.id },
        });
        this.realtime.emitToUser(target.id, shared_types_1.RealtimeEvent.FRIEND_REQUEST_CREATE, created);
        return created;
    }
    async respond(userId, friendshipId, accept) {
        const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
        if (!friendship || friendship.addresseeId !== userId) {
            throw new common_1.NotFoundException('Solicitação não encontrada.');
        }
        if (friendship.status !== client_1.FriendshipStatus.PENDING) {
            throw new common_1.BadRequestException('Esta solicitação já foi respondida.');
        }
        const updated = await this.prisma.friendship.update({
            where: { id: friendshipId },
            data: { status: accept ? client_1.FriendshipStatus.ACCEPTED : client_1.FriendshipStatus.DECLINED },
        });
        this.realtime.emitToUser(friendship.requesterId, shared_types_1.RealtimeEvent.FRIEND_REQUEST_UPDATE, updated);
        return updated;
    }
    async remove(userId, friendshipId) {
        const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
        if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
            throw new common_1.NotFoundException('Amizade ou solicitação não encontrada.');
        }
        await this.prisma.friendship.delete({ where: { id: friendshipId } });
        const otherId = friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId;
        this.realtime.emitToUser(otherId, shared_types_1.RealtimeEvent.FRIEND_REQUEST_UPDATE, {
            id: friendshipId,
            status: 'REMOVED',
        });
    }
    async block(userId, username) {
        const target = await this.prisma.user.findUnique({ where: { username } });
        if (!target) {
            throw new common_1.NotFoundException('Usuário não encontrado.');
        }
        if (target.id === userId) {
            throw new common_1.BadRequestException('Você não pode bloquear a si mesmo.');
        }
        const existing = await this.findRelationship(userId, target.id);
        if (existing) {
            return this.prisma.friendship.update({
                where: { id: existing.id },
                data: { status: client_1.FriendshipStatus.BLOCKED, requesterId: userId, addresseeId: target.id },
            });
        }
        return this.prisma.friendship.create({
            data: { requesterId: userId, addresseeId: target.id, status: client_1.FriendshipStatus.BLOCKED },
        });
    }
    async listFriends(userId) {
        const rows = await this.prisma.friendship.findMany({
            where: {
                status: client_1.FriendshipStatus.ACCEPTED,
                OR: [{ requesterId: userId }, { addresseeId: userId }],
            },
            include: { requester: PUBLIC_SELECT, addressee: PUBLIC_SELECT },
        });
        const friends = rows.map((r) => (r.requesterId === userId ? r.addressee : r.requester));
        return Promise.all(friends.map(async (friend) => ({
            ...friend,
            status: await this.presence.effectiveStatus(friend.id, friend.status),
        })));
    }
    async listPending(userId) {
        const [incoming, outgoing] = await Promise.all([
            this.prisma.friendship.findMany({
                where: { addresseeId: userId, status: client_1.FriendshipStatus.PENDING },
                include: { requester: PUBLIC_SELECT },
            }),
            this.prisma.friendship.findMany({
                where: { requesterId: userId, status: client_1.FriendshipStatus.PENDING },
                include: { addressee: PUBLIC_SELECT },
            }),
        ]);
        return { incoming, outgoing };
    }
    async findRelationship(userAId, userBId) {
        return this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: userAId, addresseeId: userBId },
                    { requesterId: userBId, addresseeId: userAId },
                ],
            },
        });
    }
};
exports.FriendsService = FriendsService;
exports.FriendsService = FriendsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        realtime_gateway_1.RealtimeGateway,
        presence_service_1.PresenceService])
], FriendsService);
//# sourceMappingURL=friends.service.js.map