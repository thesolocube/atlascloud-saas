import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';

import { AppModule } from '../src/app.module';

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
describe('AtlasCloud E2E Integration Suite', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [
        'health',
        'health/(.*)',
        'metrics',
        'dashboard',
        'dashboard/(.*)',
        'login',
        'login/(.*)',
        '',
      ],
    });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Initialise app without binding port
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Checks', () => {
    it('/health/live (GET) - Process liveness', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('Authentication Flow', () => {
    it('POST /api/v1/auth/register - Rejects invalid registration payload', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
        })
        .expect(400);
    });

    it('POST /api/v1/auth/login - Rejects invalid credentials format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: '',
        })
        .expect(400);
    });
  });

  describe('Tenant Isolation & Unauthenticated Protection', () => {
    it('GET /api/v1/organizations - Rejects unauthenticated access', () => {
      return request(app.getHttpServer()).get('/api/v1/organizations').expect(401);
    });

    it('GET /api/v1/organizations/:id/projects - Rejects unauthenticated tenant requests', () => {
      return request(app.getHttpServer())
        .get('/api/v1/organizations/00000000-0000-0000-0000-000000000000/projects')
        .expect(401);
    });

    it('POST /api/v1/organizations/:id/jobs - Rejects unauthenticated job submissions', () => {
      return request(app.getHttpServer())
        .post('/api/v1/organizations/00000000-0000-0000-0000-000000000000/jobs')
        .send({
          type: 'PROJECT_REPORT',
          payload: {},
        })
        .expect(401);
    });
  });
});
