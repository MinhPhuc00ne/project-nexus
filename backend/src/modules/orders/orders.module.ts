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
import { OrderPaymentHelper } from './services/order-payment.helper';

/**
 * Checkout and the life of an order: quoting it, paying for it, holding the
 * money in escrow and the seller's view of what to pack.
 *
 * It was called `commerce` and held 11.6k lines — the cart, reviews, reports,
 * wallets, withdrawals, refunds, returns and auction checkout as well — so
 * "commerce" had stopped naming anything in particular. Each of those is now
 * its own module and this is what was left, which is orders.
 *
 * It publishes `OrderService` for the wallet to offer PayOS callbacks to,
 * `OrderEscrowService` for auction checkout to hold a deposit through, and
 * `SellerOrdersService` for fulfilment. It imports after-sales rather than the
 * other way round: a transfer clearing after a cancellation is money owed back.
 */
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
  controllers: [OrderController, SellerOrdersController, OrderLifecycleController],
  providers: [OrderPaymentHelper, OrderService, SellerOrdersService, OrderEscrowService],
  exports: [OrderService, OrderEscrowService, SellerOrdersService],
})
export class OrdersModule {}
