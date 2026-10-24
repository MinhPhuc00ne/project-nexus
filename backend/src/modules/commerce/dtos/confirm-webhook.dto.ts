import { IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmWebhookDto {
  @ApiProperty({
    example: 'https://xxxx.ngrok-free.app/api/v1/commerce/webhooks/payos',
    description: 'URL Webhook công khai để đăng ký và xác nhận với PayOS',
  })
  @IsUrl()
  @IsNotEmpty()
  webhookUrl: string;
}
