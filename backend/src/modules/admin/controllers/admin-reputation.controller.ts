import { UuidParamSchema } from '@nexus/contracts';
import { Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam } from '@nexus/contracts/nest';
import { z } from 'zod';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';

import { AdjustReputationSchema } from '../../users/dtos/reputation.dto';
import { ReputationService } from '../../users/services/reputation.service';

/**
 * Administrator body cannot supply a different target identity or suppress the
 * audit workflow.
 *
 * The target comes from the route and the audit trail is the point of the
 * endpoint, so both are dropped rather than trusted and then overwritten. This
 * was `OmitType` from the Swagger mapped types, which builds a class whose
 * rules are recomputed from decorator metadata; `.omit()` is the schema with
 * those keys removed, and the type follows from it.
 */
export const AdminAdjustReputationSchema = AdjustReputationSchema.omit({
  userId: true,
  skipNotification: true,
});

export type AdminAdjustReputationInput = z.infer<typeof AdminAdjustReputationSchema>;

/** Implements the documented administrator privilege for manual reputation corrections. */
@Controller('admin/users/:id/reputation')
@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReputationController {
  constructor(private readonly reputation: ReputationService) {}

  /** Applies an attributed adjustment. @returns Updated reputation standing. */
  @Patch()
  @ApiOperation({ summary: 'Admin điều chỉnh điểm uy tín, có nhật ký người thực hiện' })
  adjust(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') adminId: string,
    @ZodBody(AdminAdjustReputationSchema) dto: AdminAdjustReputationInput,
  ): ReturnType<ReputationService['adjustByAdmin']> {
    return this.reputation.adjustByAdmin(id, adminId, dto);
  }
}
