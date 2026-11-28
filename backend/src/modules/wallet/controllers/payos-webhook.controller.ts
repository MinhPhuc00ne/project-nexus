import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ZodBody } from '@nexus/contracts/nest';
import { Webhook } from '@payos/node';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { Public, Roles } from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import { PayosService } from '../../payments/services/payos.service';
import { ConfirmWebhookInput, ConfirmWebhookSchema } from '../dtos/confirm-webhook.dto';
import { PayosWebhookInput, PayosWebhookSchema } from '../dtos/payos-webhook.dto';
import { PayosWebhookService } from '../services/payos-webhook.service';

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
    summary: '[PAYOS WEBHOOK] Receive VietQR balance-change webhook from PayOS',
    description:
      'Public endpoint called by PayOS when a buyer transfer succeeds. Verifies the HMAC-SHA256 checksum and settles matching orders or wallet deposits.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook checksum' })
  // `PayosWebhookSchema` uses `z.looseObject(...)` on both the envelope and
  // `data` so structural validation applies without stripping extra fields
  // needed by `PayosWebhookService` for HMAC-SHA256 signature verification.
  async handlePayosWebhook(@ZodBody(PayosWebhookSchema) webhookBody: PayosWebhookInput) {
    return this.webhooks.handle(webhookBody as unknown as Webhook);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('payos/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN] Confirm and register the PayOS webhook URL',
    description:
      'Calls the PayOS API to verify and register the configured merchant webhook URL. Restricted to platform administrators.',
  })
  @ApiResponse({ status: 200, description: 'Webhook URL registered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin role required' })
  async confirmWebhookUrl(@ZodBody(ConfirmWebhookSchema) dto: ConfirmWebhookInput) {
    return this.payosService.confirmWebhook(dto.webhookUrl);
  }
}
