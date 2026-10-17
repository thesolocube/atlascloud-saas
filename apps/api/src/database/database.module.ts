import { Module, Global } from '@nestjs/common';

import { PrismaService } from './prisma.service';
import { TenantTransactionService } from './tenant-transaction.service';

/**
 * Global database module.
 * Provides PrismaService and TenantTransactionService throughout the application.
 */
@Global()
@Module({
  providers: [PrismaService, TenantTransactionService],
  exports: [PrismaService, TenantTransactionService],
})
export class DatabaseModule {}
