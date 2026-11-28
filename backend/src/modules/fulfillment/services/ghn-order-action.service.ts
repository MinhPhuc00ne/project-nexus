import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { shipmentGhnContext, ghnEnvironment } from './ghn-context';
import { objectValue } from './shipment-state';

export class GhnActionRejectedException extends BadRequestException {}

@Injectable()
export class GhnOrderActionService {
  constructor(private readonly config: ConfigService) {}

  async change(
    action: 'cancel' | 'return',
    shipment: { waybillCode: string | null; metadata: unknown },
    reason?: string,
  ): Promise<void> {
    const context = shipmentGhnContext(shipment.metadata);
    const token = this.config.get<string>('GHN_TOKEN');
    if (!token || !shipment.waybillCode || context.environment !== ghnEnvironment(this.config))
      throw new BadRequestException('Invalid GHN configuration or waybill.');
    const base = (
      this.config.get<string>('GHN_API_URL') || 'https://online-gateway.ghn.vn/shiip/public-api/v2'
    ).replace(/\/$/, '');
    const root = base.endsWith('/v2') ? base : `${base}/v2`;
    try {
      const response = await fetch(`${root}/switch-status/${action}`, {
        method: 'POST',
        headers: {
          Token: token,
          ShopId: String(context.shopId),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_codes: [shipment.waybillCode],
          ...(action === 'cancel' ? { reason_code: 'GHN-CANCEL-OTHER', reason } : {}),
        }),
        signal: AbortSignal.timeout(10000),
      });
      const body = objectValue(await response.json());
      const item = Array.isArray(body.data)
        ? body.data.map(objectValue).find((entry) => entry.order_code === shipment.waybillCode)
        : undefined;
      if (response.ok && body.code === 200 && item?.result === true) return;
      if ((response.ok && item?.result === false) || response.status === 400)
        throw new GhnActionRejectedException(
          'GHN rejected the action; please verify waybill status.',
        );
      throw new BadGatewayException('GHN has not confirmed the action. Reconcile before retrying.');
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof BadGatewayException) throw error;
      throw new BadGatewayException(
        'GHN connection interrupted. Cancellation/return not confirmed.',
      );
    }
  }
}
