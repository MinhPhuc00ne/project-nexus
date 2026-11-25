import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { AdminService } from '../services/admin.service';

import { LockUserDto, UpdateUserStatusDto } from '../dtos/lock-user.dto';
import { QuerySellerRequestsDto } from '../dtos/query-seller-requests.dto';

import { QueryUsersDto } from '../dtos/query-users.dto';
import { RejectSellerRequestDto } from '../dtos/reject-seller-request.dto';
import { UpdateUserRoleDto } from '../dtos/update-user-role.dto';

import { AdminUsersService } from '../services/admin-users.service';

/**
 * The accounts the back office administers, and the requests to become a shop.
 *
 * Promoting a buyer to a seller is a change to their account, so the approval
 * queue lives with the accounts rather than with the shops it creates.
 */
@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminUsersController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  @Get('seller-requests')
  @ApiOperation({
    summary: 'List buyer upgrade requests for seller status',
    description: 'Supports filtering by PENDING, APPROVED, or REJECTED status with pagination.',
  })
  @ApiResponse({ status: 200, description: 'Seller requests retrieved successfully' })
  async getSellerRequests(@Query() query: QuerySellerRequestsDto) {
    return this.adminService.getSellerRequests(query);
  }

  @Get('seller-requests/:id')
  @ApiOperation({
    summary: 'Retrieve seller upgrade application details',
  })
  @ApiResponse({ status: 200, description: 'Seller request details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Seller request not found' })
  async getSellerRequestById(@Param('id') id: string) {
    return this.adminService.getSellerRequestById(id);
  }

  @Patch('seller-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve seller upgrade application',
    description:
      'Updates request status to APPROVED, grants SELLER role to the account, and enables seller mode.',
  })
  @ApiResponse({ status: 200, description: 'Seller request approved successfully' })
  @ApiResponse({ status: 400, description: 'Request is not in PENDING status' })
  @ApiResponse({ status: 404, description: 'Seller request not found' })
  async approveSellerRequest(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
  ) {
    return this.adminService.approveSellerRequest(id, admin.id);
  }

  @Patch('seller-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject seller upgrade application',
    description:
      'Updates request status to REJECTED with rejection reasons and notifies the applicant.',
  })
  @ApiResponse({ status: 200, description: 'Seller request rejected successfully' })
  @ApiResponse({ status: 400, description: 'Request is not in PENDING status' })
  @ApiResponse({ status: 404, description: 'Seller request not found' })
  async rejectSellerRequest(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: RejectSellerRequestDto,
  ) {
    return this.adminService.rejectSellerRequest(id, admin.id, dto);
  }

  @Get('users')
  @ApiOperation({
    summary: 'List platform users with filtering and pagination',
    description:
      'Retrieves platform accounts excluding guests. Supports role filtering, lock status filtering, and keyword search.',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async listUsers(@Query() query: QueryUsersDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Retrieve detailed user profile information',
    description:
      'Retrieves user profile, wallet balances, registered addresses, and historical order metrics.',
  })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.adminUsersService.getUserById(id);
  }

  @Patch('users/:id/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lock a user account',
    description:
      'Sets user trust level to SUSPENDED and revokes all refresh tokens to terminate active sessions.',
  })
  @ApiResponse({ status: 200, description: 'User account locked successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot lock administrative accounts or already locked user',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async lockUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: LockUserDto,
  ) {
    return this.adminUsersService.lockUser(id, admin.id, dto);
  }

  @Patch('users/:id/unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unlock a user account',
    description: 'Restores user trust level to standard standing based on reputation score.',
  })
  @ApiResponse({ status: 200, description: 'User account unlocked successfully' })
  @ApiResponse({ status: 400, description: 'User account is not currently locked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unlockUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: LockUserDto,
  ) {
    return this.adminUsersService.unlockUser(id, admin.id, dto);
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user account lock status',
    description: 'Toggles account lock status using the isLocked boolean field.',
  })
  @ApiResponse({ status: 200, description: 'User account status updated successfully' })
  async updateUserStatus(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateUserStatus(id, admin.id, dto);
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign or update account role',
    description:
      'Assigns any platform role (BUYER, SELLER, SUPPORT_STAFF, ADMIN) to a user account.',
  })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid role transition or attempting to self-demote administrator',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateUserRole(id, admin.id, dto);
  }
}
