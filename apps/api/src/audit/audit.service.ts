import { Injectable, Logger } from '@nestjs/common';
import { AuditLogAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface RecordAuditEntryInput {
  serverId: string;
  actorId: string;
  action: AuditLogAction;
  targetId?: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Registra uma ação sensível. Nunca lança — auditoria não pode derrubar a ação principal. */
  async record(input: RecordAuditEntryInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          serverId: input.serverId,
          actorId: input.actorId,
          action: input.action,
          targetId: input.targetId,
          reason: input.reason,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao gravar audit log (${input.action} em ${input.serverId})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async listForServer(serverId: string, take = 50) {
    return this.prisma.auditLog.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { actor: { select: { id: true, username: true, displayName: true } } },
    });
  }
}
