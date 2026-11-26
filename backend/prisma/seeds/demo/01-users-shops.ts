/**
 * Demo people: one of every role, with wallets, addresses and shop profiles.
 *
 * Every account shares one password, printed at the end of the run, because the
 * point is for somebody to sign in as each role and look around. That is safe
 * only because this seed refuses to run against production.
 */
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { ReputationTrustLevel, Role, WalletType, type Prisma } from '@prisma/client';
import { DemoClock, SeededRandom } from './random';

/**
 * The password every demo account shares, printed at the end of the run.
 *
 * It is generated rather than written here, so no usable credential is ever
 * committed to the repository. An automated run that needs a known value — an
 * end-to-end suite, for instance — pins it with DEMO_SEED_PASSWORD.
 *
 * @returns The password to use for this run.
 */
export function resolveDemoPassword(): string {
  const pinned = process.env.DEMO_SEED_PASSWORD?.trim();
  if (pinned) return pinned;
  // Mixed case, digits and a symbol, so it satisfies the registration rules
  // the application enforces on a real password.
  return `Demo-${randomBytes(6).toString('base64url')}-2026!`;
}

export interface DemoPerson {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isSellerActive: boolean;
}

export interface DemoPeople {
  /** The shared password this run generated. */
  password: string;
  admin: DemoPerson;
  staff: DemoPerson[];
  sellers: DemoPerson[];
  buyers: DemoPerson[];
  warehouse: { id: string };
}

interface PersonSpec {
  email: string;
  fullName: string;
  role: Role;
  isSellerActive?: boolean;
  shopName?: string;
  reputation: number;
  trustLevel: ReputationTrustLevel;
  walletBalance: number;
}

const PEOPLE: PersonSpec[] = [
  {
    email: 'demo.admin@nexus.local',
    fullName: 'Trần Quốc Quản',
    role: Role.ADMIN,
    reputation: 100,
    trustLevel: ReputationTrustLevel.EXCELLENT,
    walletBalance: 0,
  },
  {
    email: 'demo.staff@nexus.local',
    fullName: 'Lê Thị Hỗ Trợ',
    role: Role.SUPPORT_STAFF,
    reputation: 90,
    trustLevel: ReputationTrustLevel.EXCELLENT,
    walletBalance: 0,
  },
  {
    email: 'demo.staff2@nexus.local',
    fullName: 'Phạm Văn Trực',
    role: Role.SUPPORT_STAFF,
    reputation: 85,
    trustLevel: ReputationTrustLevel.GOOD,
    walletBalance: 0,
  },
  {
    email: 'demo.seller@nexus.local',
    fullName: 'Nguyễn Minh Cổ',
    role: Role.SELLER,
    isSellerActive: true,
    shopName: 'Cổ Vật Hà Thành',
    reputation: 88,
    trustLevel: ReputationTrustLevel.EXCELLENT,
    walletBalance: 12_500_000,
  },
  {
    email: 'demo.seller2@nexus.local',
    fullName: 'Đỗ Thu Sương',
    role: Role.SELLER,
    isSellerActive: true,
    shopName: 'Sương Mai Antique',
    reputation: 74,
    trustLevel: ReputationTrustLevel.GOOD,
    walletBalance: 6_200_000,
  },
  {
    email: 'demo.seller3@nexus.local',
    fullName: 'Vũ Hoài Nam',
    role: Role.SELLER,
    isSellerActive: true,
    shopName: 'Nam Phong Gallery',
    reputation: 61,
    trustLevel: ReputationTrustLevel.STANDARD,
    walletBalance: 2_800_000,
  },
  {
    email: 'demo.buyer@nexus.local',
    fullName: 'Hoàng Gia Bảo',
    role: Role.BUYER,
    reputation: 72,
    trustLevel: ReputationTrustLevel.GOOD,
    walletBalance: 9_000_000,
  },
  {
    email: 'demo.buyer2@nexus.local',
    fullName: 'Bùi Khánh Linh',
    role: Role.BUYER,
    reputation: 64,
    trustLevel: ReputationTrustLevel.GOOD,
    walletBalance: 5_400_000,
  },
  {
    email: 'demo.buyer3@nexus.local',
    fullName: 'Ngô Tấn Phát',
    role: Role.BUYER,
    reputation: 48,
    trustLevel: ReputationTrustLevel.PROBATION,
    walletBalance: 1_300_000,
  },
  {
    email: 'demo.buyer4@nexus.local',
    fullName: 'Đặng Mỹ Duyên',
    role: Role.BUYER,
    reputation: 55,
    trustLevel: ReputationTrustLevel.STANDARD,
    walletBalance: 3_100_000,
  },
];

