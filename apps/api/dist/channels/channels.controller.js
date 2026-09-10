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
exports.ChannelsController = void 0;
const common_1 = require("@nestjs/common");
const permissions_1 = require("@relay/permissions");
const require_permissions_decorator_1 = require("../common/decorators/require-permissions.decorator");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const channels_service_1 = require("./channels.service");
const create_category_dto_1 = require("./dto/create-category.dto");
const create_channel_dto_1 = require("./dto/create-channel.dto");
const update_channel_dto_1 = require("./dto/update-channel.dto");
let ChannelsController = class ChannelsController {
    channelsService;
    constructor(channelsService) {
        this.channelsService = channelsService;
    }
    createCategory(serverId, user, dto) {
        return this.channelsService.createCategory(serverId, user.id, dto);
    }
    deleteCategory(categoryId, user) {
        return this.channelsService.deleteCategory(categoryId, user.id);
    }
    createChannel(serverId, user, dto) {
        return this.channelsService.createChannel(serverId, user.id, dto);
    }
    updateChannel(channelId, user, dto) {
        return this.channelsService.updateChannel(channelId, user.id, dto);
    }
    deleteChannel(channelId, user) {
        return this.channelsService.deleteChannel(channelId, user.id);
    }
};
exports.ChannelsController = ChannelsController;
__decorate([
    (0, require_permissions_decorator_1.RequirePermissions)(permissions_1.Permission.MANAGE_CHANNELS),
    (0, common_1.Post)('servers/:serverId/categories'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_category_dto_1.CreateCategoryDto]),
    __metadata("design:returntype", void 0)
], ChannelsController.prototype, "createCategory", null);
__decorate([
    (0, require_permissions_decorator_1.RequirePermissions)(permissions_1.Permission.MANAGE_CHANNELS),
    (0, common_1.Delete)('categories/:categoryId'),
    __param(0, (0, common_1.Param)('categoryId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ChannelsController.prototype, "deleteCategory", null);
__decorate([
    (0, require_permissions_decorator_1.RequirePermissions)(permissions_1.Permission.MANAGE_CHANNELS),
    (0, common_1.Post)('servers/:serverId/channels'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_channel_dto_1.CreateChannelDto]),
    __metadata("design:returntype", void 0)
], ChannelsController.prototype, "createChannel", null);
__decorate([
    (0, require_permissions_decorator_1.RequirePermissions)(permissions_1.Permission.MANAGE_CHANNELS),
    (0, common_1.Patch)('channels/:channelId'),
    __param(0, (0, common_1.Param)('channelId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_channel_dto_1.UpdateChannelDto]),
    __metadata("design:returntype", void 0)
], ChannelsController.prototype, "updateChannel", null);
__decorate([
    (0, require_permissions_decorator_1.RequirePermissions)(permissions_1.Permission.MANAGE_CHANNELS),
    (0, common_1.Delete)('channels/:channelId'),
    __param(0, (0, common_1.Param)('channelId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ChannelsController.prototype, "deleteChannel", null);
exports.ChannelsController = ChannelsController = __decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [channels_service_1.ChannelsService])
], ChannelsController);
//# sourceMappingURL=channels.controller.js.map