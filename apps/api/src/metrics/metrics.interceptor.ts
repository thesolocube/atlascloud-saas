import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';

import { MetricsService } from './metrics.service';

/**
 * HTTP metrics interceptor.
 * Records request count, latency, and active request gauge for every request.
 * Applied globally via AppModule.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    this.metrics.httpActiveRequests.inc();

    return next.handle().pipe(
      finalize(() => {
        const duration = (Date.now() - startTime) / 1000;
        const route = (req.route as { path?: string } | undefined)?.path ?? req.path;
        const method = req.method;
        const statusCode = String(res.statusCode);

        this.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode });
        this.metrics.httpRequestDurationSeconds.observe(
          { method, route, status_code: statusCode },
          duration,
        );
        this.metrics.httpActiveRequests.dec();
      }),
      tap({
        error: () => {
          /* Error metrics tracked via status code above */
        },
      }),
    );
  }
}
