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
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permissions_1 = require("@relay/permissions");
const prisma_service_1 = require("../../prisma/prisma.service");
const permissions_evaluator_service_1 = require("../services/permissions-evaluator.service");
const require_permissions_decorator_1 = require("../decorators/require-permissions.decorator");
let PermissionsGuard = class PermissionsGuard {
    reflector;
    prisma;
    evaluator;
    constructor(reflector, prisma, evaluator) {
        this.reflector = reflector;
        this.prisma = prisma;
        this.evaluator = evaluator;
    }
    async canActivate(context) {
        const required = this.reflector.getAllAndOverride(require_permissions_decorator_1.REQUIRED_PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!required || required.length === 0) {
            return true;
        }
        const request = context
            .switchToHttp()
            .getRequest();
        const user = request.user;
        const params = request.params;
        const { serverId, channelId, categoryId } = await this.resolveScope(params);
        const bitfield = await this.evaluator.computeBitfield(serverId, user.id, {
            channelId,
            categoryId,
        });
        if (bitfield === null) {
            throw new common_1.ForbiddenException('Você não é membro deste servidor.');
        }
        const missing = required.filter((perm) => !(0, permissions_1.hasPermission)(bitfield, perm));
        if (missing.length > 0) {
            throw new common_1.ForbiddenException('Você não tem permissão para executar esta ação.');
        }
        return true;
    }
    async resolveScope(params) {
        if (params.serverId) {
            return { serverId: params.serverId };
        }
        if (params.channelId) {
            const channel = await this.prisma.channel.findUnique({ where: { id: params.channelId } });
            if (!channel || !channel.serverId)
                throw new common_1.NotFoundException('Canal não encontrado.');
            return { serverId: channel.serverId, channelId: channel.id };
        }
        if (params.categoryId) {
            const category = await this.prisma.category.findUnique({
                where: { id: params.categoryId },
            });
            if (!category)
                throw new common_1.NotFoundException('Categoria não encontrada.');
            return { serverId: category.serverId, categoryId: category.id };
        }
        throw new common_1.NotFoundException('Rota sem escopo de servidor resolvível.');
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService,
        permissions_evaluator_service_1.PermissionsEvaluatorService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map