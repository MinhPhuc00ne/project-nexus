import { Controller, Param, Post, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodBody } from '@nexus/contracts/nest';
import { Role } from '@nexus/types';

import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { ReportInput, ReportSchema } from '../dtos/feedback.dto';
import { ReportsService } from '../services/reports.service';

/** Reports a buyer raises against a shop or a product. */
@ApiTags('Reports')
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

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
