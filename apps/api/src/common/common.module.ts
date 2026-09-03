import { Global, Module } from '@nestjs/common';
import { PermissionsEvaluatorService } from './services/permissions-evaluator.service';

/** Serviços transversais usados por várias features (guards, RBAC de mensagens, etc). */
@Global()
@Module({
  providers: [PermissionsEvaluatorService],
  exports: [PermissionsEvaluatorService],
})
export class CommonModule {}
