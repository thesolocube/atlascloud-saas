import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { RequestContext } from '../context/request-context';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  requestId?: string | undefined;
  timestamp: string;
}

/**
 * Global HTTP exception filter.
 *
 * Provides:
 * - Consistent error response structure.
 * - Safe error messages (no stack traces in production).
 * - Request ID in error responses for correlation.
 * - Structured logging with severity based on status code.
 */
@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@InjectPinoLogger(HttpExceptionFilter.name) private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = RequestContext.getRequestId();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        message = exResponse;
        error = exception.message;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const obj = exResponse as Record<string, unknown>;
        message = (obj['message'] as string | string[] | undefined) ?? exception.message;
        error = (obj['error'] as string | undefined) ?? HttpStatus[status] ?? 'Error';
      } else {
        message = exception.message;
        error = HttpStatus[status] ?? 'Error';
      }
    } else {
      // Unhandled error — log as error, return 500 without internal details
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred. Please try again later.';
      error = 'Internal Server Error';

      this.logger.error(
        { err: exception, requestId, method: req.method, url: req.url },
        'Unhandled exception',
      );
    }

    // Log 4xx as warn, 5xx as error
    if (status >= 500) {
      this.logger.error(
        { statusCode: status, requestId, method: req.method, url: req.url },
        typeof message === 'string' ? message : message.join(', '),
      );
    } else if (status >= 400) {
      this.logger.warn(
        { statusCode: status, requestId, method: req.method, url: req.url },
        typeof message === 'string' ? message : message.join(', '),
      );
    }

    const responseBody: ErrorResponse = {
      statusCode: status,
      error,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(responseBody);
  }
}
