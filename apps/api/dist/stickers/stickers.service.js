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
exports.StickersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_STICKERS_PER_USER = 100;
let StickersService = class StickersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listForUser(userId) {
        return this.prisma.sticker.findMany({
            where: { ownerId: userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(userId, dto) {
        const count = await this.prisma.sticker.count({ where: { ownerId: userId } });
        if (count >= MAX_STICKERS_PER_USER) {
            throw new common_1.BadRequestException(`Limite de ${MAX_STICKERS_PER_USER} figurinhas atingido.`);
        }
        return this.prisma.sticker.create({
            data: {
                ownerId: userId,
                url: dto.url,
                mimeType: dto.mimeType,
                size: dto.size,
                name: dto.name,
            },
        });
    }
    async remove(userId, stickerId) {
        const sticker = await this.prisma.sticker.findUnique({ where: { id: stickerId } });
        if (!sticker || sticker.ownerId !== userId) {
            throw new common_1.NotFoundException('Figurinha não encontrada.');
        }
        await this.prisma.sticker.delete({ where: { id: stickerId } });
    }
};
exports.StickersService = StickersService;
exports.StickersService = StickersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StickersService);
//# sourceMappingURL=stickers.service.js.map