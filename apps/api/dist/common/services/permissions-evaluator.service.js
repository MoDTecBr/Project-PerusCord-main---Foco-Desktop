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
exports.PermissionsEvaluatorService = void 0;
const common_1 = require("@nestjs/common");
const permissions_1 = require("@relay/permissions");
const prisma_service_1 = require("../../prisma/prisma.service");
let PermissionsEvaluatorService = class PermissionsEvaluatorService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async computeBitfield(serverId, userId, scope = {}) {
        const server = await this.prisma.server.findUniqueOrThrow({ where: { id: serverId } });
        if (server.ownerId === userId) {
            return permissions_1.ALL_PERMISSIONS;
        }
        const member = await this.prisma.member.findUnique({
            where: { serverId_userId: { serverId, userId } },
            include: { roles: { include: { role: true } } },
        });
        if (!member)
            return null;
        let bitfield = member.roles.reduce((acc, mr) => acc | mr.role.permissions, 0n);
        if (!scope.channelId && !scope.categoryId) {
            return bitfield;
        }
        const overwrites = await this.prisma.permissionOverwrite.findMany({
            where: {
                OR: [
                    scope.categoryId ? { categoryId: scope.categoryId } : undefined,
                    scope.channelId ? { channelId: scope.channelId } : undefined,
                ].filter((clause) => !!clause),
            },
        });
        const roleIds = new Set(member.roles.map((mr) => mr.roleId));
        const applies = (ow) => (ow.roleId && roleIds.has(ow.roleId)) || ow.memberId === member.id;
        for (const ow of overwrites.filter((o) => o.categoryId)) {
            if (applies(ow))
                bitfield = (0, permissions_1.applyOverwrite)(bitfield, ow.allow, ow.deny);
        }
        for (const ow of overwrites.filter((o) => o.channelId)) {
            if (applies(ow))
                bitfield = (0, permissions_1.applyOverwrite)(bitfield, ow.allow, ow.deny);
        }
        return bitfield;
    }
};
exports.PermissionsEvaluatorService = PermissionsEvaluatorService;
exports.PermissionsEvaluatorService = PermissionsEvaluatorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionsEvaluatorService);
//# sourceMappingURL=permissions-evaluator.service.js.map