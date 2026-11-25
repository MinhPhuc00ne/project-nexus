import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { CatalogModule } from '../catalog/catalog.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { UsersModule } from '../users/users.module';
import { AfterSalesController } from './controllers/after-sales.controller';
import { AfterSalesStoreService } from './services/after-sales-store.service';
import { OrderCancellationService } from './services/order-cancellation.service';
import { OrderReturnService } from './services/order-return.service';
import { RefundService } from './services/refund.service';

/**
 * What happens to an order after it was paid for: cancellations, returns and
 * the refunds both produce.
 *
 * Checkout needs this module, because a payment that arrives after the buyer
 * cancelled is money owed back; this module does not need checkout. Keeping
 * them in one module hid that one-way relationship, and left the code that
 * takes money and the code that gives it back free to call each other.
 */
@Module({
  imports: [PrismaModule, FulfillmentModule, CatalogModule, AdminModule, UsersModule],
  controllers: [AfterSalesController],
  providers: [AfterSalesStoreService, OrderCancellationService, OrderReturnService, RefundService],
  exports: [RefundService],
})
export class AfterSalesModule {}
