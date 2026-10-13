import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * Prisma service that wraps PrismaClient with NestJS lifecycle hooks.
 *
 * IMPORTANT: This service uses the admin connection URL for all queries.
 * Tenant-scoped queries MUST use the TenantTransactionService wrapper
 * which sets the RLS tenant context before executing queries.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@InjectPinoLogger(PrismaService.name) private readonly logger: PinoLogger) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.info('Database connection established');

    // Log slow queries in development
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    (this.$on as (event: string, cb: (e: { duration: number; query: string }) => void) => void)(
      'query',
      (e) => {
        if (e.duration > 500) {
          this.logger.warn({ duration: e.duration, query: e.query }, 'Slow database query');
        }
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.info('Database connection closed');
  }

  /**
   * Health check — verifies the database is reachable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
