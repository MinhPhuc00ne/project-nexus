import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery } from '@nexus/contracts/nest';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { AdminService } from '../services/admin.service';
import { CreateStaffInput, CreateStaffSchema } from '../dtos/create-staff.dto';
import { AdminInviteStaffInput, AdminInviteStaffSchema } from '../dtos/invite-staff.dto';

import { QueryStaffInput, QueryStaffSchema } from '../dtos/query-staff.dto';

/** Provisioning and inviting the support staff who work the back office. */
@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminStaffController {
  constructor(private readonly adminService: AdminService) {}

  @Post('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or invite support staff member',
    description:
      'Provisions a corporate staff account and sends a random temporary password to their personal email address.',
  })
  @ApiResponse({
    status: 201,
    description: 'Staff account successfully provisioned and invitation dispatched',
  })
  @ApiResponse({ status: 400, description: 'Email address already registered or invalid input' })
  @ApiResponse({ status: 403, description: 'Administrative role required' })
  async createStaff(
    @CurrentUser('id') adminId: string,
    @ZodBody(CreateStaffSchema) dto: CreateStaffInput,
  ) {
    return this.adminService.createStaff(dto, adminId);
  }

  @Post('staff/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Issue staff credentials and send temporary password via email',
    description:
      'Creates a staff account and dispatches credentials to personal email. Does not expose the password in the response.',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully and staff account provisioned',
  })
  async inviteStaff(
    @CurrentUser('id') adminId: string,
    @ZodBody(AdminInviteStaffSchema) dto: AdminInviteStaffInput,
  ) {
    return this.adminService.inviteStaff(dto, adminId);
  }

  @Get('staff')
  @ApiOperation({
    summary: 'List support staff members',
  })
  @ApiResponse({ status: 200, description: 'Staff members retrieved successfully' })
  async listStaff(@ZodQuery(QueryStaffSchema) query: QueryStaffInput) {
    return this.adminService.listStaff(query);
  }
}
