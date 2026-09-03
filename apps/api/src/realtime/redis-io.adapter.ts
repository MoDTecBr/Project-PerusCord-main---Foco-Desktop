import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, ServerOptions } from 'socket.io';
import Redis from 'ioredis';
import { AppConfig } from '../config/configuration';

/**
 * Liga o gateway ao Redis Pub/Sub: com múltiplas instâncias da API atrás do
 * load balancer, um evento emitido em uma instância chega aos sockets
 * conectados em qualquer outra. Sem isso, o realtime só funcionaria com uma
 * única instância rodando.
 */
export class RedisIoAdapter extends IoAdapter {
  private pubClient?: Redis;
  private subClient?: Redis;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const config = this.app.get(ConfigService<AppConfig, true>);
    const redisUrl = config.get('redis', { infer: true }).url;

    this.pubClient = new Redis(redisUrl);
    this.subClient = this.pubClient.duplicate();

    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: '*' },
    });
    server.adapter(createAdapter(this.pubClient, this.subClient));
    return server;
  }

  async close(server: Server): Promise<void> {
    await super.close(server);
    await Promise.all([this.pubClient?.quit(), this.subClient?.quit()]);
  }
}
