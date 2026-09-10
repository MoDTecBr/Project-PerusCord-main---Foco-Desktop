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
exports.VoicePresenceController = exports.LivekitController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const livekit_service_1 = require("./livekit.service");
let LivekitController = class LivekitController {
    livekit;
    constructor(livekit) {
        this.livekit = livekit;
    }
    mintToken(channelId, user) {
        return this.livekit.mintVoiceToken(channelId, user.id);
    }
};
exports.LivekitController = LivekitController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('channelId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LivekitController.prototype, "mintToken", null);
exports.LivekitController = LivekitController = __decorate([
    (0, common_1.Controller)('channels/:channelId/voice-token'),
    __metadata("design:paramtypes", [livekit_service_1.LivekitService])
], LivekitController);
let VoicePresenceController = class VoicePresenceController {
    livekit;
    constructor(livekit) {
        this.livekit = livekit;
    }
    get(serverId, user) {
        return this.livekit.getVoicePresence(serverId, user.id);
    }
};
exports.VoicePresenceController = VoicePresenceController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], VoicePresenceController.prototype, "get", null);
exports.VoicePresenceController = VoicePresenceController = __decorate([
    (0, common_1.Controller)('servers/:serverId/voice-presence'),
    __metadata("design:paramtypes", [livekit_service_1.LivekitService])
], VoicePresenceController);
//# sourceMappingURL=livekit.controller.js.map