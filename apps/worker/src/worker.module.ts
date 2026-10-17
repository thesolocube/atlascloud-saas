import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { PrismaService } from './database/prisma.service';
import { OutboxPublisher } from './outbox/outbox.publisher';
import { ReportProcessor } from './processors/report.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    LoggerModule.forRoot({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        transport:
          process.env['NODE_ENV'] === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          censor: '[REDACTED]',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    }),
    // RabbitMQ, Database, Job modules added in Milestone 5
  ],
  providers: [PrismaService, ReportProcessor, OutboxPublisher],
})
export class WorkerModule {}
