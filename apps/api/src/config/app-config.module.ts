import { Module, Global } from '@nestjs/common';

import { AppConfigService } from './app-config.service';

/**
 * Global configuration module.
 * Making it global means AppConfigService is available everywhere
 * without re-importing this module.
 */
@Global()
@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
