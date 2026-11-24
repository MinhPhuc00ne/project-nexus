import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Injectable,
  Optional,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { timingSafeEqual } from 'node:crypto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Public } from '../../../core/security/roles.decorator';
import { ShipmentTrackingService } from '../services/shipment-tracking.service';
import { shipmentGhnContext, ghnEnvironment } from '../services/ghn-context';
import { objectValue } from '../services/shipment-state';

@Injectable()
@ApiTags('10. FULFILLMENT & SHIPPING')
@Controller('fulfillment/shipping')
export class GhnWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tracking: ShipmentTrackingService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
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
    // Never use callback status directly in production; allow simulation in dev mode.
    const isDev = this.config.get<string>('NODE_ENV') !== 'production';
    const mockStatus =
      isDev && typeof body.Status === 'string' && body.Status.trim()
        ? body.Status.trim().toLowerCase()
        : undefined;

    if (!shipment) {
      return this.handleReturnWebhook(body.OrderCode, Number(body.ShopID), mockStatus);
    }

    const context = shipmentGhnContext(shipment.metadata);
    if (Number(body.ShopID) !== context.shopId)
      throw new UnauthorizedException('Shop GHN không khớp vận đơn.');
    await this.tracking.refresh(shipment.orderId, undefined, mockStatus);
    return { success: true };
  }

  private async handleReturnWebhook(
    orderCode: string,
    shopId: number,
    mockStatus?: string,
  ): Promise<{ success: boolean }> {
    const afterSales = this.prisma.afterSalesRequest?.findFirst
      ? await this.prisma.afterSalesRequest.findFirst({
          where: { returnWaybillCode: orderCode, kind: 'RETURN' },
          include: { order: { include: { shipment: true } } },
        })
      : null;
    if (!afterSales) {
      throw new ServiceUnavailableException('Vận đơn chưa được lưu, GHN cần gửi lại callback.');
    }

    const forwardShipment = afterSales.order.shipment;
    if (forwardShipment) {
      const context = shipmentGhnContext(forwardShipment.metadata);
      if (shopId !== context.shopId) {
        throw new UnauthorizedException('Shop GHN không khớp vận đơn.');
      }
    }

    if (this.prisma.eventLog?.create) {
      await this.prisma.eventLog.create({
        data: {
          eventName: 'order.return-shipment-updated',
          payload: {
            orderId: afterSales.orderId,
            returnWaybillCode: orderCode,
            carrierStatus: mockStatus ?? 'synced',
            previousStatus: afterSales.status,
          },
        },
      });
    }

    if (mockStatus === 'delivered' || mockStatus === 'returned') {
      if (forwardShipment) {
        const meta = objectValue(forwardShipment.metadata);
        const tracking = objectValue(meta.tracking);
        await this.prisma.shipment.update({
          where: { orderId: afterSales.orderId },
          data: {
            status: 'RETURNED',
            metadata: {
              ...meta,
              tracking: { ...tracking, status: 'returned', syncedAt: new Date().toISOString() },
            } as Prisma.InputJsonValue,
          },
        });
      }
      this.eventEmitter?.emit('return.shipment.delivered', {
        orderId: afterSales.orderId,
        returnWaybillCode: orderCode,
        sellerId: afterSales.order.sellerId,
      });
    }

    return { success: true };
  }
}
