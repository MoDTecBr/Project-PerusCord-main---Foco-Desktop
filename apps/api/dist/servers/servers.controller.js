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
exports.ServersController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const require_permissions_decorator_1 = require("../common/decorators/require-permissions.decorator");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_1 = require("@relay/permissions");
const servers_service_1 = require("./servers.service");
const create_server_dto_1 = require("./dto/create-server.dto");
const update_server_dto_1 = require("./dto/update-server.dto");
let ServersController = class ServersController {
    serversService;
    constructor(serversService) {
        this.serversService = serversService;
    }
    create(user, dto) {
        return this.serversService.create(user.id, dto);
    }
    listMine(user) {
        return this.serversService.listForUser(user.id);
    }
    getDetail(serverId, user) {
        return this.serversService.getDetail(serverId, user.id);
    }
    update(serverId, user, dto) {
        return this.serversService.update(serverId, user.id, dto);
    }
    remove(serverId, user) {
        return this.serversService.deleteAsOwner(serverId, user.id);
    }
};
exports.ServersController = ServersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_server_dto_1.CreateServerDto]),
    __metadata("design:returntype", void 0)
], ServersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ServersController.prototype, "listMine", null);
__decorate([
    (0, common_1.Get)(':serverId'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ServersController.prototype, "getDetail", null);
__decorate([
    (0, common_2.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, require_permissions_decorator_1.RequirePermissions)(permissions_1.Permission.MANAGE_SERVER),
    (0, common_1.Patch)(':serverId'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_server_dto_1.UpdateServerDto]),
    __metadata("design:returntype", void 0)
], ServersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':serverId'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ServersController.prototype, "remove", null);
exports.ServersController = ServersController = __decorate([
    (0, common_1.Controller)('servers'),
    __metadata("design:paramtypes", [servers_service_1.ServersService])
], ServersController);
//# sourceMappingURL=servers.controller.js.map