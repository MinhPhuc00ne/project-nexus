import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CartService } from './services/cart.service';
import { PayosService } from './services/payos.service';
import { OrderService } from './services/order.service';
import { CartController } from './controllers/cart.controller';
import { OrderController } from './controllers/order.controller';
import { PayosWebhookController } from './controllers/payos-webhook.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CartController, OrderController, PayosWebhookController],
  providers: [CartService, PayosService, OrderService],
  exports: [CartService, PayosService, OrderService],
})
export class CommerceModule {}
