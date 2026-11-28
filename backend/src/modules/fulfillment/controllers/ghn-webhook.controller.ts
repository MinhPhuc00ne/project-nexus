import {
  Controller,
  Headers,
  HttpCode,
  Injectable,
  Optional,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ZodBody } from '@nexus/contracts/nest';
import { GhnWebhookSchema, type GhnWebhookPayload } from '../dtos/ghn-webhook.dto';
import { ConfigService } from '@nestjs/config';
import { ProviderConfigService } from '../../../core/providers/provider-config.service';
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
    private readonly providers: ProviderConfigService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Receive GHN webhook callbacks for forward and return shipments and re-verify status via GHN API',
  })
  async receive(
    @Headers('x-ghn-webhook-secret') secret: string | undefined,
    @ZodBody(GhnWebhookSchema) body: GhnWebhookPayload,
  ): Promise<{ success: boolean }> {
    const expected = this.config.get<string>('GHN_WEBHOOK_SECRET');
    if (!expected) throw new ServiceUnavailableException('GHN webhook is not configured.');
    if (
      !secret ||
      Buffer.byteLength(secret) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
    )
      throw new UnauthorizedException('Invalid GHN webhook secret.');
    // The payload shape is validated by GhnWebhookSchema before the handler
    // runs, so what is left to check is whether this waybill belongs to the
    // shop the caller claims.
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
    // A carrier callback is only trusted to carry a status when shipping is
    // explicitly in sandbox mode. This used to depend on NODE_ENV, so any
    // non-production deployment accepted a status straight from the caller.
    const isSandbox = this.providers.isShippingSandbox();
    const mockStatus =
      isSandbox && typeof body.Status === 'string' && body.Status.trim()
        ? body.Status.trim().toLowerCase()
        : undefined;

    if (!shipment) {
      return this.handleReturnWebhook(body.OrderCode, Number(body.ShopID), mockStatus);
    }

    const context = shipmentGhnContext(shipment.metadata);
    if (Number(body.ShopID) !== context.shopId)
      throw new UnauthorizedException('GHN shop does not match shipment.');
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
      throw new ServiceUnavailableException(
        'Waybill is not persisted yet; GHN should retry the callback.',
      );
    }

    const forwardShipment = afterSales.order.shipment;
    if (forwardShipment) {
      const context = shipmentGhnContext(forwardShipment.metadata);
      if (shopId !== context.shopId) {
        throw new UnauthorizedException('GHN shop does not match shipment.');
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
