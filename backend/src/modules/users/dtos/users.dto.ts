import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { SellerRequestStatus } from '@prisma/client';
import { Role } from '@nexus/types';

export interface UserProfileResponse {
  id: string;
  email: string;
  personalEmail?: string | null;
  platformEmail?: string | null;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role: Role;
  isSellerActive: boolean;
  currentMode?: 'SELLER' | 'BUYER';
  activeRole?: string;
  accountRole?: string;
  isShopSuspended?: boolean;
  suspensionReason?: string | null;
  walletBalance: number;
  reputationScore: number;
  trustLevel: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  createdAt: Date;
}

const updateBuyerProfileFields = {
  fullName: nullAsAbsent(
    z.string().describe('Updated full name').meta({ example: 'Nguyen Van A' }),
  ),
  phoneNumber: nullAsAbsent(
    z
      .string()
      .regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/)
      .describe('Updated 10-digit Vietnamese phone number')
      .meta({ example: '0901234567' }),
  ),
  avatarUrl: nullAsAbsent(
    z.string().describe('Avatar URL').meta({ example: 'https://example.com/avatar.png' }),
  ),
  bankName: nullAsAbsent(
    z.string().describe('Tên ngân hàng thụ hưởng').meta({ example: 'Vietcombank' }),
  ),
  accountNumber: nullAsAbsent(
    z.string().describe('Số tài khoản ngân hàng thụ hưởng').meta({ example: '1029384756' }),
  ),
  accountHolderName: nullAsAbsent(
    z
      .string()
      .describe('Họ và tên chủ tài khoản ngân hàng (viết hoa)')
      .meta({ example: 'NGUYEN VAN A' }),
  ),
  password: nullAsAbsent(
    z.string().describe('Mật khẩu tài khoản để xác minh trực tiếp khi Seller cập nhật hồ sơ'),
  ),
  verificationToken: nullAsAbsent(
    z.string().describe('Mã token xác minh đăng nhập gần đây của Seller'),
  ),
};

export const UpdateBuyerProfileSchema = z.object(updateBuyerProfileFields).strict();

export type UpdateBuyerProfileInput = z.infer<typeof UpdateBuyerProfileSchema>;

