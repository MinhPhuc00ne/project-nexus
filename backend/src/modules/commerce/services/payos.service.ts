import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  constructor(private readonly configService: ConfigService) {
    const clientId =
      this.configService.get<string>('PAYOS_CLIENT_ID') || process.env.PAYOS_CLIENT_ID || '';
    const apiKey =
      this.configService.get<string>('PAYOS_API_KEY') || process.env.PAYOS_API_KEY || '';
    const checksumKey =
      this.configService.get<string>('PAYOS_CHECKSUM_KEY') || process.env.PAYOS_CHECKSUM_KEY || '';

    if (!clientId || !apiKey || !checksumKey) {
      this.logger.warn(
        'PayOS configuration keys (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY) are not fully provided in environment.',
      );
    }

    this.payOS = new PayOS({
      clientId,
      apiKey,
      checksumKey,
    });
  }

  /**
   * Tạo link thanh toán VietQR động
   */
  async createPaymentLink(
    paymentData: CreatePaymentLinkRequest,
  ): Promise<CreatePaymentLinkResponse> {
    try {
      this.logger.log(
        `Đang tạo PayOS Payment Link cho orderCode=${paymentData.orderCode}, số tiền=${paymentData.amount}`,
      );
      const result = await this.payOS.paymentRequests.create(paymentData);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Lỗi khi tạo payment link PayOS (orderCode=${paymentData.orderCode}): ${message}`,
      );
      throw new BadRequestException(
        message ||
          'Không thể tạo liên kết thanh toán PayOS. Vui lòng kiểm tra lại cấu hình hoặc dữ liệu đơn hàng.',
      );
    }
  }

  /**
   * Xác thực chữ ký webhook từ PayOS (đảm bảo request xuất phát từ server PayOS)
   */
  async verifyWebhook(webhookBody: Webhook): Promise<WebhookData> {
    try {
      const verified = await this.payOS.webhooks.verify(webhookBody);
      return verified;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Chữ ký Webhook PayOS không hợp lệ: ${message}`);
      throw new BadRequestException('Chữ ký Webhook PayOS không hợp lệ hoặc dữ liệu bị thay đổi');
    }
  }

  /**
   * Lấy thông tin thanh toán theo orderCode hoặc paymentLinkId
   */
  async getPaymentLink(orderCodeOrId: number | string): Promise<PaymentLink> {
    try {
      if (typeof orderCodeOrId === 'number') {
        return await this.payOS.paymentRequests.get(orderCodeOrId);
      }
      return await this.payOS.paymentRequests.get(orderCodeOrId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi khi truy vấn payment link PayOS: ${message}`);
      throw new BadRequestException('Không tìm thấy thông tin liên kết thanh toán PayOS');
    }
  }

  /**
   * Đăng ký và xác nhận Webhook URL với hệ thống PayOS
   */
  async confirmWebhook(webhookUrl: string): Promise<ConfirmWebhookResponse> {
    try {
      this.logger.log(`Xác nhận webhook URL với PayOS: ${webhookUrl}`);
      return await this.payOS.webhooks.confirm(webhookUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi khi xác nhận Webhook URL với PayOS: ${message}`);
      throw new BadRequestException(`Không thể xác nhận Webhook URL với PayOS: ${message}`);
    }
  }
}
