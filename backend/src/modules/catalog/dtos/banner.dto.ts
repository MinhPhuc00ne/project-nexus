import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  isURL,
  ValidateBy,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { isAuctionTargetUrl } from '../../../core/navigation/auction-navigation';

/** Validated banner content; creator attribution is always supplied by the server. */
export class BannerDto {
  @ApiProperty({ example: 'Ưu đãi tháng 11' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;
  @ApiProperty({ example: 'https://example.com/banner.png' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  imageUrl!: string;
  @ApiPropertyOptional({
    nullable: true,
    description: 'HTTP(S) destination or canonical relative /auction/:uuid route',
  })
  @IsOptional()
  @ValidateBy({
    name: 'isBannerDestination',
    validator: {
      validate: (value: unknown): boolean =>
        typeof value === 'string' &&
        (isAuctionTargetUrl(value) ||
          isURL(value, { protocols: ['http', 'https'], require_protocol: true })),
      defaultMessage: (): string => 'targetUrl must be an HTTP(S) URL or a canonical auction route',
    },
  })
  targetUrl?: string | null;
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Linked auction. The server supplies /auction/:id as targetUrl when present.',
  })
  @IsOptional()
  @IsUUID()
  auctionId?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  startsAt?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional({
    default: 0,
    minimum: -1000,
    maximum: 1000,
    deprecated: true,
    description: 'Retained for compatibility. Ordering uses creator group and creation time.',
  })
  @IsOptional()
  @IsInt()
  @Min(-1000)
  @Max(1000)
  priority?: number;
}
