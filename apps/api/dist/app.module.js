"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const configuration_1 = __importDefault(require("./config/configuration"));
const env_validation_1 = require("./config/env.validation");
const prisma_module_1 = require("./prisma/prisma.module");
const redis_module_1 = require("./redis/redis.module");
const audit_module_1 = require("./audit/audit.module");
const common_module_1 = require("./common/common.module");
const realtime_module_1 = require("./realtime/realtime.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const servers_module_1 = require("./servers/servers.module");
const channels_module_1 = require("./channels/channels.module");
const roles_module_1 = require("./roles/roles.module");
const invites_module_1 = require("./invites/invites.module");
const messages_module_1 = require("./messages/messages.module");
const friends_module_1 = require("./friends/friends.module");
const dm_module_1 = require("./dm/dm.module");
const livekit_module_1 = require("./livekit/livekit.module");
const uploads_module_1 = require("./uploads/uploads.module");
const stickers_module_1 = require("./stickers/stickers.module");
const releases_module_1 = require("./releases/releases.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
                validate: env_validation_1.validateEnv,
            }),
            throttler_1.ThrottlerModule.forRoot({
                throttlers: [{ ttl: 60_000, limit: 120 }],
            }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            audit_module_1.AuditModule,
            common_module_1.CommonModule,
            realtime_module_1.RealtimeModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            servers_module_1.ServersModule,
            channels_module_1.ChannelsModule,
            roles_module_1.RolesModule,
            invites_module_1.InvitesModule,
            messages_module_1.MessagesModule,
            friends_module_1.FriendsModule,
            dm_module_1.DmModule,
            livekit_module_1.LivekitModule,
            uploads_module_1.UploadsModule,
            stickers_module_1.StickersModule,
            releases_module_1.ReleasesModule,
        ],
        providers: [
            { provide: core_1.APP_FILTER, useClass: all_exceptions_filter_1.AllExceptionsFilter },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map