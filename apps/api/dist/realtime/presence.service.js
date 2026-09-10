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
exports.PresenceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const redis_service_1 = require("../redis/redis.service");
const SOCKET_SET_PREFIX = 'presence:sockets:';
let PresenceService = class PresenceService {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async addSocket(userId, socketId) {
        await this.redis.sadd(SOCKET_SET_PREFIX + userId, socketId);
        const count = await this.redis.scard(SOCKET_SET_PREFIX + userId);
        return count === 1;
    }
    async removeSocket(userId, socketId) {
        await this.redis.srem(SOCKET_SET_PREFIX + userId, socketId);
        const count = await this.redis.scard(SOCKET_SET_PREFIX + userId);
        return count === 0;
    }
    async isOnline(userId) {
        const count = await this.redis.scard(SOCKET_SET_PREFIX + userId);
        return count > 0;
    }
    async effectiveStatus(userId, manualStatus) {
        const online = await this.isOnline(userId);
        if (!online)
            return client_1.PresenceStatus.OFFLINE;
        return manualStatus === client_1.PresenceStatus.OFFLINE ? client_1.PresenceStatus.ONLINE : manualStatus;
    }
};
exports.PresenceService = PresenceService;
exports.PresenceService = PresenceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], PresenceService);
//# sourceMappingURL=presence.service.js.map