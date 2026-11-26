import { Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery } from '@nexus/contracts/nest';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  QueryReportsInput,
  QueryReportsSchema,
  ReviewReportInput,
  ReviewReportSchema,
} from '../dtos/report-moderation.dto';
import { ReportModerationService, ReportModerator } from '../services/report-moderation.service';

/** Separates personal report history from privileged moderation operations. */
@Controller()
@ApiTags('Reviews and reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportModerationController {
  constructor(private readonly reports: ReportModerationService) {}

  /** Returns only reports authored by the current account. @returns Personal report history. */
  @Get('commerce/reports/my')
  @ApiOperation({ summary: 'Theo dõi trạng thái báo cáo của chính mình' })
  mine(
    @CurrentUser('id') userId: string,
    @ZodQuery(QueryReportsSchema) query: QueryReportsInput,
  ): ReturnType<ReportModerationService['list']> {
    return this.reports.list(query, userId);
  }

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
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: ReportModerator,
    @ZodBody(ReviewReportSchema) dto: ReviewReportInput,
  ): ReturnType<ReportModerationService['review']> {
    return this.reports.review(id, actor, dto);
  }
}
