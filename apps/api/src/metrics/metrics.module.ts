import { Module, Global } from '@nestjs/common';
import { Registry, register } from 'prom-client';

import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  providers: [
    MetricsService,
    MetricsInterceptor,
    {
      provide: Registry,
      useValue: register,
    },
  ],
  controllers: [MetricsController],
  exports: [MetricsService, MetricsInterceptor, Registry],
})
export class MetricsModule {}
