import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery } from '@nexus/contracts/nest';
import { Role } from '@nexus/types';

import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { ReportInput, ReportSchema } from '../dtos/feedback.dto';
import { QueryReportsInput, QueryReportsSchema } from '../dtos/report-moderation.dto';
import { ReportModerationService } from '../services/report-moderation.service';
import { ReportsService } from '../services/reports.service';

/** Reports a buyer raises against a shop or a product. */
@ApiTags('Reports')
@Controller()
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly moderation: ReportModerationService,
  ) {}

  @Get('commerce/reports/my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Theo dõi trạng thái báo cáo của chính mình' })
  mine(
    @CurrentUser('id') userId: string,
    @ZodQuery(QueryReportsSchema) query: QueryReportsInput,
  ): ReturnType<ReportModerationService['list']> {
    return this.moderation.list(query, userId);
  }

  @Post('catalog/shops/:id/reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  reportShop(
    @CurrentUser('id') id: string,
    @Param('id') shopId: string,
    @ZodBody(ReportSchema) dto: ReportInput,
  ): Promise<unknown> {
    return this.reports.create(id, shopId, 'shop', dto);
  }

  @Post('catalog/products/:id/reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  reportProduct(
    @CurrentUser('id') id: string,
    @Param('id') productId: string,
    @ZodBody(ReportSchema) dto: ReportInput,
  ): Promise<unknown> {
    return this.reports.create(id, productId, 'product', dto);
  }
}
