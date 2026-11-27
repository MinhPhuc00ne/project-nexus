import { Injectable, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTraceId } from './request-trace.context';

export type AuditWriteClient = Pick<Prisma.TransactionClient, 'eventLog'>;

export interface AuditLogInput {
  eventName: string;
  payload: Prisma.InputJsonValue;
  operatorId?: string | null;
  traceId?: string | null;
}

/**
 * Persists structured audit records for sensitive administrative and financial
 * mutations into `event_logs`, capturing the active request `traceId`.
 */
@Injectable()
export class AuditLogService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async record(input: AuditLogInput, client?: AuditWriteClient): Promise<void> {
    const target = client ?? this.prisma;
    if (!target || typeof target.eventLog?.create !== 'function') {
      return;
    }

    await target.eventLog.create({
      data: {
        eventName: input.eventName,
        payload: input.payload,
        operatorId: input.operatorId ?? null,
        traceId: input.traceId ?? getCurrentTraceId() ?? null,
      },
    });
  }
}
