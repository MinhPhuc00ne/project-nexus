import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery } from '@nexus/contracts/nest';
import {
  StandardPaginationQuery,
  StandardPaginationQuerySchema,
} from '../../../core/validation/query-schemas';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { Role } from '@nexus/contracts';
import { SellerFinanceService } from '../services/seller-finance.service';
import { CreateWithdrawalInput, CreateWithdrawalSchema } from '../dtos/create-withdrawal.dto';
import { QueryFinanceInput, QueryFinanceSchema } from '../dtos/query-finance.dto';

@ApiTags('3. SELLER')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER, Role.ADMIN)
@Controller('seller/finance')
export class SellerFinanceController {
  constructor(private readonly sellerFinanceService: SellerFinanceService) {}

  @Get('revenue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Get shop revenue overview, wallet balance, and financial breakdown',
    description:
      'Aggregates available balance, held funds, total sales, estimated platform fees, and monthly revenue breakdown.',
  })
  @ApiResponse({ status: 200, description: 'Revenue overview retrieved successfully' })
  async getRevenueOverview(@CurrentUser('id') sellerId: string) {
    return this.sellerFinanceService.getRevenueOverview(sellerId);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[SELLER] Create a withdrawal request from wallet balance to bank account',
    description:
      'Validates available balance, freezes the requested amount in the wallet, and submits a payout request for Admin approval.',
  })
  @ApiResponse({ status: 201, description: 'Withdrawal request created successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or invalid withdrawal amount' })
  async createWithdrawal(
    @CurrentUser('id') sellerId: string,
    @ZodBody(CreateWithdrawalSchema) dto: CreateWithdrawalInput,
  ) {
    return this.sellerFinanceService.createWithdrawal(sellerId, dto);
  }

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] List shop wallet transaction history',
    description:
      'Supports pagination and filtering by transaction type (DEPOSIT, WITHDRAW, ESCROW_PAYOUT) and status (PENDING, SUCCESS, FAILED).',
  })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved successfully' })
  async getTransactions(
    @CurrentUser('id') sellerId: string,
    @ZodQuery(QueryFinanceSchema) query: QueryFinanceInput,
  ) {
    return this.sellerFinanceService.getTransactions(sellerId, query);
  }

  @Get('withdrawals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] List submitted withdrawal requests and approval status',
  })
  @ApiResponse({ status: 200, description: 'Withdrawal requests retrieved successfully' })
  async getWithdrawals(
    @CurrentUser('id') sellerId: string,
    @ZodQuery(StandardPaginationQuerySchema) query: StandardPaginationQuery,
  ) {
    return this.sellerFinanceService.getWithdrawals(sellerId, query.page, query.limit);
  }
}
