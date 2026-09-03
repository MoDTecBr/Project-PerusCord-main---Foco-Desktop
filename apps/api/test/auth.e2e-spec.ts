import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Requer Postgres e Redis reais acessíveis via DATABASE_URL/REDIS_URL do
 * ambiente (ver infra/docker/docker-compose.yml e .env.example). No CI, os
 * serviços sobem como containers antes deste teste (.github/workflows/ci.yml).
 */
describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-${Date.now()}@relay.dev`;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('registers, logs in, reads the profile and rotates the refresh token', async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post('/auth/register')
      .send({
        email,
        username: `e2e_${Date.now()}`,
        displayName: 'E2E Test',
        password: 'senha-de-teste-segura-123',
      })
      .expect(201);

    expect(registerRes.body.accessToken).toBeDefined();
    expect(registerRes.body.refreshToken).toBeDefined();

    const meRes = await request(server)
      .get('/users/me')
      .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
      .expect(200);
    expect(meRes.body.email).toBe(email);

    const refreshRes = await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: registerRes.body.refreshToken })
      .expect(200);
    expect(refreshRes.body.accessToken).toBeDefined();

    // O refresh token antigo já foi rotacionado — reusá-lo deve falhar.
    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: registerRes.body.refreshToken })
      .expect(401);
  });

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });
});
