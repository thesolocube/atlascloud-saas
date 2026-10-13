import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { CommonModule } from './common/common.module';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    // ── Config must be first ─────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),
    AppConfigModule,

    // ── Structured logging (Pino) ────────────────────────────────────────────
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        pinoHttp: {
          level: config.logLevel,
          transport: config.isDevelopment
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: false } }
            : undefined,
          // Redact sensitive fields from logs
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.passwordHash',
              'req.body.refreshToken',
              'req.body.accessToken',
              'res.headers["set-cookie"]',
            ],
            censor: '[REDACTED]',
          },
          serializers: {
            req: (req: { method: string; url: string; id: string }) => ({
              method: req.method,
              url: req.url,
              id: req.id,
            }),
          },
          // Auto-assign request ID from X-Request-Id header or generate one
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
          genReqId: (req: any) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
            req.headers['x-request-id'] ?? crypto.randomUUID(),
          customLogLevel: (_req: unknown, res: { statusCode: number }, err: unknown) => {
            if (res.statusCode >= 500 || err) {
              return 'error';
            }
            if (res.statusCode >= 400) {
              return 'warn';
            }
            return 'info';
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }),
    }),

    // ── Rate limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            name: 'global',
            ttl: config.throttleTtl,
            limit: config.throttleLimit,
          },
        ],
      }),
    }),

    // ── Core modules ─────────────────────────────────────────────────────────
    CommonModule,
    DatabaseModule,
    HealthModule,
    MetricsModule,
  ],
})
export class AppModule {}
