import { Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  UpdateAuctionImageInput,
  UpdateAuctionImageSchema,
} from '../dtos/update-auction-image.dto';
import { AuctionImageService } from '../services/auction-image.service';

/** Exposes image-only maintenance for administrators and support staff. */
@Controller('auctions')
@ApiTags('11. AUCTIONS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPPORT_STAFF)
export class AuctionImageController {
  constructor(private readonly images: AuctionImageService) {}

  /** Persists a previously uploaded image. @returns Updated session image reference. */
  @Patch(':id/image')
  @ApiOperation({
    summary: 'Update image for an unstarted auction session (Admin & Support Staff)',
    description:
      'Upload the image via POST /media/upload first, then submit imageUrl. Does not alter pricing or session schedule.',
  })
  update(
    @CurrentUser('id') actorId: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(UpdateAuctionImageSchema) dto: UpdateAuctionImageInput,
  ): ReturnType<AuctionImageService['update']> {
    return this.images.update(actorId, id, dto.imageUrl);
  }
}
