import { Module } from '@nestjs/common';
import { ShopShippingProfileService } from './services/shop-shipping-profile.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { RouteDistanceService } from './services/route-distance.service';
import { GhnShippingService } from './services/ghn-shipping.service';
import { GhnLogisticsService } from './services/ghn-logistics.service';
import { FulfillmentService } from './services/fulfillment.service';
import { FulfillmentController } from './controllers/fulfillment.controller';
import { GhnDispatchService } from './services/ghn-dispatch.service';
import { GhnOrderApiService } from './services/ghn-order-api.service';
import { GhnOrderActionService } from './services/ghn-order-action.service';
import { ShipmentTrackingService } from './services/shipment-tracking.service';
import { GhnWebhookController } from './controllers/ghn-webhook.controller';
import { SellerPickupService } from './services/seller-pickup.service';
import { GhnShopApiService } from './services/ghn-shop-api.service';
import {
  SellerPickupController,
  AdminPickupController,
} from './controllers/seller-pickup.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    FulfillmentController,
    GhnWebhookController,
    SellerPickupController,
    AdminPickupController,
  ],
  providers: [
    ShopShippingProfileService,
    GhnOrderActionService,
    RouteDistanceService,
    GhnLogisticsService,
    GhnShippingService,
    FulfillmentService,
    GhnDispatchService,
    GhnOrderApiService,
    ShipmentTrackingService,
    SellerPickupService,
    GhnShopApiService,
  ],
  exports: [
    SellerPickupService,
    ShopShippingProfileService,
    GhnOrderActionService,
    GhnOrderApiService,
    GhnLogisticsService,
    GhnShippingService,
    FulfillmentService,
    GhnDispatchService,
    ShipmentTrackingService,
  ],
})
export class FulfillmentModule {}