const CITIES: Array<{ city: string; district: string; ward: string; street: string }> = [
  { city: 'Hà Nội', district: 'Hoàn Kiếm', ward: 'Hàng Bạc', street: '48 Hàng Bạc' },
  { city: 'Hà Nội', district: 'Ba Đình', ward: 'Điện Biên', street: '12 Lê Hồng Phong' },
  { city: 'Hồ Chí Minh', district: 'Quận 1', ward: 'Bến Nghé', street: '91 Đồng Khởi' },
  { city: 'Hồ Chí Minh', district: 'Quận 3', ward: 'Võ Thị Sáu', street: '7 Nam Kỳ Khởi Nghĩa' },
  { city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Thạch Thang', street: '25 Bạch Đằng' },
  { city: 'Huế', district: 'Phú Hội', ward: 'Vĩnh Ninh', street: '3 Lê Lợi' },
];

/**
 * Creates the demo people, their wallets, addresses and shop profiles, plus the
 * warehouse the catalogue stocks into.
 *
 * @param prisma - A connected client.
 * @param clock - The run's clock.
 * @param random - The run's generator.
 * @returns The people other modules build on.
 */
export function demoEmails(namespace = ''): string[] {
  return PEOPLE.map((person) =>
    namespace ? person.email.replace('@', `.${namespace}@`) : person.email,
  );
}

export async function seedUsersAndShops(
  prisma: Prisma.TransactionClient,
  clock: DemoClock,
  random: SeededRandom,
  namespace = '',
): Promise<DemoPeople> {
  const password = resolveDemoPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const created: DemoPerson[] = [];

  for (const [index, spec] of PEOPLE.entries()) {
    const place = CITIES[index % CITIES.length];
    const isSeller = spec.role === Role.SELLER;

    const data: Prisma.UserCreateInput = {
      email: namespace ? spec.email.replace('@', `.${namespace}@`) : spec.email,
      passwordHash,
      fullName: spec.fullName,
      phoneNumber: `09${String(10_000_000 + random.int(0, 89_999_999)).slice(0, 8)}`,
      role: spec.role,
      isSellerActive: spec.isSellerActive ?? false,
      isVerified: true,
      reputationScore: spec.reputation,
      trustLevel: spec.trustLevel,
      // Accounts are spread over the last few months so the admin user list and
      // growth charts are not a single flat spike.
      createdAt: clock.daysAgo(random.int(40, 180)),
      wallet: {
        create: {
          type: WalletType.USER_WALLET,
          balance: spec.walletBalance,
          lockedBalance: 0,
        },
      },
      addresses: {
        create: {
          recipientName: spec.fullName,
          phone: `09${String(10_000_000 + random.int(0, 89_999_999)).slice(0, 8)}`,
          street: place.street,
          ward: place.ward,
          district: place.district,
          city: place.city,
          isDefault: true,
        },
      },
    };

    if (isSeller && spec.shopName) {
      data.shopAvatarUrl = `https://picsum.photos/seed/${encodeURIComponent(spec.shopName)}/200/200`;
      data.bankName = random.pick(['Vietcombank', 'Techcombank', 'VPBank', 'ACB']);
      data.accountNumber = String(random.int(100_000_000, 999_999_999));
      data.accountHolderName = spec.fullName.toUpperCase();
    }

    const person = await prisma.user.create({
      data,
      select: { id: true, email: true, fullName: true, role: true, isSellerActive: true },
    });
    created.push(person);
  }

  const warehouse = await prisma.warehouse.create({
    data: {
      code: namespace ? `WH_DEMO_${namespace}` : 'WH_DEMO',
      name: 'Kho trung tâm NEXUS (demo)',
      address: '1 Đại lộ Thăng Long, Hà Nội',
    },
    select: { id: true },
  });

  const admin = created.find((person) => person.role === Role.ADMIN);
  if (!admin) throw new Error('demo seed produced no administrator');

  return {
    password,
    admin,
    staff: created.filter((person) => person.role === Role.SUPPORT_STAFF),
    sellers: created.filter((person) => person.role === Role.SELLER),
    buyers: created.filter((person) => person.role === Role.BUYER),
    warehouse,
  };
}
