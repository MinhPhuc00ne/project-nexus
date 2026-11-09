import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel, NotificationType } from '@prisma/client';

/** Account-owned notification content, including an optional auction deep link. */
export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() content!: string;
  @ApiProperty({ enum: NotificationType }) type!: NotificationType;
  @ApiProperty({ enum: NotificationChannel }) channel!: NotificationChannel;
  @ApiProperty() isRead!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) readAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) auctionId!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    example: '/auction/00000000-0000-4000-8000-000000000001',
    description:
      'Frontend destination. New auction notifications use the same route as auction banners and manual browsing. Legacy notifications may have no destination.',
  })
  targetUrl!: string | null;
}

/** Paginated notifications belonging exclusively to the authenticated account. */
export class NotificationPageDto {
  @ApiProperty({ type: [NotificationResponseDto] }) items!: NotificationResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() unreadCount!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}
