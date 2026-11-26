import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuctionModule } from '../auction/auction.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { BuyerFinanceController } from './controllers/buyer-finance.controller';
import { PayosWebhookController } from './controllers/payos-webhook.controller';
import { SellerFinanceController } from './controllers/seller-finance.controller';
import { WalletController } from './controllers/wallet.controller';
import { PayosWebhookService } from './services/payos-webhook.service';
import { SellerFinanceService } from './services/seller-finance.service';
import { WalletDepositService } from './services/wallet-deposit.service';
import { WithdrawalService } from './services/withdrawal.service';

/**
 * Money that belongs to a person rather than to an order: balances, top-ups,
 * withdrawals and the revenue a seller can draw on.
 *
 * It depends on checkout, because a PayOS callback has to be offered to orders
 * before the wallet can claim it as a top-up, and because settling a top-up
 * settles any auction deposit the money was owed to. Checkout does not depend
 * on the wallet: the three wallet routes it used to expose, and the top-up
 * branch buried in its payment helper, are here now.
 */
@Module({
  imports: [PrismaModule, PaymentsModule, OrdersModule, AuctionModule],
  controllers: [
    WalletController,
    BuyerFinanceController,
    SellerFinanceController,
    PayosWebhookController,
  ],
  providers: [WalletDepositService, WithdrawalService, SellerFinanceService, PayosWebhookService],
  exports: [WalletDepositService, WithdrawalService, SellerFinanceService],
})
export class WalletModule {}
