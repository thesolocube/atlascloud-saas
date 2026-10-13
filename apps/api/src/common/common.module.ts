import { Module, Global } from '@nestjs/common';

import { HttpExceptionFilter } from './filters/http-exception.filter';
import { RequestIdInterceptor } from './interceptors/request-id.interceptor';

/**
 * Common module providing shared infrastructure:
 * - Request ID interceptor
 * - Global exception filter
 *
 * These are registered globally in main.ts but provided here for DI.
 */
@Global()
@Module({
  providers: [RequestIdInterceptor, HttpExceptionFilter],
  exports: [RequestIdInterceptor, HttpExceptionFilter],
})
export class CommonModule {}
