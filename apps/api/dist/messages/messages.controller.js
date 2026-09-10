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
exports.MessagesController = exports.ChannelMessagesController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const messages_service_1 = require("./messages.service");
const create_message_dto_1 = require("./dto/create-message.dto");
const update_message_dto_1 = require("./dto/update-message.dto");
const list_messages_dto_1 = require("./dto/list-messages.dto");
let ChannelMessagesController = class ChannelMessagesController {
    messages;
    constructor(messages) {
        this.messages = messages;
    }
    create(channelId, user, dto) {
        return this.messages.create(channelId, user.id, dto);
    }
    list(channelId, user, query) {
        return this.messages.list(channelId, user.id, query);
    }
    search(channelId, user, query) {
        return this.messages.search(channelId, user.id, query.q);
    }
};
exports.ChannelMessagesController = ChannelMessagesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('channelId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_message_dto_1.CreateMessageDto]),
    __metadata("design:returntype", void 0)
], ChannelMessagesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('channelId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, list_messages_dto_1.ListMessagesDto]),
    __metadata("design:returntype", void 0)
], ChannelMessagesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Param)('channelId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, list_messages_dto_1.SearchMessagesDto]),
    __metadata("design:returntype", void 0)
], ChannelMessagesController.prototype, "search", null);
exports.ChannelMessagesController = ChannelMessagesController = __decorate([
    (0, common_1.Controller)('channels/:channelId/messages'),
    __metadata("design:paramtypes", [messages_service_1.MessagesService])
], ChannelMessagesController);
let MessagesController = class MessagesController {
    messages;
    constructor(messages) {
        this.messages = messages;
    }
    update(messageId, user, dto) {
        return this.messages.update(messageId, user.id, dto);
    }
    async remove(messageId, user) {
        await this.messages.remove(messageId, user.id);
    }
};
exports.MessagesController = MessagesController;
__decorate([
    (0, common_1.Patch)(':messageId'),
    __param(0, (0, common_1.Param)('messageId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_message_dto_1.UpdateMessageDto]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "update", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.Delete)(':messageId'),
    __param(0, (0, common_1.Param)('messageId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "remove", null);
exports.MessagesController = MessagesController = __decorate([
    (0, common_1.Controller)('messages'),
    __metadata("design:paramtypes", [messages_service_1.MessagesService])
], MessagesController);
//# sourceMappingURL=messages.controller.js.map