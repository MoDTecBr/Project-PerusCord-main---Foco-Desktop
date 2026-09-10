"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisIoAdapter = void 0;
const config_1 = require("@nestjs/config");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const ioredis_1 = __importDefault(require("ioredis"));
class RedisIoAdapter extends platform_socket_io_1.IoAdapter {
    app;
    pubClient;
    subClient;
    constructor(app) {
        super(app);
        this.app = app;
    }
    createIOServer(port, options) {
        const config = this.app.get((config_1.ConfigService));
        const redisUrl = config.get('redis', { infer: true }).url;
        this.pubClient = new ioredis_1.default(redisUrl);
        this.subClient = this.pubClient.duplicate();
        const server = super.createIOServer(port, {
            ...options,
            cors: { origin: '*' },
        });
        server.adapter((0, redis_adapter_1.createAdapter)(this.pubClient, this.subClient));
        return server;
    }
    async close(server) {
        await super.close(server);
        await Promise.all([this.pubClient?.quit(), this.subClient?.quit()]);
    }
}
exports.RedisIoAdapter = RedisIoAdapter;
//# sourceMappingURL=redis-io.adapter.js.map