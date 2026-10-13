import { Module, Global } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Global database module.
 * Provides PrismaService throughout the application.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
