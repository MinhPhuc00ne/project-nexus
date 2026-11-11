import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderStatus, Role, WithdrawalStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  CurrentUser,
  Roles,
  AuthenticatedUserPayload,
} from '../../../core/security/roles.decorator';
import { AdminService } from '../services/admin.service';
import { CreateStaffDto } from '../dtos/create-staff.dto';
import { AdminInviteStaffDto } from '../dtos/invite-staff.dto';
import { LockUserDto, UpdateUserStatusDto } from '../dtos/lock-user.dto';
import { QuerySellerRequestsDto } from '../dtos/query-seller-requests.dto';
import { QueryStaffDto } from '../dtos/query-staff.dto';
import { QueryUsersDto } from '../dtos/query-users.dto';
import { RejectSellerRequestDto } from '../dtos/reject-seller-request.dto';
import { UpdateUserRoleDto } from '../dtos/update-user-role.dto';
import { QueryAdminProductsDto } from '../dtos/query-admin-products.dto';
import { UpdateProductStatusDto } from '../dtos/update-product-status.dto';
import { QueryAdminShopsDto } from '../dtos/query-admin-shops.dto';
import { UpdateShopStatusDto } from '../dtos/update-shop-status.dto';
import { WarnShopDto } from '../dtos/warn-shop.dto';
import { CreateShopViolationDto } from '../dtos/create-shop-violation.dto';
import { ResolveShopAppealDto } from '../dtos/resolve-shop-appeal.dto';
import { ReviewWithdrawalDto } from '../dtos/review-withdrawal.dto';
import { UpdateSystemSettingsDto } from '../dtos/update-system-settings.dto';
import {
  DepositAdminWalletDto,
  QueryAdminWalletTransactionsDto,
  AdminWalletResponseDto,
  AdminWalletTransactionsResponseDto,
} from '../dtos/admin-wallet.dto';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminProductsService } from '../services/admin-products.service';
import { AdminShopsService } from '../services/admin-shops.service';
import { AdminSettingsService } from '../services/admin-settings.service';
import { AdminFinanceService } from '../services/admin-finance.service';
import { AdminDisputesService } from '../services/admin-disputes.service';
import { QueryAdminDisputesDto } from '../dtos/query-admin-disputes.dto';
import { CategoryService } from '../../catalog/services/category.service';
import { CreateCategoryDto } from '../../catalog/dtos/create-category.dto';
import { UpdateCategoryDto } from '../../catalog/dtos/update-category.dto';

