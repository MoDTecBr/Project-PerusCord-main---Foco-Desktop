"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const redis_io_adapter_1 = require("./realtime/redis-io.adapter");
BigInt.prototype.toJSON = function () {
    return this.toString();
};
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get((config_1.ConfigService));
    app.use((0, helmet_1.default)());
    app.enableCors({ origin: config.get('corsOrigins', { infer: true }), credentials: true });
    app.useWebSocketAdapter(new redis_io_adapter_1.RedisIoAdapter(app));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const port = config.get('port', { infer: true });
    await app.listen(port, '0.0.0.0');
    console.log(`Relay API rodando em http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map