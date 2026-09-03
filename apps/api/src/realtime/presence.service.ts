import { Injectable } from '@nestjs/common';
import { PresenceStatus } from '@prisma/client';
import { RedisService } from '../redis/redis.service';

const SOCKET_SET_PREFIX = 'presence:sockets:';

/**
 * Rastreia quais sockets (dispositivos/abas) cada usuário tem conectados.
 * Presença "online" é derivada disso: um usuário só fica offline quando o
 * último socket dele desconecta — múltiplos dispositivos não se derrubam.
 */
@Injectable()
export class PresenceService {
  constructor(private readonly redis: RedisService) {}

  /** Retorna true se este foi o primeiro socket do usuário (ficou online agora). */
  async addSocket(userId: string, socketId: string): Promise<boolean> {
    await this.redis.sadd(SOCKET_SET_PREFIX + userId, socketId);
    const count = await this.redis.scard(SOCKET_SET_PREFIX + userId);
    return count === 1;
  }

  /** Retorna true se este era o último socket do usuário (ficou offline agora). */
  async removeSocket(userId: string, socketId: string): Promise<boolean> {
    await this.redis.srem(SOCKET_SET_PREFIX + userId, socketId);
    const count = await this.redis.scard(SOCKET_SET_PREFIX + userId);
    return count === 0;
  }

  async isOnline(userId: string): Promise<boolean> {
    const count = await this.redis.scard(SOCKET_SET_PREFIX + userId);
    return count > 0;
  }

  /** Status efetivo a exibir: OFFLINE sempre vence se não há socket algum. */
  async effectiveStatus(userId: string, manualStatus: PresenceStatus): Promise<PresenceStatus> {
    const online = await this.isOnline(userId);
    if (!online) return PresenceStatus.OFFLINE;
    return manualStatus === PresenceStatus.OFFLINE ? PresenceStatus.ONLINE : manualStatus;
  }
}
