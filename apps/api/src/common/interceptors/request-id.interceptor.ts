import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

import { RequestContext } from '../context/request-context';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Intercepts every request to:
 * 1. Read or generate a request ID (X-Request-Id header).
 * 2. Set the request ID on the response.
 * 3. Initialize the AsyncLocalStorage request context.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const requestId = (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? crypto.randomUUID();

    // Attach to request for Pino logger
    (req as Request & { id?: string }).id = requestId;

    // Return the request ID to the caller
    res.setHeader(REQUEST_ID_HEADER, requestId);

    return new Observable((subscriber) => {
      RequestContext.run({ requestId, request: req }, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err: unknown) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
