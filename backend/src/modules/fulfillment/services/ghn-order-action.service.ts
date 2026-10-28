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
      throw new BadRequestException('Cấu hình hoặc vận đơn GHN không hợp lệ.');
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
          'GHN từ chối thao tác; cần kiểm tra trạng thái vận đơn.',
        );
      throw new BadGatewayException('GHN chưa xác nhận thao tác. Hãy đối soát trước khi thử lại.');
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Kết nối GHN gián đoạn. Chưa xác nhận hủy/chuyển hoàn.');
    }
  }
}
