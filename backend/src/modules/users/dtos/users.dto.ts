import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { Role } from '@nexus/contracts';

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
    z.string().describe('Beneficiary bank name').meta({ example: 'Vietcombank' }),
  ),
  accountNumber: nullAsAbsent(
    z.string().describe('Beneficiary bank account number').meta({ example: '1029384756' }),
  ),
  accountHolderName: nullAsAbsent(
    z
      .string()
      .describe('Bank account holder full name (uppercase)')
      .meta({ example: 'NGUYEN VAN A' }),
  ),
  password: nullAsAbsent(
    z.string().describe('Account password for direct seller profile verification'),
  ),
  verificationToken: nullAsAbsent(
    z.string().describe('Recent reauthentication token for seller profile update'),
  ),
};

export const UpdateBuyerProfileSchema = z.object(updateBuyerProfileFields).strict();

export type UpdateBuyerProfileInput = z.infer<typeof UpdateBuyerProfileSchema>;

const createAddressFields = {
  recipientName: z
    .string()
    .trim()
    .min(1)
    .describe('Recipient full name')
    .meta({ example: 'Jane Doe' }),
  phone: z
    .string()
    .trim()
    .min(1)
    .describe('Recipient phone number')
    .meta({ example: '0909123456' }),
  street: z
    .string()
    .trim()
    .min(1)
    .describe('Street address')
    .meta({ example: 'Landmark 81, 720A Dien Bien Phu' }),
  ward: nullAsAbsent(z.string().meta({ example: 'Ward 22' })),
  district: nullAsAbsent(z.string().meta({ example: 'Binh Thanh District' })),
  city: z.string().trim().min(1).meta({ example: 'Ho Chi Minh City' }),
  latitude: nullAsAbsent(z.coerce.number().describe('Map GPS latitude').meta({ example: 10.795 })),
  longitude: nullAsAbsent(
    z.coerce.number().describe('Map GPS longitude').meta({ example: 106.721 }),
  ),
  formattedAddress: nullAsAbsent(
    z
      .string()
      .describe('Full standardized map address')
      .meta({ example: 'Landmark 81, 720A Dien Bien Phu, Ward 22, Binh Thanh, Ho Chi Minh City' }),
  ),
  placeId: nullAsAbsent(
    z.string().describe('Google or OSM Place ID').meta({ example: 'ChIJw8qV...' }),
  ),
  isDefault: z.boolean().meta({ example: true }).default(false),
};

export const CreateAddressSchema = z.object(createAddressFields).strict();

export type CreateAddressInput = z.infer<typeof CreateAddressSchema>;
const updateAddressFields = {
  recipientName: nullAsAbsent(z.string().meta({ example: 'Nguyen Van A' })),
  phone: nullAsAbsent(z.string().meta({ example: '0909123456' })),
  street: nullAsAbsent(z.string().meta({ example: 'Landmark 81, 720A Dien Bien Phu' })),
  ward: nullAsAbsent(z.string().meta({ example: 'Ward 22' })),
  district: nullAsAbsent(z.string().meta({ example: 'Binh Thanh District' })),
  city: nullAsAbsent(z.string().meta({ example: 'Ho Chi Minh City' })),
  latitude: nullAsAbsent(z.coerce.number().meta({ example: 10.795 })),
  longitude: nullAsAbsent(z.coerce.number().meta({ example: 106.721 })),
  formattedAddress: nullAsAbsent(
    z.string().meta({ example: 'Landmark 81, 720A Dien Bien Phu, Binh Thanh' }),
  ),
  placeId: nullAsAbsent(z.string().meta({ example: 'ChIJw8qV...' })),
  isDefault: nullAsAbsent(z.boolean().meta({ example: false })),
};

export const UpdateAddressSchema = z.object(updateAddressFields).strict();

export type UpdateAddressInput = z.infer<typeof UpdateAddressSchema>;
