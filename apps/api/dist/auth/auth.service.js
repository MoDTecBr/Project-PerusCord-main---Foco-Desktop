"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const argon2 = __importStar(require("argon2"));
const otplib_1 = require("otplib");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const crypto_util_1 = require("./crypto.util");
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const FAILED_LOGIN_LOCKOUT_SECONDS = 15 * 60;
let AuthService = class AuthService {
    prisma;
    jwt;
    redis;
    argon2Options;
    jwtConfig;
    constructor(prisma, jwt, redis, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.redis = redis;
        const argon2Config = config.get('argon2', { infer: true });
        this.argon2Options = {
            type: argon2.argon2id,
            memoryCost: argon2Config.memoryCostKib,
            timeCost: argon2Config.timeCost,
            parallelism: argon2Config.parallelism,
        };
        this.jwtConfig = config.get('jwt', { infer: true });
    }
    async register(dto, ctx) {
        const existing = await this.prisma.user.findFirst({
            where: { OR: [{ email: dto.email }, { username: dto.username }] },
        });
        if (existing) {
            throw new common_1.ConflictException('E-mail ou nome de usuário já está em uso.');
        }
        const passwordHash = await argon2.hash(dto.password, this.argon2Options);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                username: dto.username,
                displayName: dto.displayName,
                passwordHash,
            },
        });
        return this.issueTokenPair(user.id, ctx);
    }
    async login(dto, ctx) {
        const lockKey = `auth:lockout:${dto.email}`;
        const attempts = await this.redis.get(lockKey);
        if (attempts && Number(attempts) >= MAX_FAILED_LOGIN_ATTEMPTS) {
            throw new common_1.ForbiddenException('Muitas tentativas de login com esta conta. Tente novamente em alguns minutos.');
        }
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        const passwordValid = user
            ? await argon2.verify(user.passwordHash, dto.password).catch(() => false)
            : false;
        if (!user || !passwordValid) {
            await this.registerFailedLogin(lockKey);
            throw new common_1.UnauthorizedException('E-mail ou senha inválidos.');
        }
        if (user.mfaEnabled) {
            const validMfa = await this.verifyMfaOrBackupCode(user.id, dto.mfaCode);
            if (!validMfa) {
                await this.registerFailedLogin(lockKey);
                throw new common_1.UnauthorizedException('Código de autenticação de dois fatores inválido.');
            }
        }
        await this.redis.del(lockKey);
        return this.issueTokenPair(user.id, ctx);
    }
    async refresh(refreshToken, ctx) {
        const tokenHash = (0, crypto_util_1.hashToken)(refreshToken);
        const session = await this.prisma.session.findFirst({ where: { refreshTokenHash: tokenHash } });
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Sessão inválida ou expirada. Faça login novamente.');
        }
        await this.prisma.session.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
        });
        return this.issueTokenPair(session.userId, ctx, session.id);
    }
    async logout(refreshToken) {
        const tokenHash = (0, crypto_util_1.hashToken)(refreshToken);
        await this.prisma.session.updateMany({
            where: { refreshTokenHash: tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async startMfaEnrollment(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const secret = otplib_1.authenticator.generateSecret();
        await this.prisma.user.update({
            where: { id: userId },
            data: { mfaSecret: (0, crypto_util_1.encryptSecret)(secret) },
        });
        const otpauthUrl = otplib_1.authenticator.keyuri(user.email, 'Relay', secret);
        return { secret, otpauthUrl };
    }
    async confirmMfaEnrollment(userId, code) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.mfaSecret) {
            throw new common_1.ForbiddenException('Nenhum cadastro de MFA pendente. Inicie o processo novamente.');
        }
        const secret = (0, crypto_util_1.decryptSecret)(user.mfaSecret);
        if (!otplib_1.authenticator.check(code, secret)) {
            throw new common_1.UnauthorizedException('Código TOTP inválido.');
        }
        const backupCodes = (0, crypto_util_1.generateBackupCodes)();
        const hashedCodes = await Promise.all(backupCodes.map((c) => argon2.hash(c, this.argon2Options)));
        await this.prisma.user.update({
            where: { id: userId },
            data: { mfaEnabled: true, mfaBackupCodes: hashedCodes },
        });
        return { backupCodes };
    }
    async disableMfa(userId, code) {
        const valid = await this.verifyMfaOrBackupCode(userId, code);
        if (!valid) {
            throw new common_1.UnauthorizedException('Código inválido.');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [] },
        });
    }
    async verifyMfaOrBackupCode(userId, code) {
        if (!code)
            return false;
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.mfaSecret)
            return false;
        if (code.length === 6) {
            const secret = (0, crypto_util_1.decryptSecret)(user.mfaSecret);
            return otplib_1.authenticator.check(code, secret);
        }
        for (let i = 0; i < user.mfaBackupCodes.length; i++) {
            const matches = await argon2.verify(user.mfaBackupCodes[i], code).catch(() => false);
            if (matches) {
                const remaining = [...user.mfaBackupCodes];
                remaining.splice(i, 1);
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { mfaBackupCodes: remaining },
                });
                return true;
            }
        }
        return false;
    }
    async registerFailedLogin(lockKey) {
        const attempts = await this.redis.incr(lockKey);
        if (attempts === 1) {
            await this.redis.expire(lockKey, FAILED_LOGIN_LOCKOUT_SECONDS);
        }
    }
    async issueTokenPair(userId, ctx, previousSessionId) {
        const refreshToken = (0, crypto_util_1.generateOpaqueToken)();
        const expiresAt = new Date(Date.now() + this.jwtConfig.refreshTtlSeconds * 1000);
        const session = await this.prisma.session.create({
            data: {
                userId,
                refreshTokenHash: (0, crypto_util_1.hashToken)(refreshToken),
                userAgent: ctx.userAgent,
                ipAddress: ctx.ipAddress,
                expiresAt,
            },
        });
        if (previousSessionId) {
            await this.prisma.session.update({
                where: { id: previousSessionId },
                data: { replacedBySessionId: session.id },
            });
        }
        const accessToken = await this.jwt.signAsync({ sub: userId }, { secret: this.jwtConfig.accessSecret, expiresIn: this.jwtConfig.accessTtlSeconds });
        return { accessToken, refreshToken, expiresIn: this.jwtConfig.accessTtlSeconds };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        redis_service_1.RedisService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map