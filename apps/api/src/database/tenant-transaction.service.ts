import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from './prisma.service';

@Injectable()
export class TenantTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes database operations inside a PostgreSQL transaction with
   * transaction-local tenant context set (SET LOCAL app.current_org_id = $1).
   * Ensures Row Level Security policies are active for the lifetime of the transaction.
   */
  async runWithTenant<T>(
    organizationId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Validate UUID format before parameter execution
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_org_id = '${organizationId.replace(/'/g, "''")}'`,
      );
      return operation(tx);
    });
  }
}
