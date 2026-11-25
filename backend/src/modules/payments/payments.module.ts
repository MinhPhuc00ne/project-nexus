import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentSandboxService } from './services/payment-sandbox.service';
import { PayosService } from './services/payos.service';

/**
 * The PayOS client and its sandbox stand-in.
 *
 * Orders and wallet top-ups both take money through PayOS, so while this lived
 * inside `commerce` neither could be separated from the other. It talks to the
 * gateway and to nothing else in the platform, which makes it a leaf every
 * money-handling module can depend on.
 */
@Module({
  imports: [ConfigModule],
  providers: [PayosService, PaymentSandboxService],
  exports: [PayosService],
})
export class PaymentsModule {}
