import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BannerCreatorRole, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** Bounded audit filters shared by all authorized administrators and support staff. */
export class QueryBannerHistoryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  bannerId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Account that disabled the banner' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Inclusive lower timestamp' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Inclusive upper timestamp' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(21474836)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

/** Immutable snapshots preserve who disabled whose banner even after names or content change. */
export class BannerDisableHistoryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) bannerId!: string;
  @ApiProperty() bannerTitle!: string;
  @ApiProperty({ format: 'uuid' }) creatorId!: string;
  @ApiProperty() creatorName!: string;
  @ApiProperty({ enum: BannerCreatorRole }) creatorRole!: BannerCreatorRole;
  @ApiProperty({ format: 'uuid' }) actorId!: string;
  @ApiProperty() actorName!: string;
  @ApiProperty({ enum: Role }) actorRole!: Role;
  @ApiProperty({ enum: ['UPDATE', 'DELETE', 'DISABLE'] }) source!: string;
  @ApiProperty({ example: true }) wasActive!: boolean;
  @ApiProperty({ example: false }) isActive!: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

/** Paginated history response with stable descending timestamp and identifier ordering. */
export class BannerHistoryPageDto {
  @ApiProperty({ type: [BannerDisableHistoryDto] }) items!: BannerDisableHistoryDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
