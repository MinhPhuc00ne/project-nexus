import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletTransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DepositAdminWalletDto {
  @ApiProperty({
    example: 1000000,
    description: 'Số tiền nạp vào ví hệ thống (VND, tối thiểu 10.000 VNĐ)',
  })
  @IsNumber()
  @Min(10000, { message: 'Số tiền nạp tối thiểu là 10.000 VNĐ' })
  amount: number;

  @ApiPropertyOptional({
    example: 'Nạp quỹ dự phòng bảo chứng thanh toán',
    description: 'Ghi chú lý do nạp tiền vào ví hệ thống',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class QueryAdminWalletTransactionsDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Số trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Số bản ghi mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: WalletTransactionType,
    description: 'Lọc theo loại giao dịch (PLATFORM_FEE, DEPOSIT, WITHDRAW...)',
  })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Từ ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Đến ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã đơn hàng hoặc mô tả' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminWalletResponseDto {
  @ApiProperty({ example: 'w-1234-5678', description: 'ID của ví hệ thống' })
  walletId: string;

  @ApiProperty({ example: 'u-admin-001', description: 'ID tài khoản quản trị viên' })
  userId: string;

  @ApiProperty({ example: 5000000, description: 'Số dư khả dụng hiện tại (VND)' })
  balance: number;

  @ApiProperty({ example: 0, description: 'Số dư đóng băng / ký quỹ (VND)' })
  lockedBalance: number;

  @ApiProperty({ example: 'VND', description: 'Đơn vị tiền tệ' })
  currency: string;

  @ApiProperty({ example: 350000, description: 'Tổng doanh thu hoa hồng sàn (% phí sàn) đã thu' })
  totalPlatformFeeCollected: number;

  @ApiProperty({ example: 10000000, description: 'Tổng số tiền Admin đã nạp vào ví hệ thống' })
  totalDeposited: number;

  @ApiProperty({ example: 42, description: 'Tổng số lượng giao dịch phát sinh trên ví' })
  totalTransactions: number;

  @ApiProperty({ example: '2026-10-28T00:00:00.000Z', description: 'Thời gian cập nhật gần nhất' })
  updatedAt: Date;
}

export class AdminWalletOrderDetailsDto {
  @ApiProperty({ example: 'o-9876-5432', description: 'Mã đơn hàng liên kết' })
  orderId: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A', description: 'Họ tên người mua (Buyer)' })
  buyerName?: string;

  @ApiPropertyOptional({ example: 'buyer@example.com', description: 'Email người mua' })
  buyerEmail?: string;

  @ApiPropertyOptional({
    example: 'Shop Thời Trang ABC',
    description: 'Tên người bán / cửa hàng (Seller/Shop)',
  })
  shopName?: string;

  @ApiPropertyOptional({ example: 'seller@example.com', description: 'Email người bán' })
  sellerEmail?: string;

  @ApiProperty({ example: 100000, description: 'Tiền hàng gốc (chưa gồm phí ship)' })
  subtotal: number;

  @ApiProperty({ example: 30000, description: 'Cước vận chuyển GHN' })
  shippingFee: number;

  @ApiProperty({ example: 130000, description: 'Tổng tiền người mua đã thanh toán' })
  totalAmount: number;

  @ApiProperty({ example: 7000, description: 'Phí sàn thu được từ đơn (7%)' })
  platformFee: number;

  @ApiProperty({ example: 93000, description: 'Số tiền thực tế giải ngân cho người bán' })
  sellerPayout: number;

  @ApiPropertyOptional({ example: 'GHN123456789VN', description: 'Mã vận đơn giao hàng' })
  waybillCode?: string;

  @ApiPropertyOptional({ example: 'GHN', description: 'Đơn vị vận chuyển' })
  carrier?: string;
}

export class AdminWalletTransactionItemDto {
  @ApiProperty({ example: 'tx-112233', description: 'Mã giao dịch ví' })
  id: string;

  @ApiProperty({ example: 'w-1234-5678', description: 'Mã ví nhận / trừ tiền' })
  walletId: string;

  @ApiProperty({ example: 130000, description: 'Số tiền biến động (VND)' })
  amount: number;

  @ApiProperty({
    enum: WalletTransactionType,
    example: 'ESCROW_LOCK',
    description: 'Loại biến động số dư',
  })
  type: WalletTransactionType;

  @ApiProperty({ example: 'SUCCESS', description: 'Trạng thái giao dịch' })
  status: string;

  @ApiPropertyOptional({
    example: 'o-9876-5432',
    description: 'Mã đối chiếu tham chiếu (Order ID)',
  })
  referenceId?: string;

  @ApiPropertyOptional({
    example: 'Tạm giữ thanh toán đơn hàng #o-9876-54',
    description: 'Nội dung mô tả',
  })
  description?: string;

  @ApiProperty({ example: '2026-10-28T00:00:00.000Z', description: 'Thời điểm tạo giao dịch' })
  createdAt: Date;

  @ApiPropertyOptional({
    type: () => AdminWalletOrderDetailsDto,
    description: 'Thông tin chi tiết về người mua, shop và dòng tiền đơn hàng',
  })
  orderDetails?: AdminWalletOrderDetailsDto | null;
}

export class AdminWalletTransactionsResponseDto {
  @ApiProperty({ example: 100, description: 'Tổng số giao dịch thỏa mãn điều kiện' })
  total: number;

  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  page: number;

  @ApiProperty({ example: 10, description: 'Số bản ghi trên mỗi trang' })
  limit: number;

  @ApiProperty({ example: 10, description: 'Tổng số trang' })
  totalPages: number;

  @ApiProperty({ type: [AdminWalletTransactionItemDto], description: 'Danh sách các giao dịch' })
  items: AdminWalletTransactionItemDto[];
}
