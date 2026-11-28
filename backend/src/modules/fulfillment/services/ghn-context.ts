import { BadRequestException } from '@nestjs/common';
import type { GhnEnvironment } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { objectValue } from './shipment-state';

/**
 * The carrier environment is a database enum; re-exported here so the
 * fulfillment module keeps importing it from one place.
 */
export type { GhnEnvironment } from '@prisma/client';

export function ghnEnvironment(config: ConfigService): GhnEnvironment {
  return (config.get<string>('GHN_API_URL') || '').includes('dev-online-gateway')
    ? 'SANDBOX'
    : 'PRODUCTION';
}

export function shipmentGhnContext(metadata: unknown): {
  shopId: number;
  environment: GhnEnvironment;
} {
  const data = objectValue(metadata);
  if (
    !Number.isSafeInteger(data.ghnShopId) ||
    Number(data.ghnShopId) <= 0 ||
    !['SANDBOX', 'PRODUCTION'].includes(String(data.ghnEnvironment))
  ) {
    throw new BadRequestException(
      'Shipment does not have a verified GHN shop yet. Reconcile legacy data before proceeding.',
    );
  }
  return { shopId: Number(data.ghnShopId), environment: data.ghnEnvironment as GhnEnvironment };
}
