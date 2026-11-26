import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PaymentProvider = 'payos' | 'sandbox';
export type ShippingProvider = 'ghn' | 'sandbox';
export type StorageProvider = 'cloudinary' | 'local';
export type MailProvider = 'smtp' | 'console';

/**
 * Reads which external provider each concern is configured to use.
 *
 * Services used to decide this for themselves by checking whether credentials
 * happened to be present, so a missing key silently swapped in a stub: email
 * went nowhere, uploads stayed on local disk, shipments were invented. The
 * choice is now named in the environment, validated at boot, and read from one
 * place, so a sandbox run is deliberate and production refuses to start on a
 * stub.
 */
@Injectable()
export class ProviderConfigService {
  constructor(private readonly configService: ConfigService) {}

  /** Which payment provider is in use. */
  payment(): PaymentProvider {
    return this.configService.get<PaymentProvider>('PAYMENT_PROVIDER') ?? 'sandbox';
  }

  /** Which carrier is in use. */
  shipping(): ShippingProvider {
    return this.configService.get<ShippingProvider>('SHIPPING_PROVIDER') ?? 'sandbox';
  }

  /** Where uploaded files are stored. */
  storage(): StorageProvider {
    return this.configService.get<StorageProvider>('STORAGE_PROVIDER') ?? 'local';
  }

  /** How mail is delivered. */
  mail(): MailProvider {
    return this.configService.get<MailProvider>('MAIL_PROVIDER') ?? 'console';
  }

  /** True when payments are simulated rather than charged. */
  isPaymentSandbox(): boolean {
    return this.payment() === 'sandbox';
  }

  /** True when shipments are simulated rather than booked with a carrier. */
  isShippingSandbox(): boolean {
    return this.shipping() === 'sandbox';
  }

  /** True when uploads are written to local disk rather than a CDN. */
  isLocalStorage(): boolean {
    return this.storage() === 'local';
  }

  /** True when mail is written to the log rather than sent. */
  isMailConsole(): boolean {
    return this.mail() === 'console';
  }
}
