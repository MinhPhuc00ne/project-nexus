import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppErrorCode } from '@nexus/contracts';
import { ProviderConfigService } from '../../../core/providers/provider-config.service';
import { PaymentSandboxService } from './payment-sandbox.service';
import {
  PayOS,
  CreatePaymentLinkRequest,
  CreatePaymentLinkResponse,
  PaymentLink,
  Webhook,
  WebhookData,
  ConfirmWebhookResponse,
} from '@payos/node';

@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);
  private payOS: PayOS;

  constructor(
    private readonly configService: ConfigService,
    private readonly providers: ProviderConfigService,
    private readonly sandbox: PaymentSandboxService,
  ) {
    const clientId =
      this.configService.get<string>('PAYOS_CLIENT_ID') || process.env.PAYOS_CLIENT_ID || '';
    const apiKey =
      this.configService.get<string>('PAYOS_API_KEY') || process.env.PAYOS_API_KEY || '';
    const checksumKey =
      this.configService.get<string>('PAYOS_CHECKSUM_KEY') || process.env.PAYOS_CHECKSUM_KEY || '';

    // PAYMENT_PROVIDER=payos is validated at boot, so missing keys here mean
    // the configuration changed underneath a running process.
    if (!this.providers.isPaymentSandbox() && (!clientId || !apiKey || !checksumKey)) {
      this.logger.error(
        'PAYMENT_PROVIDER=payos but PAYOS_CLIENT_ID, PAYOS_API_KEY or PAYOS_CHECKSUM_KEY is missing.',
      );
    }

    this.payOS = new PayOS({
      clientId,
      apiKey,
      checksumKey,
    });
  }

  /**
   * Create a dynamic VietQR payment link.
   */
  async createPaymentLink(
    paymentData: CreatePaymentLinkRequest,
  ): Promise<CreatePaymentLinkResponse> {
    if (this.providers.isPaymentSandbox()) {
      return this.sandbox.createPaymentLink(paymentData);
    }
    try {
      this.logger.log(
        `Creating PayOS payment link for orderCode=${paymentData.orderCode}, amount=${paymentData.amount}`,
      );
      const result = await this.payOS.paymentRequests.create(paymentData);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create PayOS payment link (orderCode=${paymentData.orderCode}): ${message}`,
      );
      throw new BadRequestException({
        message:
          message ||
          'Unable to create PayOS payment link. Please check the configuration or order data.',
        errorCode: AppErrorCode.PAYMENT_FAILED,
      });
    }
  }

  /**
   * Verify the webhook signature from PayOS to ensure the request originated from PayOS servers.
   */
  async verifyWebhook(webhookBody: Webhook): Promise<WebhookData> {
    if (this.providers.isPaymentSandbox()) {
      return this.sandbox.verifyWebhook(webhookBody);
    }
    try {
      const verified = await this.payOS.webhooks.verify(webhookBody);
      return verified;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Invalid PayOS webhook signature: ${message}`);
      throw new BadRequestException({
        message: 'Invalid PayOS webhook signature or tampered data',
        errorCode: AppErrorCode.PAYMENT_FAILED,
      });
    }
  }

  /**
   * Retrieve payment link information by orderCode or paymentLinkId.
   */
  async getPaymentLink(orderCodeOrId: number | string): Promise<PaymentLink> {
    if (this.providers.isPaymentSandbox()) {
      return this.sandbox.getPaymentLink(orderCodeOrId);
    }
    try {
      if (typeof orderCodeOrId === 'number') {
        return await this.payOS.paymentRequests.get(orderCodeOrId);
      }
      return await this.payOS.paymentRequests.get(orderCodeOrId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to query PayOS payment link: ${message}`);
      throw new BadRequestException({
        message: 'PayOS payment link information not found',
        errorCode: AppErrorCode.PAYMENT_FAILED,
      });
    }
  }

  /**
   * Register and confirm the webhook URL with PayOS.
   */
  async confirmWebhook(webhookUrl: string): Promise<ConfirmWebhookResponse> {
    if (this.providers.isPaymentSandbox()) {
      return this.sandbox.confirmWebhook(webhookUrl);
    }
    try {
      this.logger.log(`Confirming webhook URL with PayOS: ${webhookUrl}`);
      return await this.payOS.webhooks.confirm(webhookUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to confirm webhook URL with PayOS: ${message}`);
      throw new BadRequestException({
        message: `Unable to confirm webhook URL with PayOS: ${message}`,
        errorCode: AppErrorCode.PAYMENT_FAILED,
      });
    }
  }
}
