import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { Role, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';

const depositAdminWalletFields = {
  amount: z
    .number()
    .min(10000)
    .describe('Số tiền nạp vào ví hệ thống (VND, tối thiểu 10.000 VNĐ)')
    .meta({ example: 1000000 }),
  description: nullAsAbsent(
    z
      .string()
      .describe('Ghi chú lý do nạp tiền vào ví hệ thống')
      .meta({ example: 'Nạp quỹ dự phòng bảo chứng thanh toán' }),
  ),
};

export const DepositAdminWalletSchema = z.object(depositAdminWalletFields).strict();

export type DepositAdminWalletInput = z.infer<typeof DepositAdminWalletSchema>;

const queryAdminWalletTransactionsFields = {
  page: z.coerce.number().int().min(1).describe('Số trang').meta({ example: 1 }).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Số bản ghi mỗi trang')
    .meta({ example: 10 })
    .default(10),
  type: nullAsAbsent(
    z
      .enum(WalletTransactionType)
      .describe('Lọc theo loại giao dịch (PLATFORM_FEE, DEPOSIT, WITHDRAW...)'),
  ),
  startDate: nullAsAbsent(
    z.string().describe('Từ ngày (YYYY-MM-DD)').meta({ example: '2026-10-01' }),
  ),
  endDate: nullAsAbsent(
    z.string().describe('Đến ngày (YYYY-MM-DD)').meta({ example: '2026-10-31' }),
  ),
  search: nullAsAbsent(z.string().describe('Tìm kiếm theo mã đơn hàng hoặc mô tả')),
};

export const QueryAdminWalletTransactionsSchema = z
  .object(queryAdminWalletTransactionsFields)
  .strict();

export type QueryAdminWalletTransactionsInput = z.infer<typeof QueryAdminWalletTransactionsSchema>;

const queryPlatformUserWalletTransactionsFields = {
  ...queryAdminWalletTransactionsFields,
  status: nullAsAbsent(
    z
      .enum(WalletTransactionStatus)
      .describe('Lọc theo trạng thái giao dịch (PENDING, SUCCESS, FAILED)'),
  ),
  role: nullAsAbsent(
    z.enum(Role).describe('Lọc theo vai trò người dùng (BUYER, SELLER, SUPPORT_STAFF, ADMIN)'),
  ),
  userId: nullAsAbsent(z.string().describe('Lọc theo ID người dùng cụ thể')),
};

export const QueryPlatformUserWalletTransactionsSchema = z
  .object(queryPlatformUserWalletTransactionsFields)
  .strict();

export type QueryPlatformUserWalletTransactionsInput = z.infer<
  typeof QueryPlatformUserWalletTransactionsSchema
>;

export const AdminWalletResponseSchema = z.object({
  walletId: z.string().describe('ID của ví hệ thống').meta({ example: 'w-1234-5678' }),
  userId: z.string().describe('ID tài khoản quản trị viên').meta({ example: 'u-admin-001' }),
  balance: z.number().describe('Số dư khả dụng hiện tại (VND)').meta({ example: 5000000 }),
  lockedBalance: z.number().describe('Số dư đóng băng / ký quỹ (VND)').meta({ example: 0 }),
  currency: z.string().describe('Đơn vị tiền tệ').meta({ example: 'VND' }),
  totalPlatformFeeCollected: z
    .number()
    .describe('Tổng doanh thu hoa hồng sàn (% phí sàn) đã thu')
    .meta({ example: 350000 }),
  totalDeposited: z
    .number()
    .describe('Tổng số tiền Admin đã nạp vào ví hệ thống')
    .meta({ example: 10000000 }),
  totalTransactions: z
    .number()
    .describe('Tổng số lượng giao dịch phát sinh trên ví')
    .meta({ example: 42 }),
  updatedAt: z.iso
    .datetime()
    .describe('Thời gian cập nhật gần nhất')
    .meta({ example: '2026-10-28T00:00:00.000Z' }),
});

export type AdminWalletResponseDto = Omit<
  z.infer<typeof AdminWalletResponseSchema>,
  'updatedAt'
> & {
  updatedAt: Date | string;
};

export const AdminWalletOrderDetailsSchema = z.object({
  orderId: z.string().describe('Mã đơn hàng liên kết').meta({ example: 'o-9876-5432' }),
  buyerName: z
    .string()
    .optional()
    .describe('Họ tên người mua (Buyer)')
    .meta({ example: 'Nguyễn Văn A' }),
  buyerEmail: z
    .string()
    .optional()
    .describe('Email người mua')
    .meta({ example: 'buyer@example.com' }),
  shopName: z
    .string()
    .optional()
    .describe('Tên người bán / cửa hàng (Seller/Shop)')
    .meta({ example: 'Shop Thời Trang ABC' }),
  sellerEmail: z
    .string()
    .optional()
    .describe('Email người bán')
    .meta({ example: 'seller@example.com' }),
  subtotal: z.number().describe('Tiền hàng gốc (chưa gồm phí ship)').meta({ example: 100000 }),
  shippingFee: z.number().describe('Cước vận chuyển GHN').meta({ example: 30000 }),
  totalAmount: z.number().describe('Tổng tiền người mua đã thanh toán').meta({ example: 130000 }),
  platformFee: z.number().describe('Phí sàn thu được từ đơn (7%)').meta({ example: 7000 }),
  sellerPayout: z
    .number()
    .describe('Số tiền thực tế giải ngân cho người bán')
    .meta({ example: 93000 }),
  waybillCode: z
    .string()
    .optional()
    .describe('Mã vận đơn giao hàng')
    .meta({ example: 'GHN123456789VN' }),
  carrier: z.string().optional().describe('Đơn vị vận chuyển').meta({ example: 'GHN' }),
});

export type AdminWalletOrderDetailsDto = z.infer<typeof AdminWalletOrderDetailsSchema>;

export const AdminWalletTransactionItemSchema = z.object({
  id: z.string().describe('Mã giao dịch ví').meta({ example: 'tx-112233' }),
  walletId: z.string().describe('Mã ví nhận / trừ tiền').meta({ example: 'w-1234-5678' }),
  amount: z.number().describe('Số tiền biến động (VND)').meta({ example: 130000 }),
  type: z
    .enum(WalletTransactionType)
    .describe('Loại biến động số dư')
    .meta({ example: 'ESCROW_LOCK' }),
  status: z.string().describe('Trạng thái giao dịch').meta({ example: 'SUCCESS' }),
  referenceId: z
    .string()
    .optional()
    .describe('Mã đối chiếu tham chiếu (Order ID)')
    .meta({ example: 'o-9876-5432' }),
  description: z
    .string()
    .optional()
    .describe('Nội dung mô tả')
    .meta({ example: 'Tạm giữ thanh toán đơn hàng #o-9876-54' }),
  createdAt: z.iso
    .datetime()
    .describe('Thời điểm tạo giao dịch')
    .meta({ example: '2026-10-28T00:00:00.000Z' }),
  orderDetails: AdminWalletOrderDetailsSchema.nullable()
    .optional()
    .describe('Thông tin chi tiết về người mua, shop và dòng tiền đơn hàng'),
});

export type AdminWalletTransactionItemDto = Omit<
  z.infer<typeof AdminWalletTransactionItemSchema>,
  'createdAt'
> & {
  createdAt: Date | string;
};

export const AdminWalletTransactionsResponseSchema = z.object({
  total: z.number().describe('Tổng số giao dịch thỏa mãn điều kiện').meta({ example: 100 }),
  page: z.number().describe('Trang hiện tại').meta({ example: 1 }),
  limit: z.number().describe('Số bản ghi trên mỗi trang').meta({ example: 10 }),
  totalPages: z.number().describe('Tổng số trang').meta({ example: 10 }),
  items: z.array(AdminWalletTransactionItemSchema).describe('Danh sách các giao dịch'),
});

export type AdminWalletTransactionsResponseDto = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: AdminWalletTransactionItemDto[];
};
