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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RealtimeGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const shared_types_1 = require("@relay/shared-types");
const prisma_service_1 = require("../prisma/prisma.service");
const presence_service_1 = require("./presence.service");
let RealtimeGateway = RealtimeGateway_1 = class RealtimeGateway {
    jwt;
    config;
    prisma;
    presence;
    server;
    logger = new common_1.Logger(RealtimeGateway_1.name);
    constructor(jwt, config, prisma, presence) {
        this.jwt = jwt;
        this.config = config;
        this.prisma = prisma;
        this.presence = presence;
    }
    async handleConnection(client) {
        try {
            const userId = await this.authenticate(client);
            client.data.userId = userId;
            await client.join(`user:${userId}`);
            const memberships = await this.prisma.member.findMany({
                where: { userId },
                select: { serverId: true },
            });
            await Promise.all(memberships.map((m) => client.join(`server:${m.serverId}`)));
            const becameOnline = await this.presence.addSocket(userId, client.id);
            if (becameOnline) {
                await this.broadcastPresence(userId);
            }
        }
        catch (error) {
            this.logger.warn(`Conexão recusada: ${error instanceof Error ? error.message : error}`);
            client.disconnect(true);
        }
    }
    async handleDisconnect(client) {
        const userId = client.data?.userId;
        if (!userId)
            return;
        const becameOffline = await this.presence.removeSocket(userId, client.id);
        if (becameOffline) {
            await this.broadcastPresence(userId);
        }
    }
    async handlePresenceSet(client, body) {
        const allowed = [
            client_1.PresenceStatus.ONLINE,
            client_1.PresenceStatus.IDLE,
            client_1.PresenceStatus.DO_NOT_DISTURB,
        ];
        if (!allowed.includes(body.status))
            return;
        await this.prisma.user.update({
            where: { id: client.data.userId },
            data: { status: body.status },
        });
        await this.broadcastPresence(client.data.userId);
    }
    async handleTypingStart(client, body) {
        await this.relayTyping(client, body.channelId, shared_types_1.RealtimeEvent.TYPING_START);
    }
    async handleTypingStop(client, body) {
        await this.relayTyping(client, body.channelId, shared_types_1.RealtimeEvent.TYPING_STOP);
    }
    emitToServer(serverId, event, payload) {
        this.server.to(`server:${serverId}`).emit(event, payload);
    }
    emitToUser(userId, event, payload) {
        this.server.to(`user:${userId}`).emit(event, payload);
    }
    async joinUserToServerRoom(userId, serverId) {
        const sockets = await this.server.in(`user:${userId}`).fetchSockets();
        await Promise.all(sockets.map((s) => s.join(`server:${serverId}`)));
    }
    async relayTyping(client, channelId, event) {
        const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel)
            return;
        const payload = { channelId, userId: client.data.userId };
        if (channel.serverId) {
            client.to(`server:${channel.serverId}`).emit(event, payload);
        }
        else {
            const participants = await this.prisma.dMParticipant.findMany({
                where: { channelId, userId: { not: client.data.userId } },
            });
            for (const p of participants) {
                client.to(`user:${p.userId}`).emit(event, payload);
            }
        }
    }
    async broadcastPresence(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { status: true },
        });
        if (!user)
            return;
        const status = await this.presence.effectiveStatus(userId, user.status);
        const payload = { userId, status };
        const [memberships, friendships] = await Promise.all([
            this.prisma.member.findMany({ where: { userId }, select: { serverId: true } }),
            this.prisma.friendship.findMany({
                where: {
                    status: client_1.FriendshipStatus.ACCEPTED,
                    OR: [{ requesterId: userId }, { addresseeId: userId }],
                },
            }),
        ]);
        for (const m of memberships) {
            this.emitToServer(m.serverId, shared_types_1.RealtimeEvent.PRESENCE_UPDATE, payload);
        }
        for (const f of friendships) {
            const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId;
            this.emitToUser(friendId, shared_types_1.RealtimeEvent.PRESENCE_UPDATE, payload);
        }
    }
    async authenticate(client) {
        const token = client.handshake.auth?.token ??
            client.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            throw new common_1.UnauthorizedException('Token de acesso ausente no handshake.');
        }
        const payload = await this.jwt.verifyAsync(token, {
            secret: this.config.get('jwt', { infer: true }).accessSecret,
        });
        return payload.sub;
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)(shared_types_1.RealtimeEvent.PRESENCE_SET),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "handlePresenceSet", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(shared_types_1.RealtimeEvent.TYPING_START),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "handleTypingStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(shared_types_1.RealtimeEvent.TYPING_STOP),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "handleTypingStop", null);
exports.RealtimeGateway = RealtimeGateway = RealtimeGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: '*' } }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_1.PrismaService,
        presence_service_1.PresenceService])
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map