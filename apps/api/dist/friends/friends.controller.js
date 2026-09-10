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
exports.FriendsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const friends_service_1 = require("./friends.service");
const send_friend_request_dto_1 = require("./dto/send-friend-request.dto");
let FriendsController = class FriendsController {
    friends;
    constructor(friends) {
        this.friends = friends;
    }
    listFriends(user) {
        return this.friends.listFriends(user.id);
    }
    listPending(user) {
        return this.friends.listPending(user.id);
    }
    sendRequest(user, dto) {
        return this.friends.sendRequest(user.id, dto);
    }
    accept(friendshipId, user) {
        return this.friends.respond(user.id, friendshipId, true);
    }
    decline(friendshipId, user) {
        return this.friends.respond(user.id, friendshipId, false);
    }
    block(user, dto) {
        return this.friends.block(user.id, dto.username);
    }
    async remove(friendshipId, user) {
        await this.friends.remove(user.id, friendshipId);
    }
};
exports.FriendsController = FriendsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "listFriends", null);
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "listPending", null);
__decorate([
    (0, common_1.Post)('requests'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_friend_request_dto_1.SendFriendRequestDto]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "sendRequest", null);
__decorate([
    (0, common_1.Post)('requests/:friendshipId/accept'),
    __param(0, (0, common_1.Param)('friendshipId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)('requests/:friendshipId/decline'),
    __param(0, (0, common_1.Param)('friendshipId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "decline", null);
__decorate([
    (0, common_1.Post)('block'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_friend_request_dto_1.SendFriendRequestDto]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "block", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.Delete)(':friendshipId'),
    __param(0, (0, common_1.Param)('friendshipId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FriendsController.prototype, "remove", null);
exports.FriendsController = FriendsController = __decorate([
    (0, common_1.Controller)('friends'),
    __metadata("design:paramtypes", [friends_service_1.FriendsService])
], FriendsController);
//# sourceMappingURL=friends.controller.js.map