@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminUsersService: AdminUsersService,
    private readonly adminProductsService: AdminProductsService,
    private readonly adminShopsService: AdminShopsService,
    private readonly adminSettingsService: AdminSettingsService,
    private readonly adminFinanceService: AdminFinanceService,
    private readonly adminDisputesService: AdminDisputesService,
    private readonly categoryService: CategoryService,
  ) {}

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
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.adminService.createStaff(dto);
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
  async inviteStaff(@Body() dto: AdminInviteStaffDto) {
    return this.adminService.inviteStaff(dto);
  }

  @Get('staff')
  @ApiOperation({
    summary: 'List support staff members',
  })
  @ApiResponse({ status: 200, description: 'Staff members retrieved successfully' })
  async listStaff(@Query() query: QueryStaffDto) {
    return this.adminService.listStaff(query);
  }

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

  @Get('products')
  @ApiOperation({
    summary: 'List platform-wide catalog products',
    description:
      'Supports keyword search, status filtering (ACTIVE, INACTIVE, DRAFT), seller filtering, and category pagination.',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async listProducts(@Query() query: QueryAdminProductsDto) {
    return this.adminProductsService.listProducts(query);
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'Retrieve product details with inventory breakdown and seller profile',
  })
  @ApiResponse({ status: 200, description: 'Product details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(@Param('id') id: string) {
    return this.adminProductsService.getProductById(id);
  }

  @Patch('products/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update product publication status',
    description:
      'Updates product status to ACTIVE (approved for sale) or INACTIVE (hidden due to policy violations).',
  })
  @ApiResponse({ status: 200, description: 'Product status updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProductStatus(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.adminProductsService.updateProductStatus(id, admin.id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete or archive product',
    description:
      'Permanently deletes product if no orders exist, or deactivates it to retain historical order integrity.',
  })
  @ApiResponse({ status: 200, description: 'Product removed or archived successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUserPayload) {
    return this.adminProductsService.deleteProduct(id, admin.id);
  }

  @Get('shops')
  @ApiOperation({
    summary: 'List registered seller shops',
    description:
      'Filters shops by status (ACTIVE or SUSPENDED), geographical location, or keyword search.',
  })
  @ApiResponse({ status: 200, description: 'Shops retrieved successfully' })
  async listShops(@Query() query: QueryAdminShopsDto) {
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
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: UpdateShopStatusDto,
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
  async getShopDetail(@Param('id') id: string) {
    return this.adminShopsService.getShopDetail(id);
  }

  @Get('shops/:id/orders')
  @ApiOperation({
    summary: 'List orders associated with a specific shop',
    description: 'Supports pagination and filtering across order fulfillment statuses.',
  })
  @ApiResponse({ status: 200, description: 'Shop orders retrieved successfully' })
  async getShopOrders(
    @Param('id') id: string,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminShopsService.getShopOrders(id, { status, page, limit });
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
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: WarnShopDto,
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
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: ResolveShopAppealDto,
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
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: CreateShopViolationDto,
  ) {
    return this.adminShopsService.createShopViolation(id, admin.id, dto);
  }

  @Get('shops/:id/violations')
  @ApiOperation({
    summary: 'List recorded violations for a specific shop',
  })
  @ApiResponse({ status: 200, description: 'Violations retrieved successfully' })
  async getShopViolations(@Param('id') id: string) {
    return this.adminShopsService.getShopViolations(id);
  }

  @Get('shops/:id/action-logs')
  @ApiOperation({
    summary: 'List administrative audit logs for a shop',
  })
  @ApiResponse({ status: 200, description: 'Action logs retrieved successfully' })
  async getShopActionLogs(@Param('id') id: string) {
    return this.adminShopsService.getShopActionLogs(id);
  }

  @Get('withdrawals')
  @ApiOperation({
    summary: 'List seller withdrawal requests',
    description:
      'Filters withdrawal applications by status (PENDING, APPROVED, REJECTED, COMPLETED) with pagination.',
  })
  @ApiResponse({ status: 200, description: 'Withdrawal requests retrieved successfully' })
  async listWithdrawals(
    @Query('status') status?: WithdrawalStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listWithdrawalRequests(status, page, limit);
  }

  @Patch('withdrawals/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Review and decide seller withdrawal request',
    description:
      'Releases locked funds back to wallet on rejection, or deducts locked balance upon approval.',
  })
  @ApiResponse({ status: 200, description: 'Withdrawal request decision processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data or request already settled' })
  @ApiResponse({ status: 404, description: 'Withdrawal request not found' })
  async reviewWithdrawal(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @Body() dto: ReviewWithdrawalDto,
  ) {
    return this.adminService.reviewWithdrawalRequest(id, admin.id, dto);
  }

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

  @Get('finance/analytics')
  @ApiOperation({
    summary: '[Admin] Get financial fee revenue and auction bid analytics',
    description:
      'Alternative endpoint providing platform fee trend periods, revenue composition items, and hourly bid frequency metrics for financial reporting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Finance analytics retrieved successfully',
  })
  async getFinanceAnalytics() {
    return this.adminFinanceService.getDashboardAnalytics();
  }

  @Get('wallet')
  @ApiOperation({
    summary: 'Retrieve administrative platform wallet balance and cumulative commission totals',
    description:
      'Returns current operational balance, collected platform transaction commissions, and cumulative manual deposits.',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform wallet details retrieved successfully',
    type: AdminWalletResponseDto,
  })
  async getAdminWallet(@CurrentUser('id') adminId: string) {
    return this.adminFinanceService.getAdminWallet(adminId);
  }

  @Get('wallet/transactions')
  @ApiOperation({
    summary: 'List administrative wallet transaction ledger',
    description:
      'Details escrow hold transactions, shop disbursements, carrier postage debits, and platform commission earnings.',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet transactions retrieved successfully',
    type: AdminWalletTransactionsResponseDto,
  })
  async getAdminWalletTransactions(
    @CurrentUser('id') adminId: string,
    @Query() query: QueryAdminWalletTransactionsDto,
  ) {
    return this.adminFinanceService.getAdminWalletTransactions(adminId, query);
  }

  @Post('wallet/deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deposit operational funds into administrative wallet',
    description:
      'Allows administrators to inject operational working capital into the platform wallet with audit transaction records.',
  })
  @ApiResponse({ status: 200, description: 'Deposit processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid deposit amount' })
  async depositAdminWallet(@CurrentUser('id') adminId: string, @Body() dto: DepositAdminWalletDto) {
    return this.adminFinanceService.depositToAdminWallet(adminId, dto);
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

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create product catalog category',
    description:
      'Creates root level categories or nested subcategories up to three tiers deep using parentId.',
  })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Exceeds maximum taxonomy depth or invalid input' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto);
  }

  @Patch('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update catalog category attributes and hierarchy',
    description: 'Updates category name, slug, or moves category to a new parent node.',
  })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Circular hierarchy detected or taxonomy depth exceeded',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete catalog category',
    description:
      'Removes empty categories that possess no child categories and no associated products.',
  })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Category contains active child categories or linked products',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
