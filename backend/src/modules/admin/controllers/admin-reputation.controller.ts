import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, OmitType } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { AdjustReputationDto } from '../../users/dtos/reputation.dto';
import { ReputationService } from '../../users/services/reputation.service';

/** Administrator body cannot supply a different target identity or suppress the audit workflow. */
export class AdminAdjustReputationDto extends OmitType(AdjustReputationDto, [
  'userId',
  'skipNotification',
] as const) {}

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
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminAdjustReputationDto,
  ): ReturnType<ReputationService['adjustByAdmin']> {
    return this.reputation.adjustByAdmin(id, adminId, dto);
  }
}
