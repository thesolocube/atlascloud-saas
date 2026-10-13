import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  PrismaHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';

import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Liveness probe — returns 200 if the process is alive.
   * Kubernetes: use as livenessProbe.
   * Does NOT check external dependencies — a failing DB should not kill pods.
   */
  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe — is the process alive?' })
  live(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness probe — returns 200 only if all dependencies are healthy.
   * Kubernetes: use as readinessProbe.
   * Returns 503 with details if any dependency is down.
   */
  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — are all dependencies ready?' })
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        this.prismaIndicator.pingCheck('database', this.prisma),
    ]);
  }
}
