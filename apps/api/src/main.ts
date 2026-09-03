import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule, AppConfig } from './app.module';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

// BigInt (usado nos bitfields de permissão) não é serializável por JSON.stringify
// nativamente — expõe como string para toda resposta da API.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppConfig, true>);

  app.use(helmet());
  app.enableCors({ origin: config.get('corsOrigins', { infer: true }), credentials: true });
  app.useWebSocketAdapter(new RedisIoAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get('port', { infer: true });
  // Bind explícito em todas as interfaces — necessário para ser alcançável
  // pela rede virtual do Radmin VPN, não só localhost.
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Relay API rodando em http://localhost:${port}`);
}

bootstrap();
