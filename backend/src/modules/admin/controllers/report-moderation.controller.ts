import { UuidParamSchema } from '@nexus/contracts';
import { Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  QueryReportsInput,
  QueryReportsSchema,
  ReviewReportInput,
  ReviewReportSchema,
} from '../../reviews/dtos/report-moderation.dto';
import {
  ReportModerationService,
  ReportModerator,
} from '../../reviews/services/report-moderation.service';

/** Privileged moderation operations for violation reports. */
@Controller()
@ApiTags('Reviews and reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportModerationController {
  constructor(private readonly reports: ReportModerationService) {}

  /** Retrieves the moderation queue for authorized staff. @returns Filtered report queue. */
  @Get('admin/reports')
  @Roles('ADMIN', 'SUPPORT_STAFF')
  @ApiOperation({ summary: 'Danh sách báo cáo vi phạm cần xử lý' })
  list(
    @ZodQuery(QueryReportsSchema) query: QueryReportsInput,
  ): ReturnType<ReportModerationService['list']> {
    return this.reports.list(query);
  }

  /** Records an authorized moderation verdict. @returns The persisted decision. */
  @Patch('admin/reports/:id/review')
  @Roles('ADMIN', 'SUPPORT_STAFF')
  @ApiOperation({ summary: 'Xử lý báo cáo: đang điều tra, xác nhận hoặc bác bỏ' })
  review(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() actor: ReportModerator,
    @ZodBody(ReviewReportSchema) dto: ReviewReportInput,
  ): ReturnType<ReportModerationService['review']> {
    return this.reports.review(id, actor, dto);
  }
}
