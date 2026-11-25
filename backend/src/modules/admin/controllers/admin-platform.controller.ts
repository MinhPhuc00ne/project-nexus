import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  CurrentUser,
  Roles,
  AuthenticatedUserPayload,
} from '../../../core/security/roles.decorator';

import { UpdateSystemSettingsDto } from '../dtos/update-system-settings.dto';

import { AdminSettingsService } from '../services/admin-settings.service';
import { AdminFinanceService } from '../services/admin-finance.service';
import { AdminDisputesService } from '../services/admin-disputes.service';
import { QueryAdminDisputesDto } from '../dtos/query-admin-disputes.dto';

/** Platform-wide figures, the dispute queue and the settings that drive both. */
@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminPlatformController {
  constructor(
    private readonly adminSettingsService: AdminSettingsService,
    private readonly adminFinanceService: AdminFinanceService,
    private readonly adminDisputesService: AdminDisputesService,
  ) {}

  @Get('disputes')
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List pending and historical order disputes across the platform',
    description:
      'Supports status filters, keyword search on order or user identifiers, and returns aggregated status counters.',
  })
  @ApiResponse({ status: 200, description: 'Disputes retrieved successfully' })
  async listDisputes(@Query() query: QueryAdminDisputesDto) {
    return this.adminDisputesService.getDisputes(query);
  }

  @Get('analytics/overview')
  @ApiOperation({
    summary: '[Admin] Get operational analytics for dashboard overview charts',
    description:
      'Aggregates platform fee revenue trend periods (7d, 30d, month, year) split into normal orders vs 3D auctions, revenue composition breakdown by source and category, and hourly bid frequency distribution for live dashboard charts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview analytics retrieved successfully',
  })
  async getDashboardAnalytics() {
    return this.adminFinanceService.getDashboardAnalytics();
  }

  @Get('settings')
  @ApiOperation({
    summary: 'Retrieve platform configuration parameters',
    description:
      'Queries runtime configuration values including commission percentage rates, checkout reservation limits, and catalog bounds.',
  })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings() {
    return this.adminSettingsService.getSettings();
  }

  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update platform runtime configuration parameters',
    description:
      'Modifies platform fee percentages, cart retention lifespans, and checkout hold limits without application redeployment.',
  })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: UpdateSystemSettingsDto,
  ) {
    return this.adminSettingsService.updateSettings(admin.id, dto);
  }
}
