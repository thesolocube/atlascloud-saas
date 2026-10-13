import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Typed, validated configuration service.
 * Reads environment variables and provides typed accessors.
 * All required variables are validated at startup — the app will NOT start
 * if a required variable is missing.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  // ── Application ─────────────────────────────────────────────────────────────
  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.configService.get<number>('API_PORT', 3000);
  }

  get host(): string {
    return this.configService.get<string>('API_HOST', '0.0.0.0');
  }

  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'info');
  }

  // ── Database ────────────────────────────────────────────────────────────────
  get databaseUrl(): string {
    return this.required('DATABASE_URL');
  }

  get databaseDirectUrl(): string {
    return this.configService.get<string>('DATABASE_DIRECT_URL', this.databaseUrl);
  }

  // ── JWT ─────────────────────────────────────────────────────────────────────
  get jwtAccessSecret(): string {
    return this.required('JWT_ACCESS_SECRET');
  }

  get jwtRefreshSecret(): string {
    return this.required('JWT_REFRESH_SECRET');
  }

  get jwtAccessExpiresIn(): string {
    return this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  // ── Redis ───────────────────────────────────────────────────────────────────
  get redisHost(): string {
    return this.configService.get<string>('REDIS_HOST', 'localhost');
  }

  get redisPort(): number {
    return this.configService.get<number>('REDIS_PORT', 6379);
  }

  get redisPassword(): string | undefined {
    return this.configService.get<string>('REDIS_PASSWORD');
  }

  get redisDb(): number {
    return this.configService.get<number>('REDIS_DB', 0);
  }

  get redisCacheTtl(): number {
    return this.configService.get<number>('REDIS_CACHE_TTL', 300);
  }

  // ── RabbitMQ ────────────────────────────────────────────────────────────────
  get rabbitmqUrl(): string {
    return this.required('RABBITMQ_URL');
  }

  // ── Security ────────────────────────────────────────────────────────────────
  get corsOrigins(): string[] {
    const raw = this.configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
    return raw.split(',').map((o) => o.trim());
  }

  get metricsToken(): string {
    return this.required('METRICS_TOKEN');
  }

  // ── Rate limiting ───────────────────────────────────────────────────────────
  /** TTL window in milliseconds */
  get throttleTtl(): number {
    return this.configService.get<number>('THROTTLE_TTL_MS', 60_000);
  }

  /** Max requests per TTL window */
  get throttleLimit(): number {
    return this.configService.get<number>('THROTTLE_LIMIT', 100);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private required(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set.`);
    }
    return value;
  }
}
