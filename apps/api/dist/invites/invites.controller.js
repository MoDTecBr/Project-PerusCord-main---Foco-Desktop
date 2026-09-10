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
exports.InvitesJoinController = exports.ServerInvitesController = void 0;
const common_1 = require("@nestjs/common");
const permissions_1 = require("@relay/permissions");
const require_permissions_decorator_1 = require("../common/decorators/require-permissions.decorator");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const invites_service_1 = require("./invites.service");
const create_invite_dto_1 = require("./dto/create-invite.dto");
let ServerInvitesController = class ServerInvitesController {
    invitesService;
    constructor(invitesService) {
        this.invitesService = invitesService;
    }
    create(serverId, user, dto) {
        return this.invitesService.create(serverId, user.id, dto);
    }
    list(serverId) {
        return this.invitesService.listForServer(serverId);
    }
    async remove(serverId, inviteId, user) {
        await this.invitesService.delete(serverId, inviteId, user.id);
    }
};
exports.ServerInvitesController = ServerInvitesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_invite_dto_1.CreateInviteDto]),
    __metadata("design:returntype", void 0)
], ServerInvitesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('serverId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServerInvitesController.prototype, "list", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.Delete)(':inviteId'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, common_1.Param)('inviteId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ServerInvitesController.prototype, "remove", null);
exports.ServerInvitesController = ServerInvitesController = __decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permissions_decorator_1.RequirePermissions)(permissions_1.Permission.CREATE_INVITE),
    (0, common_1.Controller)('servers/:serverId/invites'),
    __metadata("design:paramtypes", [invites_service_1.InvitesService])
], ServerInvitesController);
let InvitesJoinController = class InvitesJoinController {
    invitesService;
    constructor(invitesService) {
        this.invitesService = invitesService;
    }
    join(code, user) {
        return this.invitesService.joinByCode(code, user.id);
    }
};
exports.InvitesJoinController = InvitesJoinController;
__decorate([
    (0, common_1.Post)(':code/join'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InvitesJoinController.prototype, "join", null);
exports.InvitesJoinController = InvitesJoinController = __decorate([
    (0, common_1.Controller)('invites'),
    __metadata("design:paramtypes", [invites_service_1.InvitesService])
], InvitesJoinController);
//# sourceMappingURL=invites.controller.js.map