import { Global, Module } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';

/**
 * Publishes platform configuration to every module.
 *
 * It is global because a setting such as the platform fee is read by escrow,
 * seller finance, checkout and the admin console alike; routing those reads
 * through the admin module is what made commerce depend on admin.
 */
@Global()
@Module({
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class SettingsModule {}
