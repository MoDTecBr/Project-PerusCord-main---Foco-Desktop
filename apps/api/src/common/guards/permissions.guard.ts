import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '@relay/permissions';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsEvaluatorService } from '../services/permissions-evaluator.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Resolve o servidor (a partir de :serverId, :channelId ou :categoryId na
 * rota), calcula o bitfield efetivo do membro autenticado via
 * `PermissionsEvaluatorService` e compara com as permissões exigidas por
 * @RequirePermissions(). O dono do servidor sempre passa.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly evaluator: PermissionsEvaluatorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<bigint[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string>; user: AuthenticatedUser }>();
    const user = request.user;
    const params = request.params;

    const { serverId, channelId, categoryId } = await this.resolveScope(params);

    const bitfield = await this.evaluator.computeBitfield(serverId, user.id, {
      channelId,
      categoryId,
    });
    if (bitfield === null) {
      throw new ForbiddenException('Você não é membro deste servidor.');
    }

    const missing = required.filter((perm) => !hasPermission(bitfield, perm));
    if (missing.length > 0) {
      throw new ForbiddenException('Você não tem permissão para executar esta ação.');
    }
    return true;
  }

  private async resolveScope(
    params: Record<string, string>,
  ): Promise<{ serverId: string; channelId?: string; categoryId?: string }> {
    if (params.serverId) {
      return { serverId: params.serverId };
    }
    if (params.channelId) {
      const channel = await this.prisma.channel.findUnique({ where: { id: params.channelId } });
      if (!channel || !channel.serverId) throw new NotFoundException('Canal não encontrado.');
      return { serverId: channel.serverId, channelId: channel.id };
    }
    if (params.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: params.categoryId },
      });
      if (!category) throw new NotFoundException('Categoria não encontrada.');
      return { serverId: category.serverId, categoryId: category.id };
    }
    throw new NotFoundException('Rota sem escopo de servidor resolvível.');
  }
}
