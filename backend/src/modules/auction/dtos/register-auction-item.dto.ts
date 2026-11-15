import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data transfer object used by Seller to register an item with online appraisal certificates into an auction.
 */
export class RegisterAuctionItemDto {
  @ApiProperty({
    description: 'Consigned item public title',
    example: 'Patek Philippe Nautilus 5711/1R-001 Rose Gold 18K',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description, provenance, and physical condition of the consigned item',
    example:
      'Pristine condition 99%, complete original box, papers and international warranty certificate dated 2024.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'List of high-resolution product image URLs from multiple angles',
    example: ['https://example.com/patek1.jpg', 'https://example.com/patek2.jpg'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  images: string[];

  @ApiPropertyOptional({
    description: 'Storage key for the interactive 3D inspection model (if available)',
    example: 'models/patek-5711.glb',
  })
  @IsString()
  @IsOptional()
  threeModelKey?: string;

  @ApiProperty({
    description: 'Proposed starting bid price in VND currency',
    example: 150000000,
    minimum: 10000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(10000)
  proposedStartingPrice: number;

  @ApiPropertyOptional({
    description: 'Proposed minimum reserve price in VND currency (minimum acceptable sale price)',
    example: 180000000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  proposedReservePrice?: number;

  @ApiPropertyOptional({
    description: 'Proposed minimum price increment per bid step in VND currency',
    example: 2000000,
    default: 100000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1000)
  proposedBidIncrement?: number = 100000;

  @ApiPropertyOptional({
    description: 'Appraisal / authentication certificate identifier number',
    example: 'GIA-2026-PP-998822',
  })
  @IsString()
  @IsOptional()
  appraisalCertificateNumber?: string;

  @ApiPropertyOptional({
    description: 'Name of the appraisal authority or certifying laboratory',
    example: 'Gemological Institute of America (GIA)',
  })
  @IsString()
  @IsOptional()
  appraisalAgency?: string;

  @ApiProperty({
    description:
      'List of online appraisal certificate scan images, purchase invoices, and warranty cards',
    example: [
      'https://example.com/cert-patek-front.jpg',
      'https://example.com/cert-patek-back.jpg',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  certificateImages: string[];

  @ApiPropertyOptional({
    description: 'Certificate issue date in ISO 8601 format',
    example: '2026-05-15T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  certificateIssueDate?: string;

  @ApiPropertyOptional({
    description: 'Parcel weight in grams for GHN shipping calculation',
    example: 800,
    default: 500,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50000)
  @IsOptional()
  weightGrams?: number;

  @ApiPropertyOptional({
    description: 'Parcel length in cm for GHN shipping calculation',
    example: 25,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  lengthCm?: number;

  @ApiPropertyOptional({
    description: 'Parcel width in cm for GHN shipping calculation',
    example: 20,
    default: 15,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  widthCm?: number;

  @ApiPropertyOptional({
    description: 'Parcel height in cm for GHN shipping calculation',
    example: 15,
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  heightCm?: number;
}
