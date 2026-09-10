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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesController = void 0;
const common_1 = require("@nestjs/common");
const permissions_1 = require("@relay/permissions");
const require_permissions_decorator_1 = require("../common/decorators/require-permissions.decorator");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_service_1 = require("./roles.service");
const create_role_dto_1 = require("./dto/create-role.dto");
const update_role_dto_1 = require("./dto/update-role.dto");
let RolesController = class RolesController {
    rolesService;
    constructor(rolesService) {
        this.rolesService = rolesService;
    }
    create(serverId, user, dto) {
        return this.rolesService.create(serverId, user.id, dto);
    }
    update(serverId, roleId, user, dto) {
        return this.rolesService.update(serverId, roleId, user.id, dto);
    }
    async remove(serverId, roleId, user) {
        await this.rolesService.delete(serverId, roleId, user.id);
    }
    async assign(serverId, memberId, roleId, user) {
        await this.rolesService.assignToMember(serverId, memberId, roleId, user.id);
    }
    async unassign(serverId, memberId, roleId, user) {
        await this.rolesService.removeFromMember(serverId, memberId, roleId, user.id);
    }
};
exports.RolesController = RolesController;
__decorate([
    (0, common_1.Post)('roles'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_role_dto_1.CreateRoleDto]),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('roles/:roleId'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, common_1.Param)('roleId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, update_role_dto_1.UpdateRoleDto]),
    __metadata("design:returntype", void 0)
], RolesController.prototype, "update", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.Delete)('roles/:roleId'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, common_1.Param)('roleId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "remove", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.Post)('members/:memberId/roles/:roleId'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, common_1.Param)('roleId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "assign", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.Delete)('members/:memberId/roles/:roleId'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, common_1.Param)('roleId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "unassign", null);
exports.RolesController = RolesController = __decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permissions_decorator_1.RequirePermissions)(permissions_1.Permission.MANAGE_ROLES),
    (0, common_1.Controller)('servers/:serverId'),
    __metadata("design:paramtypes", [roles_service_1.RolesService])
], RolesController);
//# sourceMappingURL=roles.controller.js.map