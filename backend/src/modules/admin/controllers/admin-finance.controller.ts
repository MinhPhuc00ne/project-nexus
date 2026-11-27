import { Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam, ZodQuery } from '@nexus/contracts/nest';
import { UuidParamSchema } from '@nexus/contracts';
import { Role } from '@prisma/client';
import {
  AdminWithdrawalsQuery,
  AdminWithdrawalsQuerySchema,
} from '../../../core/validation/query-schemas';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  AuthenticatedUserPayload,
  CurrentUser,
  Roles,
} from '../../../core/security/roles.decorator';
import { AdminService } from '../services/admin.service';

import { ReviewWithdrawalInput, ReviewWithdrawalSchema } from '../dtos/review-withdrawal.dto';

import {
  AdminWalletResponseSchema,
  AdminWalletTransactionsResponseSchema,
  DepositAdminWalletInput,
  DepositAdminWalletSchema,
  QueryAdminWalletTransactionsInput,
  QueryAdminWalletTransactionsSchema,
  QueryPlatformUserWalletTransactionsInput,
  QueryPlatformUserWalletTransactionsSchema,
} from '../dtos/admin-wallet.dto';

import { AdminFinanceService } from '../services/admin-finance.service';

/** The platform's own money: its wallet, its revenue and the withdrawals it approves. */
@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminFinanceController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminFinanceService: AdminFinanceService,
  ) {}

  @Get('withdrawals')
  @ApiOperation({
    summary: 'List seller withdrawal requests',
    description:
      'Filters withdrawal applications by status (PENDING, APPROVED, REJECTED, COMPLETED) with pagination.',
  })
  @ApiResponse({ status: 200, description: 'Withdrawal requests retrieved successfully' })
  async listWithdrawals(@ZodQuery(AdminWithdrawalsQuerySchema) query: AdminWithdrawalsQuery) {
    return this.adminService.listWithdrawalRequests(query.status, query.page, query.limit);
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
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @ZodBody(ReviewWithdrawalSchema) dto: ReviewWithdrawalInput,
  ) {
    return this.adminService.reviewWithdrawalRequest(id, admin.id, dto);
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
  @ApiOkResponse({
    description: 'Platform wallet details retrieved successfully',
    standardSchema: AdminWalletResponseSchema,
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
  @ApiOkResponse({
    description: 'Wallet transactions retrieved successfully',
    standardSchema: AdminWalletTransactionsResponseSchema,
  })
  async getAdminWalletTransactions(
    @CurrentUser('id') adminId: string,
    @ZodQuery(QueryAdminWalletTransactionsSchema) query: QueryAdminWalletTransactionsInput,
  ) {
    return this.adminFinanceService.getAdminWalletTransactions(adminId, query);
  }

  @Get('wallet/user-transactions')
  @ApiOperation({
    summary: 'List platform-wide user wallet transactions (deposits, withdrawals, escrow, refunds)',
    description:
      'Queries wallet transaction history across Buyer and Seller accounts with filters for type (DEPOSIT, WITHDRAW...), status, role, userId, date range, and keyword search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform user wallet transactions retrieved successfully',
  })
  async getPlatformUserWalletTransactions(
    @ZodQuery(QueryPlatformUserWalletTransactionsSchema)
    query: QueryPlatformUserWalletTransactionsInput,
  ) {
    return this.adminFinanceService.getPlatformUserWalletTransactions(query);
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
  async depositAdminWallet(
    @CurrentUser('id') adminId: string,
    @ZodBody(DepositAdminWalletSchema) dto: DepositAdminWalletInput,
  ) {
    return this.adminFinanceService.depositToAdminWallet(adminId, dto);
  }
}
