import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Exige que o membro (dono ou com ADMINISTRATOR sempre passam) tenha todas as
 * permissões listadas no servidor da rota. Combine com `PermissionsGuard`.
 * A rota precisa ter um parâmetro `:serverId` (ou `:channelId`/`:categoryId`,
 * resolvidos pelo guard para o servidor correspondente).
 */
export const RequirePermissions = (...permissions: bigint[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
