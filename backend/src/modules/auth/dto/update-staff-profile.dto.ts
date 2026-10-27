import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator';

export class UpdateStaffProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  phoneNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  avatarUrl?: string | null;
}
