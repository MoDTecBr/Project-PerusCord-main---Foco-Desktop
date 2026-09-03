import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AppConfig } from '../config/configuration';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateOpaqueToken,
  hashToken,
} from './crypto.util';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const FAILED_LOGIN_LOCKOUT_SECONDS = 15 * 60;

@Injectable()
export class AuthService {
  private readonly argon2Options: argon2.Options;
  private readonly jwtConfig: AppConfig['jwt'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    config: ConfigService<AppConfig, true>,
  ) {
    const argon2Config = config.get('argon2', { infer: true });
    this.argon2Options = {
      type: argon2.argon2id,
      memoryCost: argon2Config.memoryCostKib,
      timeCost: argon2Config.timeCost,
      parallelism: argon2Config.parallelism,
    };
    this.jwtConfig = config.get('jwt', { infer: true });
  }

  async register(dto: RegisterDto, ctx: RequestContext): Promise<TokenPair> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException('E-mail ou nome de usuário já está em uso.');
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

  async login(dto: LoginDto, ctx: RequestContext): Promise<TokenPair> {
    const lockKey = `auth:lockout:${dto.email}`;
    const attempts = await this.redis.get(lockKey);
    if (attempts && Number(attempts) >= MAX_FAILED_LOGIN_ATTEMPTS) {
      throw new ForbiddenException(
        'Muitas tentativas de login com esta conta. Tente novamente em alguns minutos.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const passwordValid = user
      ? await argon2.verify(user.passwordHash, dto.password).catch(() => false)
      : false;

    if (!user || !passwordValid) {
      await this.registerFailedLogin(lockKey);
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    if (user.mfaEnabled) {
      const validMfa = await this.verifyMfaOrBackupCode(user.id, dto.mfaCode);
      if (!validMfa) {
        await this.registerFailedLogin(lockKey);
        throw new UnauthorizedException('Código de autenticação de dois fatores inválido.');
      }
    }

    await this.redis.del(lockKey);
    return this.issueTokenPair(user.id, ctx);
  }

  async refresh(refreshToken: string, ctx: RequestContext): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const session = await this.prisma.session.findFirst({ where: { refreshTokenHash: tokenHash } });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão inválida ou expirada. Faça login novamente.');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(session.userId, ctx, session.id);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async startMfaEnrollment(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: encryptSecret(secret) },
    });
    const otpauthUrl = authenticator.keyuri(user.email, 'Relay', secret);
    return { secret, otpauthUrl };
  }

  async confirmMfaEnrollment(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) {
      throw new ForbiddenException('Nenhum cadastro de MFA pendente. Inicie o processo novamente.');
    }
    const secret = decryptSecret(user.mfaSecret);
    if (!authenticator.check(code, secret)) {
      throw new UnauthorizedException('Código TOTP inválido.');
    }

    const backupCodes = generateBackupCodes();
    const hashedCodes = await Promise.all(
      backupCodes.map((c) => argon2.hash(c, this.argon2Options)),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaBackupCodes: hashedCodes },
    });

    return { backupCodes };
  }

  async disableMfa(userId: string, code: string): Promise<void> {
    const valid = await this.verifyMfaOrBackupCode(userId, code);
    if (!valid) {
      throw new UnauthorizedException('Código inválido.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [] },
    });
  }

  private async verifyMfaOrBackupCode(userId: string, code?: string): Promise<boolean> {
    if (!code) return false;
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) return false;

    if (code.length === 6) {
      const secret = decryptSecret(user.mfaSecret);
      return authenticator.check(code, secret);
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

  private async registerFailedLogin(lockKey: string): Promise<void> {
    const attempts = await this.redis.incr(lockKey);
    if (attempts === 1) {
      await this.redis.expire(lockKey, FAILED_LOGIN_LOCKOUT_SECONDS);
    }
  }

  private async issueTokenPair(
    userId: string,
    ctx: RequestContext,
    previousSessionId?: string,
  ): Promise<TokenPair> {
    const refreshToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + this.jwtConfig.refreshTtlSeconds * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hashToken(refreshToken),
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

    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      { secret: this.jwtConfig.accessSecret, expiresIn: this.jwtConfig.accessTtlSeconds },
    );

    return { accessToken, refreshToken, expiresIn: this.jwtConfig.accessTtlSeconds };
  }
}
