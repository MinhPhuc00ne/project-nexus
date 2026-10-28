import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Injectable,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Public } from '../../../core/security/roles.decorator';
import { ShipmentTrackingService } from '../services/shipment-tracking.service';
import { shipmentGhnContext, ghnEnvironment } from '../services/ghn-context';

@Injectable()
@ApiTags('10. FULFILLMENT & SHIPPING')
@Controller('fulfillment/shipping')
export class GhnWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tracking: ShipmentTrackingService,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Nhận callback GHN; xác minh lại trạng thái qua API GHN' })
  async receive(
    @Headers('x-ghn-webhook-secret') secret: string | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    const expected = this.config.get<string>('GHN_WEBHOOK_SECRET');
    if (!expected) throw new ServiceUnavailableException('Webhook GHN chưa được cấu hình.');
    if (
      !secret ||
      Buffer.byteLength(secret) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
    )
      throw new UnauthorizedException('Webhook GHN không hợp lệ.');
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Payload GHN không hợp lệ.');
    }
    if (
      !Number.isSafeInteger(body.ShopID) ||
      Number(body.ShopID) <= 0 ||
      typeof body.OrderCode !== 'string' ||
      !body.OrderCode.trim()
    )
      throw new UnauthorizedException('Shop hoặc mã vận đơn không hợp lệ.');
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        carrier: 'GHN',
        waybillCode: body.OrderCode,
        AND: [
          { metadata: { path: ['ghnShopId'], equals: Number(body.ShopID) } },
          { metadata: { path: ['ghnEnvironment'], equals: ghnEnvironment(this.config) } },
        ],
      },
    });
    if (!shipment)
      throw new ServiceUnavailableException('Vận đơn chưa được lưu, GHN cần gửi lại callback.');
    const context = shipmentGhnContext(shipment.metadata);
    if (Number(body.ShopID) !== context.shopId)
      throw new UnauthorizedException('Shop GHN không khớp vận đơn.');
    // Never use the callback's status or amounts to change business state directly.
    await this.tracking.refresh(shipment.orderId);
    return { success: true };
  }
}
