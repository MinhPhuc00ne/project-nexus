import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationChannel } from '@prisma/client';

export class NotificationPreferenceItemDto {
  @ApiProperty({
    enum: NotificationChannel,
    example: NotificationChannel.EMAIL,
    description: 'Kênh nhận thông báo: EMAIL, PUSH, IN_APP',
  })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiProperty({
    example: true,
    description: 'Bật (true) hoặc tắt (false) nhận thông báo qua kênh này',
  })
  @IsBoolean()
  isEnabled!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    type: [NotificationPreferenceItemDto],
    description: 'Danh sách cài đặt bật/tắt nhận thông báo cho từng kênh',
    example: [
      { channel: 'IN_APP', isEnabled: true },
      { channel: 'EMAIL', isEnabled: true },
      { channel: 'PUSH', isEnabled: false },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceItemDto)
  preferences!: NotificationPreferenceItemDto[];
}
