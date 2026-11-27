import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type {
  ConfirmWebhookResponse,
  CreatePaymentLinkRequest,
  CreatePaymentLinkResponse,
  PaymentLink,
  Webhook,
  WebhookData,
} from '@payos/node';
import { resolveAppPublicUrl } from '../../../core/config/env.schema';

/**
 * Stands in for PayOS when `PAYMENT_PROVIDER=sandbox`.
 *
 * It exists so somebody can run the whole checkout, wallet top-up and auction
 * deposit flow end to end without a PayOS merchant account. Everything it
 * returns is derived deterministically from the order code, so a run is
 * reproducible, and the environment schema refuses to let production select it.
 *
 * It does not pretend to be secure: a sandbox webhook is accepted on the shape
 * of its payload rather than a merchant signature, because there is no shared
 * secret to sign with. That is exactly why production cannot choose it.
 */
@Injectable()
export class PaymentSandboxService {
  private readonly logger = new Logger(PaymentSandboxService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Issues a simulated payment link.
   *
   * @param paymentData - The same request PayOS would receive.
   * @returns A response shaped like PayOS's, pointing at the sandbox checkout page.
   */
  createPaymentLink(paymentData: CreatePaymentLinkRequest): CreatePaymentLinkResponse {
    const baseUrl = resolveAppPublicUrl({
      APP_PUBLIC_URL: this.configService.get<string>('APP_PUBLIC_URL'),
      APP_ENV: this.configService.get<string>('APP_ENV') ?? process.env.APP_ENV,
      NODE_ENV: this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV,
      PORT: this.configService.get<number | string>('PORT') ?? process.env.PORT,
      PORT_BACKEND: this.configService.get<number | string>('PORT_BACKEND'),
    });
    const paymentLinkId = this.linkId(paymentData.orderCode);

    this.logger.log(
      `[payment:sandbox] simulated link for orderCode=${paymentData.orderCode} amount=${paymentData.amount}`,
    );

    return {
      bin: '970422',
      accountNumber: '0000000000',
      accountName: 'NEXUS SANDBOX',
      amount: paymentData.amount,
      description: paymentData.description,
      orderCode: paymentData.orderCode,
      currency: 'VND',
      paymentLinkId,
      status: 'PENDING',
      checkoutUrl: `${baseUrl}/api/v1/commerce/payments/sandbox/${paymentData.orderCode}`,
      qrCode: `SANDBOX|${paymentData.orderCode}|${paymentData.amount}`,
    };
  }

  /**
   * Accepts a simulated webhook.
   *
   * @param webhookBody - The posted body.
   * @returns The webhook data the caller would have received from PayOS.
   * @throws BadRequestException when the body carries no usable data.
   */
  verifyWebhook(webhookBody: Webhook): WebhookData {
    const data = webhookBody?.data;
    if (!data || typeof data.orderCode !== 'number') {
      throw new BadRequestException('Webhook sandbox thiếu dữ liệu orderCode.');
    }
    this.logger.warn(
      `[payment:sandbox] accepting unsigned webhook for orderCode=${data.orderCode}`,
    );
    return data;
  }

  /**
   * Reports a simulated payment as settled.
   *
   * The sandbox checkout page completes immediately, so reconciliation sees a
   * paid link. This is what lets a demo walk an order from pending payment all
   * the way to delivery.
   *
   * @param orderCodeOrId - The order code or payment link id.
   * @param amount - The amount to report as paid, when the caller knows it.
   * @returns A payment link shaped like PayOS's, marked PAID.
   */
  getPaymentLink(orderCodeOrId: number | string, amount = 0): PaymentLink {
    const orderCode = typeof orderCodeOrId === 'number' ? orderCodeOrId : 0;
    const now = new Date().toISOString();
    return {
      id: this.linkId(orderCode),
      orderCode,
      amount,
      amountPaid: amount,
      amountRemaining: 0,
      status: 'PAID',
      createdAt: now,
      transactions: [
        {
          reference: `SANDBOX-${orderCode}`,
          amount,
          accountNumber: '0000000000',
          description: `Sandbox payment ${orderCode}`,
          transactionDateTime: now,
          virtualAccountName: null,
          virtualAccountNumber: null,
          counterAccountBankId: null,
          counterAccountBankName: null,
          counterAccountName: null,
          counterAccountNumber: null,
        },
      ],
      cancellationReason: null,
      canceledAt: null,
    };
  }

  /**
   * Pretends to register a webhook URL.
   *
   * @param webhookUrl - The URL that would have been registered.
   * @returns The confirmation PayOS would have returned.
   */
  confirmWebhook(webhookUrl: string): ConfirmWebhookResponse {
    this.logger.log(`[payment:sandbox] webhook URL accepted without registration: ${webhookUrl}`);
    return { webhookUrl } as ConfirmWebhookResponse;
  }

  /** Derives a stable link id so repeated runs produce the same value. */
  private linkId(orderCode: number): string {
    return createHash('sha256').update(`sandbox:${orderCode}`).digest('hex').slice(0, 32);
  }
}
