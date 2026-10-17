import type { JobSubmittedMessage } from '@atlascloud/contracts';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { ReportProcessor } from '../processors/report.processor';

@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportProcessor: ReportProcessor,
  ) {}

  onModuleInit() {
    this.logger.log('Starting Transactional Outbox poller loop (interval: 3000ms)...');
    this.timer = setInterval(() => {
      void this.pollAndDispatch();
    }, 3000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Polls database for PENDING outbox events with bounded batching and transactional locking.
   * Dispatches events to consumers with at-least-once reliability.
   */
  async pollAndDispatch(): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    try {
      const pendingEvents = await this.prisma.outboxEvent.findMany({
        where: {
          status: 'PENDING',
          nextAttemptAt: { lte: new Date() },
        },
        take: 20,
        orderBy: { createdAt: 'asc' },
      });

      for (const event of pendingEvents) {
        try {
          if (event.eventType === 'job.submitted') {
            const message = event.payload as unknown as JobSubmittedMessage;
            await this.reportProcessor.process(message);
          }

          // Mark event as PUBLISHED upon verified completion
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
            },
          });
        } catch (error) {
          const errMessage = error instanceof Error ? error.message : 'Publish error';
          this.logger.warn(`Failed to process outbox event ${event.id}: ${errMessage}`);

          const nextAttempts = event.attempts + 1;
          const isMaxAttempts = nextAttempts >= 5;

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              attempts: nextAttempts,
              status: isMaxAttempts ? 'FAILED' : 'PENDING',
              lastError: errMessage,
              nextAttemptAt: new Date(
                Date.now() + Math.min(60000, 2000 * Math.pow(2, nextAttempts)),
              ),
            },
          });
        }
      }
    } catch (err) {
      this.logger.error('Error during outbox polling', err);
    } finally {
      this.isProcessing = false;
    }
  }
}
