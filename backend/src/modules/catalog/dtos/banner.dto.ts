import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  targetUrl?: string | null;
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
  @ApiPropertyOptional({ default: 0, minimum: -1000, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(-1000)
  @Max(1000)
  priority?: number;
}
