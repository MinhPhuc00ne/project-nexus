import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody } from '@nexus/contracts/nest';
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
    summary: '[BUYER / USER] Xem số dư ví và lịch sử giao dịch cá nhân',
    description: 'Trả về số dư khả dụng, tiền tạm giữ và danh sách các giao dịch gần nhất của ví.',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin ví thành công' })
  async getMyWallet(@CurrentUser('id') userId: string) {
    return this.deposits.getUserWallet(userId);
  }

  @Post('wallet/deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / USER] Nạp tiền vào ví cá nhân (NEXUS Pay)',
    description:
      'Nạp tiền vào ví để mua sắm và thanh toán đơn hàng bằng số dư ví. Hỗ trợ tạo liên kết PayOS VietQR hoặc nạp trực tiếp.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nạp tiền thành công hoặc trả về thông tin VietQR PayOS',
  })
  @ApiResponse({ status: 400, description: 'Số tiền nạp không hợp lệ' })
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
    summary: '[BUYER / USER] Kiểm tra trạng thái nạp tiền ví qua PayOS',
    description:
      'Kiểm tra trạng thái giao dịch nạp tiền ví theo orderCode và đồng bộ với cổng PayOS.',
  })
  @ApiResponse({ status: 200, description: 'Lấy trạng thái nạp tiền thành công' })
  async checkWalletDepositStatus(
    @CurrentUser('id') userId: string,
    @Param('orderCode') orderCode: string,
  ) {
    return this.deposits.checkPayosWalletDepositStatus(Number(orderCode), userId);
  }
}