const applySellerUpgradeFields = {
  storeName: z.string().trim().min(1).describe('Store name').meta({ example: 'Nexus Super Store' }),
  storeDescription: nullAsAbsent(
    z.string().describe('Store description').meta({ example: 'Authentic electronics store' }),
  ),
  phone: z.string().trim().min(1).describe('Store contact phone').meta({ example: '0912345678' }),
  businessEmail: nullAsAbsent(
    z.email().describe('Business email').meta({ example: 'business@nexusstore.com' }),
  ),
  identityCardNumber: nullAsAbsent(
    z.string().describe('National identity card number').meta({ example: '012345678910' }),
  ),
  attachmentUrl: nullAsAbsent(
    z
      .string()
      .describe('Đường dẫn file chứng minh (nếu không upload trực tiếp file trong form-data)')
      .meta({ example: 'https://res.cloudinary.com/nexus/proof.jpg' }),
  ),
  street: z
    .string()
    .trim()
    .min(1)
    .describe('Store address / street')
    .meta({ example: '720A Điện Biên Phủ' }),
  ward: nullAsAbsent(z.string().meta({ example: 'Phường 22' })),
  district: nullAsAbsent(z.string().meta({ example: 'Quận Bình Thạnh' })),
  city: z.string().trim().min(1).meta({ example: 'TP. Hồ Chí Minh' }),
  latitude: nullAsAbsent(z.coerce.number().describe('GPS Latitude').meta({ example: 10.795 })),
  longitude: nullAsAbsent(z.coerce.number().describe('GPS Longitude').meta({ example: 106.721 })),
  formattedAddress: nullAsAbsent(
    z
      .string()
      .describe('Formatted address')
      .meta({ example: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh' }),
  ),
  placeId: nullAsAbsent(z.string().describe('Place ID').meta({ example: 'ChIJw8qV...' })),
};

export const ApplySellerUpgradeSchema = z.object(applySellerUpgradeFields).strict();

export type ApplySellerUpgradeInput = z.infer<typeof ApplySellerUpgradeSchema>;

const reviewSellerUpgradeFields = {
  status: z
    .enum(SellerRequestStatus)
    .describe('Decision: APPROVED or REJECTED')
    .meta({ example: SellerRequestStatus.APPROVED }),
  rejectionReason: nullAsAbsent(
    z
      .string()
      .describe('Rejection reason or review note')
      .meta({ example: 'Documents verified successfully' }),
  ),
};

export const ReviewSellerUpgradeSchema = z.object(reviewSellerUpgradeFields).strict();

export type ReviewSellerUpgradeInput = z.infer<typeof ReviewSellerUpgradeSchema>;

const createAddressFields = {
  recipientName: z
    .string()
    .trim()
    .min(1)
    .describe('Họ tên người nhận hàng')
    .meta({ example: 'Đinh Tú Liên' }),
  phone: z
    .string()
    .trim()
    .min(1)
    .describe('Số điện thoại người nhận')
    .meta({ example: '0909123456' }),
  street: z
    .string()
    .trim()
    .min(1)
    .describe('Địa chỉ cụ thể')
    .meta({ example: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ' }),
  ward: nullAsAbsent(z.string().meta({ example: 'Phường 22' })),
  district: nullAsAbsent(z.string().meta({ example: 'Quận Bình Thạnh' })),
  city: z.string().trim().min(1).meta({ example: 'TP. Hồ Chí Minh' }),
  latitude: nullAsAbsent(
    z.coerce.number().describe('Vĩ độ GPS (Latitude) từ bản đồ').meta({ example: 10.795 }),
  ),
  longitude: nullAsAbsent(
    z.coerce.number().describe('Kinh độ GPS (Longitude) từ bản đồ').meta({ example: 106.721 }),
  ),
  formattedAddress: nullAsAbsent(
    z
      .string()
      .describe('Địa chỉ đầy đủ định dạng chuẩn bản đồ')
      .meta({ example: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh' }),
  ),
  placeId: nullAsAbsent(
    z.string().describe('Google / OSM Place ID').meta({ example: 'ChIJw8qV...' }),
  ),
  isDefault: z.boolean().meta({ example: true }).default(false),
};

export const CreateAddressSchema = z.object(createAddressFields).strict();

export type CreateAddressInput = z.infer<typeof CreateAddressSchema>;
const updateAddressFields = {
  recipientName: nullAsAbsent(z.string().meta({ example: 'Nguyen Van A' })),
  phone: nullAsAbsent(z.string().meta({ example: '0909123456' })),
  street: nullAsAbsent(z.string().meta({ example: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ' })),
  ward: nullAsAbsent(z.string().meta({ example: 'Phường 22' })),
  district: nullAsAbsent(z.string().meta({ example: 'Quận Bình Thạnh' })),
  city: nullAsAbsent(z.string().meta({ example: 'TP. Hồ Chí Minh' })),
  latitude: nullAsAbsent(z.coerce.number().meta({ example: 10.795 })),
  longitude: nullAsAbsent(z.coerce.number().meta({ example: 106.721 })),
  formattedAddress: nullAsAbsent(
    z.string().meta({ example: 'Landmark 81, 720A Điện Biên Phủ, Bình Thạnh' }),
  ),
  placeId: nullAsAbsent(z.string().meta({ example: 'ChIJw8qV...' })),
  isDefault: nullAsAbsent(z.boolean().meta({ example: false })),
};

export const UpdateAddressSchema = z.object(updateAddressFields).strict();

export type UpdateAddressInput = z.infer<typeof UpdateAddressSchema>;
