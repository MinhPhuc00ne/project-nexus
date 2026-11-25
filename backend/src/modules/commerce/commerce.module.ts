import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { AdminModule } from '../admin/admin.module';
import { CatalogModule } from '../catalog/catalog.module';
import { UsersModule } from '../users/users.module';
import { PayosService } from './services/payos.service';
import { PaymentSandboxService } from './services/payment-sandbox.service';
import { OrderService } from './services/order.service';
import { SellerFinanceService } from './services/seller-finance.service';
import { WithdrawalService } from './services/withdrawal.service';
import { SellerOrdersService } from './services/seller-orders.service';
import { BuyerFinanceController } from './controllers/buyer-finance.controller';
import { OrderController } from './controllers/order.controller';
import { PayosWebhookController } from './controllers/payos-webhook.controller';
import { SellerFinanceController } from './controllers/seller-finance.controller';
import { SellerOrdersController } from './controllers/seller-orders.controller';
import { OrderLifecycleController } from './controllers/order-lifecycle.controller';
import { OrderEscrowService } from './services/order-escrow.service';
import { AfterSalesController } from './controllers/after-sales.controller';
import { AfterSalesStoreService } from './services/after-sales-store.service';
import { OrderCancellationService } from './services/order-cancellation.service';
import { OrderReturnService } from './services/order-return.service';
import { RefundService } from './services/refund.service';
import { AuctionCheckoutController } from './controllers/auction-checkout.controller';
import { AuctionCheckoutService } from './services/auction-checkout.service';
import { AuctionSecondChanceHelper } from './services/auction-second-chance.helper';
import { OrderPaymentHelper } from './services/order-payment.helper';
import { OrderWalletHelper } from './services/order-wallet.helper';

@Module({
  imports: [PrismaModule, FulfillmentModule, CatalogModule, AdminModule, UsersModule],
  controllers: [
    AuctionCheckoutController,
    AfterSalesController,
    OrderController,
    PayosWebhookController,
    BuyerFinanceController,
    SellerFinanceController,
    SellerOrdersController,
    OrderLifecycleController,
  ],
  providers: [
    AuctionSecondChanceHelper,
    OrderPaymentHelper,
    OrderWalletHelper,
    AuctionCheckoutService,
    AfterSalesStoreService,
    OrderCancellationService,
    OrderReturnService,
    RefundService,
    PayosService,
    PaymentSandboxService,
    OrderService,
    SellerFinanceService,
    WithdrawalService,
    SellerOrdersService,
    OrderEscrowService,
  ],
  exports: [
    AuctionCheckoutService,
    PayosService,
    OrderService,
    SellerFinanceService,
    WithdrawalService,
    SellerOrdersService,
  ],
})
export class CommerceModule {}
