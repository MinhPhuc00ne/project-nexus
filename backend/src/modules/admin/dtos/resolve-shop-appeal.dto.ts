import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

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
    description: 'Target reputation score to restore (defaults to 100, GOOD tier)',
    example: 60,
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(2147483647)
  restoredScore?: number;
}
