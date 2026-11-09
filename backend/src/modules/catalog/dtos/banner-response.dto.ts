import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BannerCreatorRole, Role } from '@prisma/client';

/** Current creator identity is exposed only to banner managers. */
export class BannerCreatorDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ enum: Role }) role!: Role;
}

/** Public banner content includes a stable creator group and optional auction destination. */
export class BannerResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() imageUrl!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    example: '/auction/00000000-0000-4000-8000-000000000001',
  })
  targetUrl!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) auctionId!: string | null;
  @ApiProperty({
    enum: BannerCreatorRole,
    description: 'Immutable role group at creation; ADMIN precedes STAFF',
  })
  creatorRole!: BannerCreatorRole;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) startsAt!: Date | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) endsAt!: Date | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ deprecated: true }) priority!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
  @ApiPropertyOptional({ format: 'uuid' }) creatorId?: string;
  @ApiPropertyOptional({ type: BannerCreatorDto }) creator?: BannerCreatorDto;
}

/** Confirmation for a completed or already completed deactivation. */
export class BannerDisabledDto {
  @ApiProperty({ example: true }) success!: true;
}
