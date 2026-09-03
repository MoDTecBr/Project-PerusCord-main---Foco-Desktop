import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { PresenceService } from './presence.service';

/**
 * Global: qualquer módulo (mensagens, convites, amizades...) pode injetar
 * `RealtimeGateway` diretamente para emitir eventos, sem depender de um
 * barramento de eventos à parte.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeGateway, PresenceService],
  exports: [RealtimeGateway, PresenceService],
})
export class RealtimeModule {}
