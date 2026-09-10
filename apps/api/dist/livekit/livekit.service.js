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
var LivekitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LivekitService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const livekit_server_sdk_1 = require("livekit-server-sdk");
const client_1 = require("@prisma/client");
const permissions_1 = require("@relay/permissions");
const prisma_service_1 = require("../prisma/prisma.service");
const permissions_evaluator_service_1 = require("../common/services/permissions-evaluator.service");
let LivekitService = LivekitService_1 = class LivekitService {
    prisma;
    evaluator;
    logger = new common_1.Logger(LivekitService_1.name);
    livekitConfig;
    roomService;
    constructor(prisma, evaluator, config) {
        this.prisma = prisma;
        this.evaluator = evaluator;
        this.livekitConfig = config.get('livekit', { infer: true });
        const httpUrl = this.livekitConfig.url.replace(/^ws/, 'http');
        this.roomService = new livekit_server_sdk_1.RoomServiceClient(httpUrl, this.livekitConfig.apiKey, this.livekitConfig.apiSecret);
    }
    async mintVoiceToken(channelId, userId) {
        const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) {
            throw new common_1.NotFoundException('Canal não encontrado.');
        }
        if (channel.type !== client_1.ChannelType.VOICE && channel.type !== client_1.ChannelType.VIDEO) {
            throw new common_1.BadRequestException('Este canal não é de voz nem de vídeo.');
        }
        if (!channel.serverId) {
            throw new common_1.BadRequestException('Chamada em DM ainda não é suportada.');
        }
        const bitfield = await this.evaluator.computeBitfield(channel.serverId, userId, {
            channelId: channel.id,
            categoryId: channel.categoryId ?? undefined,
        });
        if (bitfield === null || !(0, permissions_1.hasPermission)(bitfield, permissions_1.Permission.CONNECT)) {
            throw new common_1.ForbiddenException('Você não tem permissão para entrar neste canal.');
        }
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const at = new livekit_server_sdk_1.AccessToken(this.livekitConfig.apiKey, this.livekitConfig.apiSecret, {
            identity: userId,
            name: user.displayName,
            ttl: '4h',
        });
        at.addGrant({
            roomJoin: true,
            room: channel.id,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });
        return { token: await at.toJwt(), url: this.livekitConfig.url, roomName: channel.id };
    }
    async getVoicePresence(serverId, userId) {
        const member = await this.prisma.member.findUnique({
            where: { serverId_userId: { serverId, userId } },
        });
        if (!member) {
            throw new common_1.ForbiddenException('Você não é membro deste servidor.');
        }
        const channels = await this.prisma.channel.findMany({
            where: { serverId, type: { in: [client_1.ChannelType.VOICE, client_1.ChannelType.VIDEO] } },
        });
        const rawEntries = await Promise.all(channels.map(async (channel) => {
            try {
                const participants = await this.roomService.listParticipants(channel.id);
                return [channel.id, participants];
            }
            catch (error) {
                this.logger.debug(`Sem sala ativa para o canal ${channel.id}: ${error}`);
                return [channel.id, []];
            }
        }));
        const allIdentities = Array.from(new Set(rawEntries.flatMap(([, participants]) => participants.map((p) => p.identity))));
        const users = allIdentities.length
            ? await this.prisma.user.findMany({
                where: { id: { in: allIdentities } },
                select: { id: true, avatarUrl: true },
            })
            : [];
        const avatarByUserId = new Map(users.map((u) => [u.id, u.avatarUrl]));
        const entries = rawEntries.map(([channelId, participants]) => [
            channelId,
            participants.map((p) => ({
                identity: p.identity,
                name: p.name,
                avatarUrl: avatarByUserId.get(p.identity) ?? null,
                isSharingScreen: p.tracks.some((t) => t.source === livekit_server_sdk_1.TrackSource.SCREEN_SHARE && !t.muted),
                isMuted: !p.tracks.some((t) => t.source === livekit_server_sdk_1.TrackSource.MICROPHONE && !t.muted),
                joinedAtMs: Number(p.joinedAtMs),
            })),
        ]);
        return Object.fromEntries(entries);
    }
};
exports.LivekitService = LivekitService;
exports.LivekitService = LivekitService = LivekitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permissions_evaluator_service_1.PermissionsEvaluatorService,
        config_1.ConfigService])
], LivekitService);
//# sourceMappingURL=livekit.service.js.map