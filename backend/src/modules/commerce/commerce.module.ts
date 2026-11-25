import { Module } from '@nestjs/common';
import { AfterSalesModule } from '../after-sales/after-sales.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { AdminModule } from '../admin/admin.module';
import { CatalogModule } from '../catalog/catalog.module';
import { UsersModule } from '../users/users.module';
import { OrderService } from './services/order.service';
import { SellerOrdersService } from './services/seller-orders.service';
import { OrderController } from './controllers/order.controller';
import { SellerOrdersController } from './controllers/seller-orders.controller';
import { OrderLifecycleController } from './controllers/order-lifecycle.controller';
import { OrderEscrowService } from './services/order-escrow.service';
import { AuctionCheckoutController } from './controllers/auction-checkout.controller';
import { AuctionCheckoutService } from './services/auction-checkout.service';
import { AuctionSecondChanceHelper } from './services/auction-second-chance.helper';
import { OrderPaymentHelper } from './services/order-payment.helper';

@Module({
  imports: [
    PrismaModule,
    PaymentsModule,
    AfterSalesModule,
    FulfillmentModule,
    CatalogModule,
    AdminModule,
    UsersModule,
  ],
  controllers: [
    AuctionCheckoutController,
    OrderController,
    SellerOrdersController,
    OrderLifecycleController,
  ],
  providers: [
    AuctionSecondChanceHelper,
    OrderPaymentHelper,
    AuctionCheckoutService,
    OrderService,
    SellerOrdersService,
    OrderEscrowService,
  ],
  exports: [AuctionCheckoutService, OrderService, SellerOrdersService],
})
export class CommerceModule {}
