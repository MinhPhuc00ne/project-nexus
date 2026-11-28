import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NumericCodeParamSchema } from '@nexus/contracts';
import { ZodBody, ZodParam } from '@nexus/contracts/nest';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser } from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import { DepositWalletInput, DepositWalletSchema } from '../dtos/deposit-wallet.dto';
import { WalletDepositService } from '../services/wallet-deposit.service';

/**
 * A person's own NEXUS Pay wallet.
 *
 * These three routes hung off the order controller and were answered by three
 * one-line methods on `OrderService` that forwarded to a wallet helper, so
 * reading an order's code meant reading past wallet top-ups. The paths are
 * unchanged — they are a published API — only who answers them.
 */
@ApiTags('8. COMMERCE - WALLET')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commerce')
export class WalletController {
  constructor(private readonly deposits: WalletDepositService) {}

  @Get('wallet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / USER] Get personal wallet balance and transaction history',
    description: 'Returns available balance, held balance, and recent wallet transactions.',
  })
  @ApiResponse({ status: 200, description: 'Wallet details retrieved successfully' })
  async getMyWallet(@CurrentUser('id') userId: string) {
    return this.deposits.getUserWallet(userId);
  }

  @Post('wallet/deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / USER] Top up personal NEXUS Pay wallet',
    description:
      'Adds funds to the wallet for purchases via PayOS VietQR payment link or direct top-up.',
  })
  @ApiResponse({
    status: 200,
    description: 'Top-up completed or PayOS VietQR payment link returned',
  })
  @ApiResponse({ status: 400, description: 'Invalid top-up amount' })
  async depositMyWallet(
    @CurrentUser('id') userId: string,
    @ZodBody(DepositWalletSchema) dto: DepositWalletInput,
  ) {
    return this.deposits.depositToUserWallet(userId, {
      ...dto,
      provider: dto.provider || 'PAYOS',
    });
  }

  @Get('wallet/deposit/:orderCode/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / USER] Check PayOS wallet top-up status',
    description: 'Checks wallet deposit status by orderCode and synchronizes with PayOS.',
  })
  @ApiResponse({ status: 200, description: 'Deposit status retrieved successfully' })
  async checkWalletDepositStatus(
    @CurrentUser('id') userId: string,
    @ZodParam('orderCode', NumericCodeParamSchema) orderCode: string,
  ) {
    return this.deposits.checkPayosWalletDepositStatus(Number(orderCode), userId);
  }
}
