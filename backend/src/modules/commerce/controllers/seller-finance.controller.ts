import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { Role } from '@nexus/types';
import { SellerFinanceService } from '../services/seller-finance.service';
import { CreateWithdrawalDto } from '../dtos/create-withdrawal.dto';
import { QueryFinanceDto } from '../dtos/query-finance.dto';

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
    summary: '[SELLER] Báo cáo doanh thu, số dư ví và chi tiết tài chính của Shop',
    description:
      'Tổng hợp số dư ví khả dụng, số tiền tạm giữ, tổng doanh số bán hàng, phí sàn ước tính và phân bổ doanh thu theo tháng.',
  })
  @ApiResponse({ status: 200, description: 'Lấy báo cáo doanh thu thành công' })
  async getRevenueOverview(@CurrentUser('id') sellerId: string) {
    return this.sellerFinanceService.getRevenueOverview(sellerId);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[SELLER] Tạo yêu cầu rút tiền từ số dư ví về tài khoản ngân hàng',
    description:
      'Kiểm tra số dư khả dụng, khóa tạm thời số tiền rút trong ví và gửi yêu cầu đến Quản trị viên duyệt chuyển khoản.',
  })
  @ApiResponse({ status: 201, description: 'Tạo yêu cầu rút tiền thành công' })
  @ApiResponse({ status: 400, description: 'Số dư không đủ hoặc số tiền rút không hợp lệ' })
  async createWithdrawal(@CurrentUser('id') sellerId: string, @Body() dto: CreateWithdrawalDto) {
    return this.sellerFinanceService.createWithdrawal(sellerId, dto);
  }

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Xem lịch sử giao dịch tài chính / biến động số dư ví của Shop',
    description:
      'Hỗ trợ phân trang và lọc theo loại giao dịch (DEPOSIT, WITHDRAW, ESCROW_PAYOUT...) và trạng thái (PENDING, SUCCESS, FAILED).',
  })
  @ApiResponse({ status: 200, description: 'Lấy lịch sử giao dịch thành công' })
  async getTransactions(@CurrentUser('id') sellerId: string, @Query() query: QueryFinanceDto) {
    return this.sellerFinanceService.getTransactions(sellerId, query);
  }

  @Get('withdrawals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Xem danh sách các yêu cầu rút tiền đã tạo và tiến độ duyệt',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách yêu cầu rút tiền thành công' })
  async getWithdrawals(
    @CurrentUser('id') sellerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.sellerFinanceService.getWithdrawals(sellerId, page, limit);
  }
}
