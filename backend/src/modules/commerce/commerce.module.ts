import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { AdminModule } from '../admin/admin.module';
import { CatalogModule } from '../catalog/catalog.module';
import { UsersModule } from '../users/users.module';
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
import { OrderLifecycleController } from './controllers/order-lifecycle.controller';
import { OrderEscrowService } from './services/order-escrow.service';
import { FeedbackController } from './controllers/feedback.controller';
import { ReviewsService } from './services/reviews.service';
import { ReportsService } from './services/reports.service';
import { AfterSalesController } from './controllers/after-sales.controller';
import { AfterSalesStoreService } from './services/after-sales-store.service';
import { OrderCancellationService } from './services/order-cancellation.service';
import { OrderReturnService } from './services/order-return.service';
import { RefundService } from './services/refund.service';

@Module({
  imports: [PrismaModule, FulfillmentModule, CatalogModule, AdminModule, UsersModule],
  controllers: [
    AfterSalesController,
    FeedbackController,
    CartController,
    OrderController,
    PayosWebhookController,
    SellerFinanceController,
    SellerOrdersController,
    SellerEngagementController,
    OrderLifecycleController,
  ],
  providers: [
    AfterSalesStoreService,
    OrderCancellationService,
    OrderReturnService,
    RefundService,
    ReviewsService,
    ReportsService,
    CartService,
    PayosService,
    OrderService,
    SellerFinanceService,
    SellerOrdersService,
    SellerEngagementService,
    OrderEscrowService,
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
