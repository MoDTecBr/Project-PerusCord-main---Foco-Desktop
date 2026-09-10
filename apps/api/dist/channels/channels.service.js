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
exports.ChannelsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const shared_types_1 = require("@relay/shared-types");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
let ChannelsService = class ChannelsService {
    prisma;
    audit;
    realtime;
    constructor(prisma, audit, realtime) {
        this.prisma = prisma;
        this.audit = audit;
        this.realtime = realtime;
    }
    async createCategory(serverId, actorId, dto) {
        const position = await this.prisma.category.count({ where: { serverId } });
        const category = await this.prisma.category.create({
            data: { serverId, name: dto.name, position },
        });
        await this.audit.record({
            serverId,
            actorId,
            action: client_1.AuditLogAction.CATEGORY_CREATE,
            targetId: category.id,
        });
        this.realtime.emitToServer(serverId, shared_types_1.RealtimeEvent.CATEGORY_CREATE, category);
        return category;
    }
    async deleteCategory(categoryId, actorId) {
        const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) {
            throw new common_1.NotFoundException('Categoria não encontrada.');
        }
        await this.prisma.category.delete({ where: { id: categoryId } });
        await this.audit.record({
            serverId: category.serverId,
            actorId,
            action: client_1.AuditLogAction.CATEGORY_DELETE,
            targetId: categoryId,
        });
        this.realtime.emitToServer(category.serverId, shared_types_1.RealtimeEvent.CATEGORY_DELETE, {
            id: categoryId,
            serverId: category.serverId,
        });
    }
    async createChannel(serverId, actorId, dto) {
        if (dto.categoryId) {
            const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
            if (!category || category.serverId !== serverId) {
                throw new common_1.BadRequestException('Categoria não pertence a este servidor.');
            }
        }
        const position = await this.prisma.channel.count({
            where: { serverId, categoryId: dto.categoryId ?? null },
        });
        const channel = await this.prisma.channel.create({
            data: {
                serverId,
                categoryId: dto.categoryId,
                name: dto.name,
                type: dto.type,
                topic: dto.topic,
                position,
            },
        });
        await this.audit.record({
            serverId,
            actorId,
            action: client_1.AuditLogAction.CHANNEL_CREATE,
            targetId: channel.id,
            metadata: { type: dto.type },
        });
        this.realtime.emitToServer(serverId, shared_types_1.RealtimeEvent.CHANNEL_CREATE, channel);
        return channel;
    }
    async updateChannel(channelId, actorId, dto) {
        const existing = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!existing || !existing.serverId) {
            throw new common_1.NotFoundException('Canal não encontrado.');
        }
        if (dto.categoryId) {
            const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
            if (!category || category.serverId !== existing.serverId) {
                throw new common_1.BadRequestException('Categoria não pertence a este servidor.');
            }
        }
        const channel = await this.prisma.channel.update({ where: { id: channelId }, data: dto });
        await this.audit.record({
            serverId: existing.serverId,
            actorId,
            action: client_1.AuditLogAction.CHANNEL_UPDATE,
            targetId: channelId,
            metadata: dto,
        });
        this.realtime.emitToServer(existing.serverId, shared_types_1.RealtimeEvent.CHANNEL_UPDATE, channel);
        return channel;
    }
    async deleteChannel(channelId, actorId) {
        const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel || !channel.serverId) {
            throw new common_1.NotFoundException('Canal não encontrado.');
        }
        await this.prisma.channel.delete({ where: { id: channelId } });
        await this.audit.record({
            serverId: channel.serverId,
            actorId,
            action: client_1.AuditLogAction.CHANNEL_DELETE,
            targetId: channelId,
        });
        this.realtime.emitToServer(channel.serverId, shared_types_1.RealtimeEvent.CHANNEL_DELETE, {
            id: channelId,
            serverId: channel.serverId,
        });
    }
};
exports.ChannelsService = ChannelsService;
exports.ChannelsService = ChannelsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        realtime_gateway_1.RealtimeGateway])
], ChannelsService);
//# sourceMappingURL=channels.service.js.map