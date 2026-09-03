import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'argon2') {
        return { memoryCostKib: 8192, timeCost: 2, parallelism: 1 };
      }
      if (key === 'jwt') {
        return {
          accessSecret: 'a-very-long-test-secret-that-is-at-least-32-chars',
          accessTtlSeconds: 900,
          refreshTtlSeconds: 2_592_000,
        };
      }
      throw new Error(`chave de config inesperada no teste: ${key}`);
    }),
  };

  function buildService(overrides: {
    prisma?: Record<string, unknown>;
    jwt?: Record<string, unknown>;
    redis?: Record<string, unknown>;
  } = {}) {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn().mockResolvedValue({ id: 'session-1' }),
        update: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      ...overrides.prisma,
    };
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-access-token'),
      ...overrides.jwt,
    };
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
      del: jest.fn(),
      ...overrides.redis,
    };

    const service = new AuthService(prisma as any, jwt as any, redis as any, config as any);
    return { service, prisma, jwt, redis };
  }

  it('registers a new user and returns a token pair', async () => {
    const { service, prisma } = buildService({
      prisma: {
        user: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'user-1' }),
        },
      },
    });

    const result = await service.register(
      { email: 'ana@relay.dev', username: 'ana', displayName: 'Ana', password: 'senha-super-segura-123' },
      { ipAddress: '127.0.0.1' },
    );

    expect(result.accessToken).toBe('signed-access-token');
    expect(typeof result.refreshToken).toBe('string');
    expect(result.refreshToken.length).toBeGreaterThan(20);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'ana@relay.dev', username: 'ana' }),
      }),
    );
  });

  it('rejects registration when email or username already exists', async () => {
    const { service } = buildService({
      prisma: { user: { findFirst: jest.fn().mockResolvedValue({ id: 'existing' }) } },
    });

    await expect(
      service.register(
        { email: 'ana@relay.dev', username: 'ana', displayName: 'Ana', password: 'senha-super-segura-123' },
        {},
      ),
    ).rejects.toThrow('já está em uso');
  });

  it('blocks login after too many failed attempts on the same account', async () => {
    const { service } = buildService({
      redis: { get: jest.fn().mockResolvedValue('5') },
    });

    await expect(
      service.login({ email: 'ana@relay.dev', password: 'errada' }, {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects login with wrong password and registers a failed attempt', async () => {
    const argon2 = await import('argon2');
    const passwordHash = await argon2.hash('senha-correta-123456', { type: argon2.argon2id });

    const { service, redis } = buildService({
      prisma: {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-1',
            passwordHash,
            mfaEnabled: false,
          }),
        },
      },
    });

    await expect(
      service.login({ email: 'ana@relay.dev', password: 'senha-errada' }, {}),
    ).rejects.toThrow(UnauthorizedException);
    expect(redis.incr).toHaveBeenCalled();
  });

  it('logs in successfully with the right password and issues tokens', async () => {
    const argon2 = await import('argon2');
    const passwordHash = await argon2.hash('senha-correta-123456', { type: argon2.argon2id });

    const { service, redis } = buildService({
      prisma: {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-1',
            passwordHash,
            mfaEnabled: false,
          }),
        },
      },
    });

    const result = await service.login(
      { email: 'ana@relay.dev', password: 'senha-correta-123456' },
      {},
    );

    expect(result.accessToken).toBe('signed-access-token');
    expect(redis.del).toHaveBeenCalled();
  });

  it('rejects refresh with an unknown or expired session', async () => {
    const { service } = buildService({
      prisma: { session: { findFirst: jest.fn().mockResolvedValue(null) } },
    });

    await expect(service.refresh('token-que-nao-existe', {})).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
