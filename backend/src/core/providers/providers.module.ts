import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProviderConfigService } from './provider-config.service';

/**
 * Publishes the external provider selection to every module that talks to the
 * outside world: payments, shipping, storage and mail.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [ProviderConfigService],
  exports: [ProviderConfigService],
})
export class ProvidersModule {}
