import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { AdminModule } from '../admin/admin.module';
import { CatalogModule } from '../catalog/catalog.module';
import { UsersModule } from '../users/users.module';
import { MediaModule } from '../media/media.module';
import { PayosService } from './services/payos.service';
import { PaymentSandboxService } from './services/payment-sandbox.service';
import { OrderService } from './services/order.service';
import { SellerFinanceService } from './services/seller-finance.service';
import { WithdrawalService } from './services/withdrawal.service';
import { SellerOrdersService } from './services/seller-orders.service';
import { SellerEngagementService } from './services/seller-engagement.service';
import { BuyerFinanceController } from './controllers/buyer-finance.controller';
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
import { ReportModerationController } from './controllers/report-moderation.controller';
import { ReportModerationService } from './services/report-moderation.service';
import { AuctionCheckoutController } from './controllers/auction-checkout.controller';
import { AuctionCheckoutService } from './services/auction-checkout.service';
import { AuctionSecondChanceHelper } from './services/auction-second-chance.helper';
import { OrderPaymentHelper } from './services/order-payment.helper';
import { OrderWalletHelper } from './services/order-wallet.helper';
import { ReviewsModerationHelper } from './services/reviews-moderation.helper';
import { ReviewsRepliesHelper } from './services/reviews-replies.helper';

@Module({
  imports: [PrismaModule, FulfillmentModule, CatalogModule, AdminModule, UsersModule, MediaModule],
  controllers: [
    AuctionCheckoutController,
    ReportModerationController,
    AfterSalesController,
    FeedbackController,
    OrderController,
    PayosWebhookController,
    BuyerFinanceController,
    SellerFinanceController,
    SellerOrdersController,
    SellerEngagementController,
    OrderLifecycleController,
  ],
  providers: [
    AuctionSecondChanceHelper,
    OrderPaymentHelper,
    OrderWalletHelper,
    ReviewsModerationHelper,
    ReviewsRepliesHelper,
    AuctionCheckoutService,
    ReportModerationService,
    AfterSalesStoreService,
    OrderCancellationService,
    OrderReturnService,
    RefundService,
    ReviewsService,
    ReportsService,
    PayosService,
    PaymentSandboxService,
    OrderService,
    SellerFinanceService,
    WithdrawalService,
    SellerOrdersService,
    SellerEngagementService,
    OrderEscrowService,
  ],
  exports: [
    AuctionCheckoutService,
    PayosService,
    OrderService,
    SellerFinanceService,
    WithdrawalService,
    SellerOrdersService,
    SellerEngagementService,
  ],
})
export class CommerceModule {}
