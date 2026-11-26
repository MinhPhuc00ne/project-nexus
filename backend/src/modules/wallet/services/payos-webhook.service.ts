import { Injectable, Logger } from '@nestjs/common';
import { Webhook } from '@payos/node';
import { OrderService } from '../../orders/services/order.service';
import { PayosSettlement } from '../../payments/services/payos-settlement';
import { PayosService } from '../../payments/services/payos.service';
import { WalletDepositService } from './wallet-deposit.service';

/**
 * Hands a verified PayOS callback to whichever side of the platform owns it.
 *
 * PayOS sends the same callback for an order payment and for a wallet top-up,
 * and the only thing that tells them apart is which record carries the
 * orderCode. The order payment helper used to answer both: when no payment
 * matched it credited a wallet and settled auction deposits itself, so the code
 * that settles orders had reach into the wallet and into auctions.
 *
 * Here the signature is verified once and then offered to each owner in turn.
 * An owner that has no record for the orderCode returns null, which is how a
 * callback for something this platform has no record of is told apart from one
 * that was handled. Orders are asked first, as before.
 */
@Injectable()
export class PayosWebhookService {
  private readonly logger = new Logger(PayosWebhookService.name);

  constructor(
    private readonly payosService: PayosService,
    private readonly orders: OrderService,
    private readonly deposits: WalletDepositService,
  ) {}

  /**
   * Verifies a PayOS callback and settles it.
   *
   * @param body - The raw callback body, signature included.
   * @returns What the owner reported, or a not-found result when nobody claimed it.
   */
  async handle(body: Webhook): Promise<PayosSettlement> {
    const webhookData = await this.payosService.verifyWebhook(body);
    const { orderCode } = webhookData;

    const settledOrder = await this.orders.settleOrderPayment(webhookData);
    if (settledOrder) return settledOrder;

    const settledTopup = await this.deposits.settleTopup(webhookData);
    if (settledTopup) return settledTopup;

    this.logger.warn(
      `Không tìm thấy bản ghi Payment hoặc WalletTransaction cho PayOS orderCode=${orderCode}`,
    );
    return { success: false, message: 'Payment record not found' };
  }
}
