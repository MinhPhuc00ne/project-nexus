import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody } from '@nexus/contracts/nest';
import { PayosWebhookService } from '../services/payos-webhook.service';
import { PayosService } from '../../payments/services/payos.service';
import { ConfirmWebhookInput, ConfirmWebhookSchema } from '../dtos/confirm-webhook.dto';
import { PayosWebhookInput, PayosWebhookSchema } from '../dtos/payos-webhook.dto';
import { Public } from '../../../core/security/roles.decorator';
import { Webhook } from '@payos/node';

@ApiTags('8. COMMERCE - WEBHOOKS')
@Controller('commerce/webhooks')
export class PayosWebhookController {
  constructor(
    private readonly webhooks: PayosWebhookService,
    private readonly payosService: PayosService,
  ) {}

  @Public()
  @Post('payos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[PAYOS WEBHOOK] Điểm tiếp nhận Webhook biến động số dư VietQR từ PayOS',
    description:
      'Endpoint công khai để PayOS bắn thông báo khi khách hàng chuyển khoản thành công. Tự động xác minh chữ ký HMAC-SHA256 (Checksum) và cập nhật đơn hàng sang trạng thái PAID.',
  })
  @ApiResponse({ status: 200, description: 'Xác nhận webhook thành công' })
  @ApiResponse({ status: 400, description: 'Chữ ký webhook không hợp lệ' })
  // `PayosWebhookSchema` uses `z.looseObject(...)` on both the envelope and
  // `data` so structural validation applies without stripping extra fields
  // needed by `PayosWebhookService` for HMAC-SHA256 signature verification.
  async handlePayosWebhook(@ZodBody(PayosWebhookSchema) webhookBody: PayosWebhookInput) {
    return this.webhooks.handle(webhookBody as unknown as Webhook);
  }

  @Public()
  @Post('payos/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[UTILITY] Xác nhận và đăng ký Webhook URL với máy chủ PayOS',
    description:
      'Gọi API PayOS để tự động xác thực URL Webhook của bạn (tiện lợi khi sử dụng ngrok URL ở môi trường phát triển).',
  })
  @ApiResponse({ status: 200, description: 'Đăng ký Webhook URL thành công' })
  async confirmWebhookUrl(@ZodBody(ConfirmWebhookSchema) dto: ConfirmWebhookInput) {
    return this.payosService.confirmWebhook(dto.webhookUrl);
  }
}
