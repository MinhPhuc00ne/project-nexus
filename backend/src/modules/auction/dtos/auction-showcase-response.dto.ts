import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuctionStatus } from '@prisma/client';

/**
 * Seller metadata exposed on approved auction showcase items.
 */
export class AuctionShowcaseSellerDto {
  @ApiProperty({ example: '7b52c1b0-4e1a-4f38-8d2e-9a0b12345678' })
  id!: string;

  @ApiProperty({ example: 'Huy Luxury Timepieces' })
  fullName!: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  shopAvatarUrl?: string | null;
}

/**
 * Approved consignment lot payload including seller-submitted pricing and appraisal records.
 */
export class AuctionShowcaseItemDto {
  @ApiProperty({ example: 'd18d71c0-3b2a-4c6f-a51b-1f2e3d4c5b6a' })
  id!: string;

  @ApiProperty({ example: 'Patek Philippe Calatrava Skeleton 18K' })
  title!: string;

  @ApiProperty({ example: 'Handcrafted 18K rose gold mechanical timepiece with box and papers.' })
  description!: string;

  @ApiProperty({ type: [String] })
  images!: string[];

  @ApiPropertyOptional({ nullable: true, example: 'preset_watch' })
  threeModelKey?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  lotNumber?: number | null;

  @ApiProperty({
    example: 350000000,
    description: 'Official starting price (fallback to seller proposedStartingPrice)',
  })
  startingPrice!: number;

  @ApiProperty({ example: 350000000, description: 'Seller originally proposed starting price' })
  proposedStartingPrice!: number;

  @ApiPropertyOptional({ nullable: true, example: 420000000 })
  reservePrice?: number | null;

  @ApiPropertyOptional({ nullable: true, example: 420000000 })
  proposedReservePrice?: number | null;

  @ApiProperty({
    example: 5000000,
    description: 'Official bid increment (fallback to seller proposedBidIncrement)',
  })
  bidIncrement!: number;

  @ApiProperty({ example: 5000000, description: 'Seller originally proposed bid increment' })
  proposedBidIncrement!: number;

  @ApiPropertyOptional({ nullable: true, example: 'GIA-2026-88412' })
  appraisalCertificateNumber?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'GIA Gemological Institute' })
  appraisalAgency?: string | null;

  @ApiProperty({ type: [String], description: 'Seller-uploaded appraisal certificate images' })
  certificateImages!: string[];

  @ApiPropertyOptional({ nullable: true, example: '2026-04-15T00:00:00.000Z' })
  certificateIssueDate?: string | null;

  @ApiPropertyOptional({ type: AuctionShowcaseSellerDto })
  seller?: AuctionShowcaseSellerDto;

  @ApiPropertyOptional({ enum: AuctionStatus })
  lotStatus?: AuctionStatus;

  @ApiPropertyOptional({ example: 355000000 })
  currentHighestBid?: number;

  @ApiPropertyOptional({ nullable: true })
  currentHighestBidderId?: string | null;

  @ApiPropertyOptional({ example: 4 })
  totalBidsCount?: number;

  @ApiPropertyOptional({ nullable: true })
  startTime?: string | null;

  @ApiPropertyOptional({ nullable: true })
  endTime?: string | null;
}

/**
 * Synchronized live intro showcase telemetry returned for REST late-joiners and Swagger documentation.
 */
export class AuctionIntroShowcaseResponseDto {
  @ApiProperty({ example: 'a442d1a0-7f8a-4e21-9b1c-8c1e4d5f6a7b' })
  auctionId!: string;

  @ApiProperty({ example: 'NEXUS Grand Heritage Auction 2026' })
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ enum: AuctionStatus, example: AuctionStatus.ACTIVE })
  status!: AuctionStatus;

  @ApiProperty({ example: '2026-11-11T08:00:00.000Z' })
  startedAt!: string;

  @ApiProperty({ example: '2026-11-11T10:00:00.000Z' })
  endTime!: string;

  @ApiProperty({
    example: '2026-11-11T08:00:05.240Z',
    description: 'Current server UTC timestamp for client clock synchronization',
  })
  serverTime!: string;

  @ApiProperty({ example: 31300, description: 'Total intro broadcast duration in milliseconds' })
  introDurationMs!: number;

  @ApiProperty({
    example: true,
    description:
      'True while the live intro broadcast is actively airing (elapsedMs < introDurationMs)',
  })
  isIntroActive!: boolean;

  @ApiProperty({
    example: 5240,
    description:
      'Elapsed milliseconds since startedAt (0 when not active yet, clamped to [0, introDurationMs])',
  })
  elapsedMs!: number;

  @ApiProperty({ type: [AuctionShowcaseItemDto] })
  items!: AuctionShowcaseItemDto[];
}
