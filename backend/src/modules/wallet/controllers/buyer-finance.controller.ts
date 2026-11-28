import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery } from '@nexus/contracts/nest';
import {
  StandardPaginationQuery,
  StandardPaginationQuerySchema,
} from '../../../core/validation/query-schemas';
import { Role } from '@nexus/contracts';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { CreateWithdrawalInput, CreateWithdrawalSchema } from '../dtos/create-withdrawal.dto';
import { QueryFinanceInput, QueryFinanceSchema } from '../dtos/query-finance.dto';
import { WithdrawalService } from '../services/withdrawal.service';

@ApiTags('2. BUYER')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BUYER, Role.SELLER, Role.ADMIN)
@Controller('buyer/finance')
export class BuyerFinanceController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[BUYER] Create a withdrawal request from wallet balance to bank account',
    description:
      'Validates available balance, freezes the requested amount in the wallet, and submits a payout request for Admin approval.',
  })
  @ApiResponse({ status: 201, description: 'Withdrawal request created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance, missing bank details, or invalid withdrawal amount',
  })
  async createWithdrawal(
    @CurrentUser('id') userId: string,
    @ZodBody(CreateWithdrawalSchema) dto: CreateWithdrawalInput,
  ) {
    return this.withdrawalService.createWithdrawal(userId, dto);
  }

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER] List personal wallet transaction history',
    description:
      'Supports pagination and filtering by transaction type (DEPOSIT, WITHDRAW, ESCROW_REFUND) and status (PENDING, SUCCESS, FAILED).',
  })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved successfully' })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @ZodQuery(QueryFinanceSchema) query: QueryFinanceInput,
  ) {
    return this.withdrawalService.getTransactions(userId, query);
  }

  @Get('withdrawals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER] List submitted withdrawal requests and approval status',
  })
  @ApiResponse({ status: 200, description: 'Withdrawal requests retrieved successfully' })
  async getWithdrawals(
    @CurrentUser('id') userId: string,
    @ZodQuery(StandardPaginationQuerySchema) query: StandardPaginationQuery,
  ) {
    return this.withdrawalService.getWithdrawals(userId, query.page, query.limit);
  }
}
