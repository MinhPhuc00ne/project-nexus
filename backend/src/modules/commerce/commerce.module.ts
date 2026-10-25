import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { CartService } from './services/cart.service';
import { PayosService } from './services/payos.service';
import { OrderService } from './services/order.service';
import { SellerFinanceService } from './services/seller-finance.service';
import { SellerOrdersService } from './services/seller-orders.service';
import { SellerEngagementService } from './services/seller-engagement.service';
import { CartController } from './controllers/cart.controller';
import { OrderController } from './controllers/order.controller';
import { PayosWebhookController } from './controllers/payos-webhook.controller';
import { SellerFinanceController } from './controllers/seller-finance.controller';
import { SellerOrdersController } from './controllers/seller-orders.controller';
import { SellerEngagementController } from './controllers/seller-engagement.controller';

@Module({
  imports: [PrismaModule, FulfillmentModule],
  controllers: [
    CartController,
    OrderController,
    PayosWebhookController,
    SellerFinanceController,
    SellerOrdersController,
    SellerEngagementController,
  ],
  providers: [
    CartService,
    PayosService,
    OrderService,
    SellerFinanceService,
    SellerOrdersService,
    SellerEngagementService,
  ],
  exports: [
    CartService,
    PayosService,
    OrderService,
    SellerFinanceService,
    SellerOrdersService,
    SellerEngagementService,
  ],
})
export class CommerceModule {}
