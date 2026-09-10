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
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permissions_1 = require("@relay/permissions");
const shared_types_1 = require("@relay/shared-types");
const prisma_service_1 = require("../prisma/prisma.service");
const permissions_evaluator_service_1 = require("../common/services/permissions-evaluator.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const AUTHOR_SELECT = {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
};
let MessagesService = class MessagesService {
    prisma;
    evaluator;
    realtime;
    constructor(prisma, evaluator, realtime) {
        this.prisma = prisma;
        this.evaluator = evaluator;
        this.realtime = realtime;
    }
    async create(channelId, authorId, dto) {
        const channel = await this.getChannelOrThrow(channelId);
        await this.assertCanSend(channel, authorId);
        const hasText = !!dto.content?.trim();
        const hasAttachments = !!dto.attachments?.length;
        if (!hasText && !hasAttachments) {
            throw new common_1.BadRequestException('Mensagem precisa ter texto ou pelo menos um anexo.');
        }
        if (dto.replyToId) {
            const replyTo = await this.prisma.message.findUnique({ where: { id: dto.replyToId } });
            if (!replyTo || replyTo.channelId !== channelId) {
                throw new common_1.BadRequestException('Mensagem respondida não pertence a este canal.');
            }
        }
        const message = await this.prisma.message.create({
            data: {
                channelId,
                authorId,
                content: dto.content ?? '',
                replyToId: dto.replyToId,
                attachments: hasAttachments ? dto.attachments : undefined,
            },
            include: { author: AUTHOR_SELECT },
        });
        await this.broadcast(channel, shared_types_1.RealtimeEvent.MESSAGE_CREATE, message);
        return message;
    }
    async list(channelId, userId, query) {
        const channel = await this.getChannelOrThrow(channelId);
        await this.assertCanRead(channel, userId);
        const limit = query.limit ?? 50;
        return this.prisma.message.findMany({
            where: {
                channelId,
                deletedAt: null,
                ...(query.before ? { id: { lt: query.before } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { author: AUTHOR_SELECT },
        });
    }
    async search(channelId, userId, q) {
        const channel = await this.getChannelOrThrow(channelId);
        await this.assertCanRead(channel, userId);
        return this.prisma.message.findMany({
            where: { channelId, deletedAt: null, content: { contains: q, mode: 'insensitive' } },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { author: AUTHOR_SELECT },
        });
    }
    async update(messageId, userId, dto) {
        const message = await this.prisma.message.findUnique({ where: { id: messageId } });
        if (!message || message.deletedAt) {
            throw new common_1.NotFoundException('Mensagem não encontrada.');
        }
        if (message.authorId !== userId) {
            throw new common_1.ForbiddenException('Só o autor pode editar a mensagem.');
        }
        const updated = await this.prisma.message.update({
            where: { id: messageId },
            data: { content: dto.content, editedAt: new Date() },
            include: { author: AUTHOR_SELECT },
        });
        const channel = await this.getChannelOrThrow(message.channelId);
        await this.broadcast(channel, shared_types_1.RealtimeEvent.MESSAGE_UPDATE, updated);
        return updated;
    }
    async remove(messageId, userId) {
        const message = await this.prisma.message.findUnique({ where: { id: messageId } });
        if (!message || message.deletedAt) {
            throw new common_1.NotFoundException('Mensagem não encontrada.');
        }
        const channel = await this.getChannelOrThrow(message.channelId);
        if (message.authorId !== userId) {
            if (!channel.serverId) {
                throw new common_1.ForbiddenException('Só o autor pode apagar a mensagem em uma DM.');
            }
            const bitfield = await this.evaluator.computeBitfield(channel.serverId, userId, {
                channelId: channel.id,
                categoryId: channel.categoryId ?? undefined,
            });
            if (bitfield === null || !(0, permissions_1.hasPermission)(bitfield, permissions_1.Permission.MANAGE_MESSAGES)) {
                throw new common_1.ForbiddenException('Você não tem permissão para apagar esta mensagem.');
            }
        }
        await this.prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
        await this.broadcast(channel, shared_types_1.RealtimeEvent.MESSAGE_DELETE, { id: messageId, channelId: channel.id });
    }
    async getChannelOrThrow(channelId) {
        const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) {
            throw new common_1.NotFoundException('Canal não encontrado.');
        }
        return channel;
    }
    async assertCanSend(channel, userId) {
        if (channel.serverId) {
            const bitfield = await this.evaluator.computeBitfield(channel.serverId, userId, {
                channelId: channel.id,
                categoryId: channel.categoryId ?? undefined,
            });
            if (bitfield === null || !(0, permissions_1.hasPermission)(bitfield, permissions_1.Permission.SEND_MESSAGES)) {
                throw new common_1.ForbiddenException('Você não tem permissão para enviar mensagens neste canal.');
            }
            return;
        }
        await this.assertDmParticipant(channel.id, userId);
        await this.assertNotBlockedInDm(channel.id, userId);
    }
    async assertCanRead(channel, userId) {
        if (channel.serverId) {
            const bitfield = await this.evaluator.computeBitfield(channel.serverId, userId, {
                channelId: channel.id,
                categoryId: channel.categoryId ?? undefined,
            });
            if (bitfield === null || !(0, permissions_1.hasPermission)(bitfield, permissions_1.Permission.READ_MESSAGE_HISTORY)) {
                throw new common_1.ForbiddenException('Você não tem permissão para ver o histórico deste canal.');
            }
            return;
        }
        await this.assertDmParticipant(channel.id, userId);
    }
    async assertDmParticipant(channelId, userId) {
        const participant = await this.prisma.dMParticipant.findUnique({
            where: { channelId_userId: { channelId, userId } },
        });
        if (!participant) {
            throw new common_1.ForbiddenException('Você não participa desta conversa.');
        }
    }
    async assertNotBlockedInDm(channelId, userId) {
        const others = await this.prisma.dMParticipant.findMany({
            where: { channelId, userId: { not: userId } },
        });
        for (const other of others) {
            const wasBlockedByOther = await this.prisma.friendship.findFirst({
                where: {
                    requesterId: other.userId,
                    addresseeId: userId,
                    status: client_1.FriendshipStatus.BLOCKED,
                },
            });
            if (wasBlockedByOther) {
                throw new common_1.ForbiddenException('Não é possível enviar mensagens para este usuário.');
            }
        }
    }
    async broadcast(channel, event, payload) {
        if (channel.serverId) {
            this.realtime.emitToServer(channel.serverId, event, payload);
            return;
        }
        const participants = await this.prisma.dMParticipant.findMany({ where: { channelId: channel.id } });
        for (const p of participants) {
            this.realtime.emitToUser(p.userId, event, payload);
        }
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permissions_evaluator_service_1.PermissionsEvaluatorService,
        realtime_gateway_1.RealtimeGateway])
], MessagesService);
//# sourceMappingURL=messages.service.js.map