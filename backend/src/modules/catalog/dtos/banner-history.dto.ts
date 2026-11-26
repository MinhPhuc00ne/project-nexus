import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ApiProperty } from '@nestjs/swagger';
import { BannerCreatorRole, Role } from '@prisma/client';

/** Bounded audit filters shared by all authorized administrators and support staff. */
const queryBannerHistoryFields = {
  bannerId: nullAsAbsent(z.uuid()),
  actorId: nullAsAbsent(z.uuid().describe('Account that disabled the banner')),
  from: nullAsAbsent(z.iso.datetime().describe('Inclusive lower timestamp')),
  to: nullAsAbsent(z.iso.datetime().describe('Inclusive upper timestamp')),
  page: z.coerce.number().int().min(1).max(21474836).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const QueryBannerHistorySchema = z.object(queryBannerHistoryFields).strict();

export type QueryBannerHistoryInput = z.infer<typeof QueryBannerHistorySchema>;

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
