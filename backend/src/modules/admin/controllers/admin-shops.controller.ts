import { Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam, ZodQuery } from '@nexus/contracts/nest';
import { UuidParamSchema } from '@nexus/contracts';
import { Role } from '@prisma/client';
import {
  AdminShopOrdersQuery,
  AdminShopOrdersQuerySchema,
} from '../../../core/validation/query-schemas';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  AuthenticatedUserPayload,
  CurrentUser,
  Roles,
} from '../../../core/security/roles.decorator';

import { QueryAdminShopsInput, QueryAdminShopsSchema } from '../dtos/query-admin-shops.dto';
import { UpdateShopStatusInput, UpdateShopStatusSchema } from '../dtos/update-shop-status.dto';
import { WarnShopInput, WarnShopSchema } from '../dtos/warn-shop.dto';
import {
  CreateShopViolationInput,
  CreateShopViolationSchema,
} from '../dtos/create-shop-violation.dto';
import { ResolveShopAppealInput, ResolveShopAppealSchema } from '../dtos/resolve-shop-appeal.dto';

import { AdminShopsService } from '../services/admin-shops.service';

/** Shop moderation: suspensions, warnings, violations and the appeals against them. */
@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminShopsController {
  constructor(private readonly adminShopsService: AdminShopsService) {}

  @Get('shops')
  @ApiOperation({
    summary: 'List registered seller shops',
    description:
      'Filters shops by status (ACTIVE or SUSPENDED), geographical location, or keyword search.',
  })
  @ApiResponse({ status: 200, description: 'Shops retrieved successfully' })
  async listShops(@ZodQuery(QueryAdminShopsSchema) query: QueryAdminShopsInput) {
    return this.adminShopsService.listShops(query);
  }

  @Patch('shops/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspend or restore shop operations',
    description:
      'Suspends selling capabilities and hides catalog items while retaining buyer capabilities on the account.',
  })
  @ApiResponse({ status: 200, description: 'Shop status updated successfully' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async updateShopStatus(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @ZodBody(UpdateShopStatusSchema) dto: UpdateShopStatusInput,
  ) {
    return this.adminShopsService.updateShopStatus(id, admin.id, dto);
  }

  @Get('shops/:id')
  @ApiOperation({
    summary: 'Retrieve comprehensive shop audit profile',
    description:
      'Returns shop identity, inventory breakdown, violation record, and administrative action logs.',
  })
  @ApiResponse({ status: 200, description: 'Shop audit profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async getShopDetail(@ZodParam('id', UuidParamSchema) id: string) {
    return this.adminShopsService.getShopDetail(id);
  }

  @Get('shops/:id/orders')
  @ApiOperation({
    summary: 'List orders associated with a specific shop',
    description: 'Supports pagination and filtering across order fulfillment statuses.',
  })
  @ApiResponse({ status: 200, description: 'Shop orders retrieved successfully' })
  async getShopOrders(
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodQuery(AdminShopOrdersQuerySchema) query: AdminShopOrdersQuery,
  ) {
    return this.adminShopsService.getShopOrders(id, query);
  }

  @Post('shops/:id/warn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue an administrative warning to a shop',
    description:
      'Records an administrative warning, notifies the seller, and optionally deducts reputation points.',
  })
  @ApiResponse({ status: 200, description: 'Warning issued successfully' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async warnShop(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @ZodBody(WarnShopSchema) dto: WarnShopInput,
  ) {
    return this.adminShopsService.warnShop(id, admin.id, dto);
  }

  @Post('shops/:id/resolve-appeal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve shop appeal, restore reputation standing, and reactivate products',
    description:
      'Accepts an appeal from a suspended or penalized store, restores normalized reputation score, reactivates listing catalog, and dispatches in-app confirmation notification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Store appeal approved and access restored successfully',
  })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async resolveShopAppeal(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @ZodBody(ResolveShopAppealSchema) dto: ResolveShopAppealInput,
  ) {
    return this.adminShopsService.resolveShopAppeal(id, admin.id, dto);
  }

  @Post('shops/:id/violations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record an official violation penalty against a shop',
    description:
      'Documents shop violations, evidence references, penalty levels, and resolution remarks.',
  })
  @ApiResponse({ status: 201, description: 'Violation record created successfully' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async createShopViolation(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @ZodBody(CreateShopViolationSchema) dto: CreateShopViolationInput,
  ) {
    return this.adminShopsService.createShopViolation(id, admin.id, dto);
  }

  @Get('shops/:id/violations')
  @ApiOperation({
    summary: 'List recorded violations for a specific shop',
  })
  @ApiResponse({ status: 200, description: 'Violations retrieved successfully' })
  async getShopViolations(@ZodParam('id', UuidParamSchema) id: string) {
    return this.adminShopsService.getShopViolations(id);
  }

  @Get('shops/:id/action-logs')
  @ApiOperation({
    summary: 'List administrative audit logs for a shop',
  })
  @ApiResponse({ status: 200, description: 'Action logs retrieved successfully' })
  async getShopActionLogs(@ZodParam('id', UuidParamSchema) id: string) {
    return this.adminShopsService.getShopActionLogs(id);
  }
}
