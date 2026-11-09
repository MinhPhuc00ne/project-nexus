import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Data transfer object for approving an administrative store appeal and restoring account standing.
 */
export class ResolveShopAppealDto {
  @ApiProperty({
    description: 'Detailed explanation and justification for approving the merchant appeal',
    example: 'Accepted delivery logistics incident justification for order #ord_123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Appeal justification reason cannot be empty' })
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Target baseline reputation score to restore (defaults to 50 - STANDARD tier if omitted)',
    example: 60,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(100)
  restoredScore?: number;
}
