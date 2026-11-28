import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { Role, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';

const depositAdminWalletFields = {
  amount: z
    .number()
    .min(10000)
    .describe('Amount to deposit into the system wallet (VND, minimum 10,000 VND)')
    .meta({ example: 1000000 }),
  description: nullAsAbsent(
    z
      .string()
      .describe('Note explaining the system wallet deposit')
      .meta({ example: 'Top up payment escrow reserve fund' }),
  ),
};

export const DepositAdminWalletSchema = z.object(depositAdminWalletFields).strict();

export type DepositAdminWalletInput = z.infer<typeof DepositAdminWalletSchema>;

const queryAdminWalletTransactionsFields = {
  page: z.coerce.number().int().min(1).describe('Page number').meta({ example: 1 }).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Records per page')
    .meta({ example: 10 })
    .default(10),
  type: nullAsAbsent(
    z
      .enum(WalletTransactionType)
      .describe('Filter by transaction type (PLATFORM_FEE, DEPOSIT, WITHDRAW...)'),
  ),
  startDate: nullAsAbsent(
    z.string().describe('Start date (YYYY-MM-DD)').meta({ example: '2026-10-01' }),
  ),
  endDate: nullAsAbsent(
    z.string().describe('End date (YYYY-MM-DD)').meta({ example: '2026-10-31' }),
  ),
  search: nullAsAbsent(z.string().describe('Search by order code or description')),
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
      .describe('Filter by transaction status (PENDING, SUCCESS, FAILED)'),
  ),
  role: nullAsAbsent(
    z.enum(Role).describe('Filter by user role (BUYER, SELLER, SUPPORT_STAFF, ADMIN)'),
  ),
  userId: nullAsAbsent(z.string().describe('Filter by specific user ID')),
};

export const QueryPlatformUserWalletTransactionsSchema = z
  .object(queryPlatformUserWalletTransactionsFields)
  .strict();

export type QueryPlatformUserWalletTransactionsInput = z.infer<
  typeof QueryPlatformUserWalletTransactionsSchema
>;

export const AdminWalletResponseSchema = z.object({
  walletId: z.string().describe('System wallet ID').meta({ example: 'w-1234-5678' }),
  userId: z.string().describe('Administrator user ID').meta({ example: 'u-admin-001' }),
  balance: z.number().describe('Current available balance (VND)').meta({ example: 5000000 }),
  lockedBalance: z.number().describe('Locked or escrow balance (VND)').meta({ example: 0 }),
  currency: z.string().describe('Currency code').meta({ example: 'VND' }),
  totalPlatformFeeCollected: z
    .number()
    .describe('Total platform commission fees collected')
    .meta({ example: 350000 }),
  totalDeposited: z
    .number()
    .describe('Total amount deposited into the system wallet by Admin')
    .meta({ example: 10000000 }),
  totalTransactions: z
    .number()
    .describe('Total number of wallet transactions')
    .meta({ example: 42 }),
  updatedAt: z.iso
    .datetime()
    .describe('Last updated timestamp')
    .meta({ example: '2026-10-28T00:00:00.000Z' }),
});

export type AdminWalletResponseDto = Omit<
  z.infer<typeof AdminWalletResponseSchema>,
  'updatedAt'
> & {
  updatedAt: Date | string;
};

export const AdminWalletOrderDetailsSchema = z.object({
  orderId: z.string().describe('Linked order ID').meta({ example: 'o-9876-5432' }),
  buyerName: z.string().optional().describe('Buyer full name').meta({ example: 'Jane Doe' }),
  buyerEmail: z.string().optional().describe('Buyer email').meta({ example: 'buyer@example.com' }),
  shopName: z
    .string()
    .optional()
    .describe('Seller or shop name')
    .meta({ example: 'ABC Fashion Shop' }),
  sellerEmail: z
    .string()
    .optional()
    .describe('Seller email')
    .meta({ example: 'seller@example.com' }),
  subtotal: z.number().describe('Item subtotal before shipping').meta({ example: 100000 }),
  shippingFee: z.number().describe('GHN shipping fee').meta({ example: 30000 }),
  totalAmount: z.number().describe('Total amount paid by buyer').meta({ example: 130000 }),
  platformFee: z
    .number()
    .describe('Platform fee collected from order (7%)')
    .meta({ example: 7000 }),
  sellerPayout: z.number().describe('Net amount disbursed to seller').meta({ example: 93000 }),
  waybillCode: z
    .string()
    .optional()
    .describe('Shipment waybill code')
    .meta({ example: 'GHN123456789VN' }),
  carrier: z.string().optional().describe('Shipping carrier').meta({ example: 'GHN' }),
});

export type AdminWalletOrderDetailsDto = z.infer<typeof AdminWalletOrderDetailsSchema>;

export const AdminWalletTransactionItemSchema = z.object({
  id: z.string().describe('Wallet transaction ID').meta({ example: 'tx-112233' }),
  walletId: z.string().describe('Target wallet ID').meta({ example: 'w-1234-5678' }),
  amount: z.number().describe('Transaction amount (VND)').meta({ example: 130000 }),
  type: z
    .enum(WalletTransactionType)
    .describe('Balance change type')
    .meta({ example: 'ESCROW_LOCK' }),
  status: z.string().describe('Transaction status').meta({ example: 'SUCCESS' }),
  referenceId: z
    .string()
    .optional()
    .describe('Reference Order ID')
    .meta({ example: 'o-9876-5432' }),
  description: z
    .string()
    .optional()
    .describe('Transaction description')
    .meta({ example: 'Escrow hold for order #o-9876-54' }),
  createdAt: z.iso
    .datetime()
    .describe('Transaction creation timestamp')
    .meta({ example: '2026-10-28T00:00:00.000Z' }),
  orderDetails: AdminWalletOrderDetailsSchema.nullable()
    .optional()
    .describe('Detailed buyer, shop, and order cashflow metadata'),
});

export type AdminWalletTransactionItemDto = Omit<
  z.infer<typeof AdminWalletTransactionItemSchema>,
  'createdAt'
> & {
  createdAt: Date | string;
};

export const AdminWalletTransactionsResponseSchema = z.object({
  total: z.number().describe('Total matching transactions').meta({ example: 100 }),
  page: z.number().describe('Current page').meta({ example: 1 }),
  limit: z.number().describe('Records per page').meta({ example: 10 }),
  totalPages: z.number().describe('Total pages').meta({ example: 10 }),
  items: z.array(AdminWalletTransactionItemSchema).describe('List of transactions'),
});

export type AdminWalletTransactionsResponseDto = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: AdminWalletTransactionItemDto[];
};
