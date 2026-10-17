import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const logger = app.get(Logger);

  // Worker is a hybrid app — it doesn't listen on HTTP by default.
  // An optional HTTP server on port 3002 (or WORKER_PORT) is available for health/metrics.
  const workerPort = process.env.WORKER_PORT ? parseInt(process.env.WORKER_PORT, 10) : 3002;
  await app.listen(workerPort);

  // Graceful shutdown handlers
  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal}, shutting down gracefully...`, 'Worker');
    await app.close();
    logger.log('Worker shutdown complete', 'Worker');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  logger.log('AtlasCloud Worker started', 'Worker');
}

void bootstrap();
