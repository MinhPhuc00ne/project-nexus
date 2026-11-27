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
    summary: '[BUYER] Tạo yêu cầu rút tiền từ số dư ví về tài khoản ngân hàng',
    description:
      'Kiểm tra số dư khả dụng, đóng băng tạm thời số tiền rút trong ví và gửi yêu cầu đến Quản trị viên duyệt chuyển khoản.',
  })
  @ApiResponse({ status: 201, description: 'Tạo yêu cầu rút tiền thành công' })
  @ApiResponse({
    status: 400,
    description: 'Số dư không đủ, thiếu thông tin ngân hàng hoặc số tiền rút không hợp lệ',
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
    summary: '[BUYER] Xem lịch sử giao dịch tài chính / biến động số dư ví cá nhân',
    description:
      'Hỗ trợ phân trang và lọc theo loại giao dịch (DEPOSIT, WITHDRAW, ESCROW_REFUND...) và trạng thái (PENDING, SUCCESS, FAILED).',
  })
  @ApiResponse({ status: 200, description: 'Lấy lịch sử giao dịch thành công' })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @ZodQuery(QueryFinanceSchema) query: QueryFinanceInput,
  ) {
    return this.withdrawalService.getTransactions(userId, query);
  }

  @Get('withdrawals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER] Xem danh sách các yêu cầu rút tiền đã tạo và tiến độ duyệt',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách yêu cầu rút tiền thành công' })
  async getWithdrawals(
    @CurrentUser('id') userId: string,
    @ZodQuery(StandardPaginationQuerySchema) query: StandardPaginationQuery,
  ) {
    return this.withdrawalService.getWithdrawals(userId, query.page, query.limit);
  }
}
