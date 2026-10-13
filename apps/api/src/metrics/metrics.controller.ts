import { Controller, Get, Header, VERSION_NEUTRAL, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Registry } from 'prom-client';

import { RequestContext } from '../common/context/request-context';
import { Public } from '../common/decorators/public.decorator';
import { AppConfigService } from '../config/app-config.service';

/**
 * Exposes Prometheus metrics at /metrics.
 *
 * In production, this endpoint MUST be protected.
 * Options:
 *  1. Network-level restriction (preferred for internal scraping)
 *  2. Bearer token check (implemented here as a simple guard)
 *  3. Separate metrics port (add a second HTTP adapter)
 */
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(
    private readonly registry: Registry,
    private readonly config: AppConfigService,
  ) {}

  @Get()
  @Public()
  @ApiExcludeEndpoint()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    // Token-based protection — in production use network policy or a sidecar
    const ctx = RequestContext.current();
    const authHeader = ctx?.request?.headers?.authorization;
    const token = authHeader?.replace('Bearer ', '');

    // Skip auth check in development for convenience
    if (!this.config.isDevelopment && token !== this.config.metricsToken) {
      throw new UnauthorizedException('Metrics access requires a valid token');
    }

    return this.registry.metrics();
  }
}
