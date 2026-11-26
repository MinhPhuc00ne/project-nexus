import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CartController } from './controllers/cart.controller';
import { CartService } from './services/cart.service';

/**
 * The shopping cart.
 *
 * The cart sat inside `commerce` beside orders, payments, refunds and reviews,
 * so a change to how a cart line is priced was a change to the module that also
 * settles money. It depends on nothing but the database and the pricing rules in
 * `core/domain`, which is why it comes out first and stays a leaf: checkout
 * reads a cart, but a cart knows nothing about orders.
 */
@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
