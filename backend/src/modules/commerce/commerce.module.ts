import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CartService } from './services/cart.service';
import { PayosService } from './services/payos.service';
import { OrderService } from './services/order.service';
import { SellerFinanceService } from './services/seller-finance.service';
import { CartController } from './controllers/cart.controller';
import { OrderController } from './controllers/order.controller';
import { PayosWebhookController } from './controllers/payos-webhook.controller';
import { SellerFinanceController } from './controllers/seller-finance.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CartController, OrderController, PayosWebhookController, SellerFinanceController],
  providers: [CartService, PayosService, OrderService, SellerFinanceService],
  exports: [CartService, PayosService, OrderService, SellerFinanceService],
})
export class CommerceModule {}
