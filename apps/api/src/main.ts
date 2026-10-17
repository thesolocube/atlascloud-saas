import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Disable default logger — nestjs-pino takes over
    bufferLogs: true,
  });

  // ── Structured logging (Pino) ──────────────────────────────────────────────
  app.useLogger(app.get(Logger));
  const logger = app.get(Logger);

  // ── Config ─────────────────────────────────────────────────────────────────
  const config = app.get(AppConfigService);

  // ── Security headers (Helmet) ──────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: config.isDevelopment
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              scriptSrc: ["'self'"],
            },
          },
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────────────
  const allowedOrigins = config.corsOrigins;
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });

  // ── Global prefix and versioning ───────────────────────────────────────────
  app.setGlobalPrefix('api', {
    exclude: ['dashboard', 'dashboard/(.*)', 'login', 'login/(.*)', ''],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Global pipes (validation) ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties (mass-assignment protection)
      forbidNonWhitelisted: true, // Reject requests with unknown properties
      transform: true, // Auto-transform payloads to DTO class instances
      transformOptions: {
        enableImplicitConversion: false, // Require explicit type decorators
      },
    }),
  );

  // ── Global interceptors ────────────────────────────────────────────────────
  app.useGlobalInterceptors(app.get(RequestIdInterceptor));

  // ── Global exception filters ───────────────────────────────────────────────
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  // ── Request body size limit ────────────────────────────────────────────────
  // Done via express body-parser settings in AppModule

  // ── OpenAPI / Swagger ──────────────────────────────────────────────────────
  if (config.isDevelopment) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AtlasCloud API')
      .setDescription(
        'Cloud-native multi-tenant SaaS platform API. ' +
          'See /api/v1/health/live for liveness and /api/v1/health/ready for readiness.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token',
      )
      .addTag('auth', 'Authentication and session management')
      .addTag('organizations', 'Organization management')
      .addTag('members', 'Organization membership management')
      .addTag('projects', 'Project management within an organization')
      .addTag('jobs', 'Asynchronous job submission and tracking')
      .addTag('audit', 'Audit log access')
      .addTag('platform', 'Platform administration (restricted)')
      .addTag('health', 'Health and readiness checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // ── Start server ───────────────────────────────────────────────────────────
  const port = config.port;
  const host = config.host;
  await app.listen(port, host);

  logger.log(`AtlasCloud API started on http://${host}:${port}/api/v1`, 'Bootstrap');
  if (config.isDevelopment) {
    logger.log(`Swagger UI: http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}

void bootstrap();
