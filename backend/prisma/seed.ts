import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  Prisma,
  Role,
  ProductStatus,
  SellerRequestStatus,
  WalletTransactionType,
  WalletTransactionStatus,
  AuctionStatus,
  AuctionItemStatus,
  BidStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Nạp file .env ở thư mục gốc (lùi ra 2 cấp từ backend/prisma/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:nexus_secret_2026@localhost:5432/nexus_main?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function upsertDemoUser(
  client: PrismaClient,
  data: {
    fullName: string;
    email: string;
    platformEmail?: string | null;
    personalEmail?: string | null;
    phoneNumber?: string;
    role: Role;
    isSellerActive: boolean;
    passwordHash: string;
  },
) {
  // Tìm kiếm theo email, platformEmail hoặc fullName để tránh trùng lặp khi chạy lại
  const existing = await client.user.findFirst({
    where: {
      OR: [
        { email: { equals: data.email, mode: 'insensitive' as Prisma.QueryMode } },
        ...(data.platformEmail
          ? [
              {
                platformEmail: {
                  equals: data.platformEmail,
                  mode: 'insensitive' as Prisma.QueryMode,
                },
              },
            ]
          : []),
        { fullName: data.fullName },
      ],
    },
  });

  if (existing) {
    return client.user.update({
      where: { id: existing.id },
      data: {
        email: data.email,
        platformEmail: data.platformEmail ?? null,
        personalEmail: data.personalEmail ?? data.email,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        role: data.role,
        isSellerActive: data.isSellerActive,
        isVerified: true,
        passwordHash: data.passwordHash,
      },
    });
  }

  return client.user.create({
    data: {
      email: data.email,
      platformEmail: data.platformEmail ?? null,
      personalEmail: data.personalEmail ?? data.email,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      role: data.role,
      isSellerActive: data.isSellerActive,
      isVerified: true,
      passwordHash: data.passwordHash,
    },
  });
}

async function ensureDemoWallet(client: PrismaClient, userId: string, balance: number) {
  const wallet = await client.wallet.upsert({
    where: { userId },
    update: { balance },
    create: {
      userId,
      balance,
      lockedBalance: 0,
      currency: 'VND',
    },
  });

  if (balance > 0) {
    const tx = await client.walletTransaction.findFirst({
      where: { walletId: wallet.id, type: WalletTransactionType.DEPOSIT },
    });
    if (!tx) {
      await client.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: balance,
          type: WalletTransactionType.DEPOSIT,
          status: WalletTransactionStatus.SUCCESS,
          description: `Nạp số dư khởi tạo ${balance.toLocaleString('vi-VN')} VNĐ cho tài khoản demo`,
        },
      });
    }
  }
  return wallet;
}

async function main() {
  console.info('🚀 Bắt đầu khởi tạo dữ liệu mẫu (Seeding demo accounts & products)...');

  // =========================================================================
  // 1. MẬT KHẨU MÃ HÓA CHUẨN VALIDATION HỆ THỐNG
  // =========================================================================
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const demoPasswordHash = await bcrypt.hash('Demo@123456', 10);

  // =========================================================================
  // 2. KHỞI TẠO TÀI KHOẢN ADMIN CỐ ĐỊNH
  // =========================================================================
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexus.com' },
    update: { passwordHash: adminPasswordHash, isVerified: true, role: Role.ADMIN },
    create: {
      email: 'admin@nexus.com',
      passwordHash: adminPasswordHash,
      fullName: 'System Admin',
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: { balance: 1000000 },
    create: {
      userId: admin.id,
      balance: 1000000,
      lockedBalance: 0,
      currency: 'VND',
    },
  });
  console.info('✅ 1. Admin: admin@nexus.com | Mật khẩu: Admin@123456');

  // =========================================================================
  // 3. TẠO KHO HÀNG MẶC ĐỊNH
  // =========================================================================
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH_001' },
    update: {
      name: 'Tổng kho NEXUS Tân Bình',
      address: 'Số 123 Đường Cộng Hòa, Quận Tân Bình, TP. Hồ Chí Minh',
    },
    create: {
      code: 'WH_001',
      name: 'Tổng kho NEXUS Tân Bình',
      address: 'Số 123 Đường Cộng Hòa, Quận Tân Bình, TP. Hồ Chí Minh',
    },
  });
  console.info('✅ 2. Kho hàng mặc định:', warehouse.code);

  // =========================================================================
  // 4. KHỞI TẠO CÂY DANH MỤC SẢN PHẨM PHÂN TÁCH RÕ RÀNG
  // =========================================================================
  // Nhánh 1: Đồng Hồ & Trang Sức
  const catWatches = await prisma.category.upsert({
    where: { slug: 'dong-ho-trang-suc' },
    update: { name: 'Đồng Hồ & Trang Sức', level: 1 },
    create: { name: 'Đồng Hồ & Trang Sức', slug: 'dong-ho-trang-suc', level: 1 },
  });

  const catLuxuryWatches = await prisma.category.upsert({
    where: { slug: 'dong-ho-cao-cap' },
    update: { name: 'Đồng Hồ Cao Cấp', parentId: catWatches.id, level: 2 },
    create: { name: 'Đồng Hồ Cao Cấp', slug: 'dong-ho-cao-cap', parentId: catWatches.id, level: 2 },
  });

  const catMenWatches = await prisma.category.upsert({
    where: { slug: 'dong-ho-nam-sang-trong' },
    update: { name: 'Đồng Hồ Nam Sang Trọng', parentId: catLuxuryWatches.id, level: 3 },
    create: {
      name: 'Đồng Hồ Nam Sang Trọng',
      slug: 'dong-ho-nam-sang-trong',
      parentId: catLuxuryWatches.id,
      level: 3,
    },
  });

  const _catWomenWatches = await prisma.category.upsert({
    where: { slug: 'dong-ho-nu-thoi-trang' },
    update: { name: 'Đồng Hồ Nữ Thời Trang', parentId: catLuxuryWatches.id, level: 3 },
    create: {
      name: 'Đồng Hồ Nữ Thời Trang',
      slug: 'dong-ho-nu-thoi-trang',
      parentId: catLuxuryWatches.id,
      level: 3,
    },
  });

  const catWatchStraps = await prisma.category.upsert({
    where: { slug: 'day-da-phu-kien-dong-ho' },
    update: { name: 'Dây Da & Phụ Kiện Đồng Hồ', parentId: catLuxuryWatches.id, level: 3 },
    create: {
      name: 'Dây Da & Phụ Kiện Đồng Hồ',
      slug: 'day-da-phu-kien-dong-ho',
      parentId: catLuxuryWatches.id,
      level: 3,
    },
  });

  const catWatchBoxes = await prisma.category.upsert({
    where: { slug: 'hop-dung-hop-xoay-dong-ho' },
    update: { name: 'Hộp Đựng & Bảo Quản Đồng Hồ', parentId: catLuxuryWatches.id, level: 3 },
    create: {
      name: 'Hộp Đựng & Bảo Quản Đồng Hồ',
      slug: 'hop-dung-hop-xoay-dong-ho',
      parentId: catLuxuryWatches.id,
      level: 3,
    },
  });

  // Nhánh 2: Công Nghệ & Điện Tử
  const catTech = await prisma.category.upsert({
    where: { slug: 'cong-nghe-dien-tu' },
    update: { name: 'Công Nghệ & Điện Tử', level: 1 },
    create: { name: 'Công Nghệ & Điện Tử', slug: 'cong-nghe-dien-tu', level: 1 },
  });

  const catPhoneAcc = await prisma.category.upsert({
    where: { slug: 'dien-thoai-phu-kien' },
    update: { name: 'Điện Thoại & Phụ Kiện Số', parentId: catTech.id, level: 2 },
    create: {
      name: 'Điện Thoại & Phụ Kiện Số',
      slug: 'dien-thoai-phu-kien',
      parentId: catTech.id,
      level: 2,
    },
  });

  const catCables = await prisma.category.upsert({
    where: { slug: 'cap-sac-cu-sac' },
    update: { name: 'Cáp Sạc & Củ Sạc Nhanh', parentId: catPhoneAcc.id, level: 3 },
    create: {
      name: 'Cáp Sạc & Củ Sạc Nhanh',
      slug: 'cap-sac-cu-sac',
      parentId: catPhoneAcc.id,
      level: 3,
    },
  });

  const catAudio = await prisma.category.upsert({
    where: { slug: 'tai-nghe-am-thanh' },
    update: { name: 'Tai Nghe & Thiết Bị Âm Thanh', parentId: catPhoneAcc.id, level: 3 },
    create: {
      name: 'Tai Nghe & Thiết Bị Âm Thanh',
      slug: 'tai-nghe-am-thanh',
      parentId: catPhoneAcc.id,
      level: 3,
    },
  });

  const catGaming = await prisma.category.upsert({
    where: { slug: 'phu-kien-gaming-may-tinh' },
    update: { name: 'Phụ Kiện Gaming & Bàn Phím', parentId: catPhoneAcc.id, level: 3 },
    create: {
      name: 'Phụ Kiện Gaming & Bàn Phím',
      slug: 'phu-kien-gaming-may-tinh',
      parentId: catPhoneAcc.id,
      level: 3,
    },
  });

  const _catProtectors = await prisma.category.upsert({
    where: { slug: 'op-lung-cuong-luc-bao-ve' },
    update: { name: 'Ốp Lưng & Giá Đỡ Thông Minh', parentId: catPhoneAcc.id, level: 3 },
    create: {
      name: 'Ốp Lưng & Giá Đỡ Thông Minh',
      slug: 'op-lung-cuong-luc-bao-ve',
      parentId: catPhoneAcc.id,
      level: 3,
    },
  });

  console.info('✅ 3. Khởi tạo danh mục phân cấp cho 2 ngành hàng thành công!');

  // =========================================================================
  // 5. KHỞI TẠO 2 TÀI KHOẢN STAFF (QuyetFen, Kim Cường)
  // Tuân thủ cơ chế staff provisioning: email platform @staff.com, personal @gmail.com
  // =========================================================================
  const staffList = [
    {
      fullName: 'QuyetFen',
      email: 'quyetfen@staff.com',
      platformEmail: 'quyetfen@staff.com',
      personalEmail: 'quyetfen@gmail.com',
      phoneNumber: '0901234001',
      department: 'Hỗ trợ khách hàng',
    },
    {
      fullName: 'Kim Cường',
      email: 'kimcuong@staff.com',
      platformEmail: 'kimcuong@staff.com',
      personalEmail: 'kimcuong@gmail.com',
      phoneNumber: '0901234002',
      department: 'Vận hành sàn & Kiểm duyệt',
    },
  ];

  for (const staffData of staffList) {
    const staffUser = await upsertDemoUser(prisma, {
      fullName: staffData.fullName,
      email: staffData.email,
      platformEmail: staffData.platformEmail,
      personalEmail: staffData.personalEmail,
      phoneNumber: staffData.phoneNumber,
      passwordHash: demoPasswordHash,
      role: Role.SUPPORT_STAFF,
      isSellerActive: false,
    });

    await ensureDemoWallet(prisma, staffUser.id, 0);

    const existingInv = await prisma.staffInvitation.findFirst({
      where: { personalEmail: staffData.personalEmail },
    });
    if (!existingInv) {
      await prisma.staffInvitation.create({
        data: {
          fullName: staffData.fullName,
          personalEmail: staffData.personalEmail,
          phoneNumber: staffData.phoneNumber,
          department: staffData.department,
          assignedEmail: staffData.platformEmail,
          token: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isAccepted: true,
        },
      });
    }
  }
  console.info('✅ 4. Đã khởi tạo 2 Staff: QuyetFen & Kim Cường');

  // =========================================================================
  // 6. KHỞI TẠO 2 TÀI KHOẢN BUYER CHƯA UPGRADE (Liên, Cường)
  // Tuân thủ RegisterDto validation: email @gmail.com, mật khẩu hoa+đặc biệt
  // =========================================================================
  const buyerList = [
    {
      fullName: 'Liên',
      email: 'lien.buyer@gmail.com',
      personalEmail: 'lien.buyer@gmail.com',
      phoneNumber: '0901234003',
      address: {
        recipientName: 'Liên',
        phone: '0901234003',
        street: '45 Lê Duẩn',
        ward: 'Phường Bến Nghé',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
      },
    },
    {
      fullName: 'Cường',
      email: 'cuong.buyer@gmail.com',
      personalEmail: 'cuong.buyer@gmail.com',
      phoneNumber: '0901234004',
      address: {
        recipientName: 'Cường',
        phone: '0901234004',
        street: '88 Cầu Giấy',
        ward: 'Phường Quan Hoa',
        district: 'Quận Cầu Giấy',
        city: 'Hà Nội',
      },
    },
  ];

  for (const b of buyerList) {
    const buyerUser = await upsertDemoUser(prisma, {
      fullName: b.fullName,
      email: b.email,
      platformEmail: null,
      personalEmail: b.personalEmail,
      phoneNumber: b.phoneNumber,
      passwordHash: demoPasswordHash,
      role: Role.BUYER,
      isSellerActive: false,
    });

    // Cung cấp số dư ví cho Buyer (đặc biệt là Liên có 1.000.000.000 VNĐ để demo đấu giá)
    const demoBalance = b.fullName === 'Liên' ? 1000000000 : 30000;
    await ensureDemoWallet(prisma, buyerUser.id, demoBalance);
    await prisma.user.update({
      where: { id: buyerUser.id },
      data: { reputationScore: 95, isVerified: true },
    });

    // Địa chỉ giao hàng mặc định
    const existingAddr = await prisma.userAddress.findFirst({ where: { userId: buyerUser.id } });
    if (existingAddr) {
      await prisma.userAddress.update({
        where: { id: existingAddr.id },
        data: { ...b.address, isDefault: true },
      });
    } else {
      await prisma.userAddress.create({
        data: { userId: buyerUser.id, ...b.address, isDefault: true },
      });
    }
  }
  console.info('✅ 5. Đã khởi tạo 2 Buyer: Liên & Cường (Ví 30.000 VNĐ, có sẵn địa chỉ)');

  // =========================================================================
  // 7. KHỞI TẠO 2 TÀI KHOẢN SELLER ĐÃ UPGRADE (Jos, Huy)
  // Tuân thủ validation hệ thống: role SELLER, isSellerActive = true, SellerUpgradeRequest APPROVED
  // =========================================================================
  const sellerConfigs = [
    {
      fullName: 'Jos',
      email: 'jos.seller@gmail.com',
      personalEmail: 'jos.seller@gmail.com',
      phoneNumber: '0901234005',
      storeName: 'Jos Tech & Gadgets',
      storeDescription: 'Gian hàng phụ kiện công nghệ, gaming gear và đồ chơi số tiện ích.',
      businessEmail: 'jos.tech@gmail.com',
      identityCardNumber: '079201008888',
      address: {
        street: '789 Nguyễn Huệ',
        ward: 'Phường Bến Nghé',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
      },
      pickup: {
        name: 'Jos Tech & Gadgets',
        phone: '0901234005',
        city: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Phường Bến Nghé',
        street: '789 Nguyễn Huệ',
        districtId: 1442,
        wardCode: '20101',
        ghnShopId: 235544,
        ghnClientId: 2545858,
      },
    },
    {
      fullName: 'Huy',
      email: 'huy.seller@gmail.com',
      personalEmail: 'huy.seller@gmail.com',
      phoneNumber: '0901234006',
      storeName: 'Huy Time & Accessories',
      storeDescription: 'Thế giới đồng hồ đeo tay phong cách & phụ kiện thời trang cao cấp.',
      businessEmail: 'huy.watch@gmail.com',
      identityCardNumber: '001201009999',
      address: {
        street: '321 Hai Bà Trưng',
        ward: 'Phường 8',
        district: 'Quận 3',
        city: 'TP. Hồ Chí Minh',
      },
      pickup: {
        name: 'Huy Time & Accessories',
        phone: '0901234006',
        city: 'TP. Hồ Chí Minh',
        district: 'Quận 3',
        ward: 'Phường 8',
        street: '321 Hai Bà Trưng',
        districtId: 1444,
        wardCode: '20308',
        ghnShopId: 235548,
        ghnClientId: 2545858,
      },
    },
  ];

  const sellerEntities: Record<string, { id: string; [key: string]: unknown }> = {};

  for (const s of sellerConfigs) {
    const sellerUser = await upsertDemoUser(prisma, {
      fullName: s.fullName,
      email: s.email,
      platformEmail: null,
      personalEmail: s.personalEmail,
      phoneNumber: s.phoneNumber,
      passwordHash: demoPasswordHash,
      role: Role.SELLER,
      isSellerActive: true,
    });

    sellerEntities[s.fullName] = sellerUser;

    // Ví 500.000.000 VNĐ cho Jos để demo thuận tiện
    const sellerBalance = s.fullName === 'Jos' ? 500000000 : 30000;
    await ensureDemoWallet(prisma, sellerUser.id, sellerBalance);
    await prisma.user.update({
      where: { id: sellerUser.id },
      data: { reputationScore: 98, isVerified: true },
    });

    // Địa chỉ shop
    const existingAddr = await prisma.userAddress.findFirst({ where: { userId: sellerUser.id } });
    if (existingAddr) {
      await prisma.userAddress.update({
        where: { id: existingAddr.id },
        data: { recipientName: s.storeName, phone: s.phoneNumber, ...s.address, isDefault: true },
      });
    } else {
      await prisma.userAddress.create({
        data: {
          userId: sellerUser.id,
          recipientName: s.storeName,
          phone: s.phoneNumber,
          ...s.address,
          isDefault: true,
        },
      });
    }

    // Yêu cầu nâng cấp Seller ở trạng thái APPROVED
    const existingReq = await prisma.sellerUpgradeRequest.findFirst({
      where: { userId: sellerUser.id },
    });
    if (existingReq) {
      await prisma.sellerUpgradeRequest.update({
        where: { id: existingReq.id },
        data: {
          storeName: s.storeName,
          storeDescription: s.storeDescription,
          phone: s.phoneNumber,
          businessEmail: s.businessEmail,
          identityCardNumber: s.identityCardNumber,
          street: s.address.street,
          ward: s.address.ward,
          district: s.address.district,
          city: s.address.city,
          status: SellerRequestStatus.APPROVED,
          reviewedByAdminId: admin.id,
          reviewedAt: new Date(),
        },
      });
    } else {
      await prisma.sellerUpgradeRequest.create({
        data: {
          userId: sellerUser.id,
          storeName: s.storeName,
          storeDescription: s.storeDescription,
          phone: s.phoneNumber,
          businessEmail: s.businessEmail,
          identityCardNumber: s.identityCardNumber,
          street: s.address.street,
          ward: s.address.ward,
          district: s.address.district,
          city: s.address.city,
          status: SellerRequestStatus.APPROVED,
          reviewedByAdminId: admin.id,
          reviewedAt: new Date(),
        },
      });
    }

    const carrierAddress = `${s.pickup.street}, ${s.pickup.ward}, ${s.pickup.district}, ${s.pickup.city}`;

    // Điểm lấy hàng fulfillment của Seller
    await prisma.sellerGhnAccount.upsert({
      where: {
        sellerId_environment: {
          sellerId: sellerUser.id,
          environment: 'SANDBOX',
        },
      },
      update: {
        districtId: s.pickup.districtId,
        wardCode: s.pickup.wardCode,
        status: 'VERIFIED',
        ghnShopId: s.pickup.ghnShopId,
        ghnClientId: s.pickup.ghnClientId,
        carrierName: s.pickup.name,
        carrierPhone: s.pickup.phone,
        carrierAddress,
        verifiedAt: new Date(),
      },
      create: {
        sellerId: sellerUser.id,
        environment: 'SANDBOX',
        districtId: s.pickup.districtId,
        wardCode: s.pickup.wardCode,
        status: 'VERIFIED',
        ghnShopId: s.pickup.ghnShopId,
        ghnClientId: s.pickup.ghnClientId,
        carrierName: s.pickup.name,
        carrierPhone: s.pickup.phone,
        carrierAddress,
        verifiedAt: new Date(),
      },
    });
  }
  console.info(
    '✅ 6. Đã khởi tạo 2 Seller đã nâng cấp: Jos & Huy (Ví 30.000 VNĐ, Shop info đầy đủ)',
  );

  // =========================================================================
  // 8. KHỞI TẠO 20 SẢN PHẨM CHO SELLER JOS (Ngành Công Nghệ & Phụ Kiện Số)
  // Giá: 10.000đ - 50.000đ | Status: 15 ACTIVE, 3 INACTIVE, 2 DRAFT
  // =========================================================================
  const josProducts = [
    // --- Tai Nghe & Thiết Bị Âm Thanh ---
    {
      title: 'Tai nghe nhét tai có dây Jack 3.5mm Extra Bass',
      description: 'Chất âm sống động, bass mạnh mẽ, kèm micro đàm thoại tiện lợi.',
      basePrice: 45000,
      categoryId: catAudio.id,
      status: ProductStatus.ACTIVE,
      quantity: 25,
      image:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Hộp đựng tai nghe mini chống nước khóa kéo Eva',
      description: 'Hộp cứng EVA chống sốc, bảo vệ tai nghe và phụ kiện nhỏ an toàn.',
      basePrice: 18000,
      categoryId: catAudio.id,
      status: ProductStatus.ACTIVE,
      quantity: 50,
      image:
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Cặp đệm bọt biển thay thế cho tai nghe chụp tai',
      description: 'Đệm tai êm ái, bọt biển cách âm tốt, tương thích nhiều dòng headphone.',
      basePrice: 15000,
      categoryId: catAudio.id,
      status: ProductStatus.ACTIVE,
      quantity: 60,
      image:
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Cáp chuyển đổi âm thanh Audio Jack 3.5mm sang Type-C',
      description: 'Tích hợp chip giải mã âm thanh Hi-Fi DAC, tương thích mọi dòng máy Type-C.',
      basePrice: 25000,
      categoryId: catAudio.id,
      status: ProductStatus.ACTIVE,
      quantity: 30,
      image:
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    },

    // --- Cáp Sạc & Củ Sạc ---
    {
      title: 'Cáp sạc nhanh Type-C bọc dù chống đứt 1m',
      description: 'Lõi đồng nguyên chất hỗ trợ sạc nhanh và truyền dữ liệu tốc độ cao.',
      basePrice: 15000,
      categoryId: catCables.id,
      status: ProductStatus.ACTIVE,
      quantity: 35,
      image:
        'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Đầu bọc silicon bảo vệ cổ cáp sạc chống gãy',
      description: 'Phụ kiện kẹp silicon bảo vệ chân sạc không bị gãy gập hoặc đứt ngầm.',
      basePrice: 10000,
      categoryId: catCables.id,
      status: ProductStatus.ACTIVE,
      quantity: 80,
      image:
        'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Dây silicon quấn thu gọn cáp sạc đa năng',
      description: 'Bộ quấn dây thông minh giữ bàn làm việc luôn gọn gàng, sạch đẹp.',
      basePrice: 12000,
      categoryId: catCables.id,
      status: ProductStatus.ACTIVE,
      quantity: 70,
      image:
        'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80',
    },

    // --- Điện Thoại & Giá Đỡ ---
    {
      title: 'Giá đỡ điện thoại để bàn kim loại xoay gập 360 độ',
      description: 'Khung nhôm chắc chắn, gấp gọn dễ mang theo, điều chỉnh góc nhìn linh hoạt.',
      basePrice: 35000,
      categoryId: catPhoneAcc.id,
      status: ProductStatus.ACTIVE,
      quantity: 20,
      image:
        'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Giá đỡ kẹp điện thoại gắn cửa gió ô tô nam châm',
      description: 'Lực hút nam châm Neodymium cực mạnh, kẹp chặt cửa gió xe hơi không rung lắc.',
      basePrice: 30000,
      categoryId: catPhoneAcc.id,
      status: ProductStatus.ACTIVE,
      quantity: 18,
      image:
        'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Kính cường lực điện thoại 9D chống nhìn trộm',
      description:
        'Góc nghiêng 28 độ chống soi lén riêng tư, phủ nano chống bám mồ hôi và vân tay.',
      basePrice: 22000,
      categoryId: catPhoneAcc.id,
      status: ProductStatus.ACTIVE,
      quantity: 45,
      image:
        'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
    },

    // --- Phụ Kiện Gaming & Máy Tính ---
    {
      title: 'Lót chuột gaming speed may viền chống bong mép 20x25cm',
      description: 'Mặt vải dệt Speed lướt chuột êm ái, đáy cao su chống trượt tuyệt đối.',
      basePrice: 20000,
      categoryId: catGaming.id,
      status: ProductStatus.ACTIVE,
      quantity: 30,
      image:
        'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Quạt tản nhiệt mini cắm cổng USB làm mát laptop',
      description: 'Thiết kế nhỏ gọn, gió êm không ồn, sử dụng trực tiếp cổng USB nguồn 5V.',
      basePrice: 48000,
      categoryId: catGaming.id,
      status: ProductStatus.ACTIVE,
      quantity: 15,
      image:
        'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Đèn LED cắm cổng USB thân dẻo chiếu sáng bàn phím',
      description: 'Uốn cong định hình góc chiếu tùy ý, ánh sáng dịu mắt không gây chói.',
      basePrice: 16000,
      categoryId: catGaming.id,
      status: ProductStatus.ACTIVE,
      quantity: 40,
      image:
        'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bộ chổi quét và dụng cụ vệ sinh bàn phím đa năng 5 in 1',
      description: 'Gồm đầu quét mềm, đầu nhổ keycap, bút lau kẽ tai nghe và khăn lau màn hình.',
      basePrice: 28000,
      categoryId: catGaming.id,
      status: ProductStatus.ACTIVE,
      quantity: 25,
      image:
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bộ 4 nút cao su nâng tản nhiệt đáy laptop',
      description: 'Tạo độ dốc tản nhiệt và góc gõ bàn phím công thái học thoải mái.',
      basePrice: 14000,
      categoryId: catGaming.id,
      status: ProductStatus.ACTIVE,
      quantity: 50,
      image:
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    },

    // --- INACTIVE (3 món) ---
    {
      title: 'Bộ chia Hub USB 3.0 4 cổng tốc độ truyền cao',
      description: '[Tạm ngưng] Chia 1 cổng USB thành 4 cổng tiện dụng, tốc độ truyền tải 5Gbps.',
      basePrice: 50000,
      categoryId: catGaming.id,
      status: ProductStatus.INACTIVE,
      quantity: 10,
      image:
        'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Cáp mạng đúc sẵn RJ45 chuẩn CAT6 dài 3m',
      description: '[Tạm ngưng] Đầu bấm mạ vàng truyền tín hiệu Gigabit ổn định mượt mà.',
      basePrice: 20000,
      categoryId: catGaming.id,
      status: ProductStatus.INACTIVE,
      quantity: 20,
      image:
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bút cảm ứng điện dung Stylus 2 đầu cho điện thoại tablet',
      description: '[Tạm ngưng] Đầu đĩa silicon vẽ nét mảnh và đầu cao su điều hướng mượt.',
      basePrice: 32000,
      categoryId: catPhoneAcc.id,
      status: ProductStatus.INACTIVE,
      quantity: 16,
      image:
        'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
    },

    // --- DRAFT (2 món) ---
    {
      title: 'Đế sạc không dây chuẩn Qi 15W siêu mỏng nhôm nguyên khối',
      description: '[Bản nháp] Nhận diện sạc thông minh không gây nóng máy.',
      basePrice: 42000,
      categoryId: catPhoneAcc.id,
      status: ProductStatus.DRAFT,
      quantity: 12,
      image:
        'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Túi chống sốc laptop 14 inch chất liệu nỉ có ngăn phụ',
      description: '[Bản nháp] Đựng máy chống va đập, ngăn phụ đựng sạc chuột tiện lợi.',
      basePrice: 40000,
      categoryId: catGaming.id,
      status: ProductStatus.DRAFT,
      quantity: 14,
      image:
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    },
  ];

  // =========================================================================
  // 9. KHỞI TẠO 20 SẢN PHẨM CHO SELLER HUY (Ngành Đồng Hồ & Phụ Kiện)
  // Giá: 10.000đ - 50.000đ | Status: 15 ACTIVE, 3 INACTIVE, 2 DRAFT
  // =========================================================================
  const huyProducts = [
    // --- Đồng Hồ & Trang Sức ---
    {
      title: 'Đồng hồ nam phong cách Classic mặt tròn dây da nâu',
      description: 'Thiết kế thanh lịch, mặt số tối giản, kính khoáng cứng chống trầy nhẹ.',
      basePrice: 50000,
      categoryId: catMenWatches.id,
      status: ProductStatus.ACTIVE,
      quantity: 10,
      image:
        'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Đồng hồ điện tử thể thao chống nước mặt vuông năng động',
      description: 'Chức năng bấm giờ thể thao, xem lịch ngày và đèn LED nền tiện ích ban đêm.',
      basePrice: 48000,
      categoryId: catMenWatches.id,
      status: ProductStatus.ACTIVE,
      quantity: 15,
      image:
        'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Vòng tay hạt trầm hương tự nhiên mix charm bạc phong thủy',
      description: 'Mùi hương dịu nhẹ thư thái, xâu hạt thủ công tỉ mỉ mang lại bình an.',
      basePrice: 38000,
      categoryId: catLuxuryWatches.id,
      status: ProductStatus.ACTIVE,
      quantity: 20,
      image:
        'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Vòng tay titan mạ vàng kiểu xích trơn phong cách tối giản',
      description: 'Chất liệu titan không gỉ không phai màu, khóa gài bấm gập sang trọng.',
      basePrice: 30000,
      categoryId: catLuxuryWatches.id,
      status: ProductStatus.ACTIVE,
      quantity: 25,
      image:
        'https://images.unsplash.com/photo-1518131672697-613becd4fab5?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Vòng tay chỉ đỏ may mắn mix đồng xu cổ bình an',
      description: 'Dây đan sợi dù bện chắc chắn, chi tiết đồng xu may mắn tài lộc.',
      basePrice: 14000,
      categoryId: catLuxuryWatches.id,
      status: ProductStatus.ACTIVE,
      quantity: 50,
      image:
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    },

    // --- Dây Đồng Hồ & Khóa Phụ Kiện ---
    {
      title: 'Dây da đồng hồ bò sáp phong cách Vintage cổ điển 20mm',
      description: 'Chất da thật mềm mại, đường may chỉ viền tỉ mỉ tạo điểm nhấn cổ điển.',
      basePrice: 35000,
      categoryId: catWatchStraps.id,
      status: ProductStatus.ACTIVE,
      quantity: 30,
      image:
        'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Dây đồng hồ silicon thể thao chốt gạt thông minh 22mm',
      description: 'Chống nước hoàn toàn, chốt gạt quick-release tháo lắp trong 3 giây.',
      basePrice: 28000,
      categoryId: catWatchStraps.id,
      status: ProductStatus.ACTIVE,
      quantity: 40,
      image:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Khóa bướm tự động inox chống gãy gập dây da đồng hồ',
      description: 'Bảo vệ tuổi thọ dây da không bị cong gấp, thao tác bấm mở 1 chạm nhẹ nhàng.',
      basePrice: 25000,
      categoryId: catWatchStraps.id,
      status: ProductStatus.ACTIVE,
      quantity: 35,
      image:
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Dụng cụ cắt mắt tháo chốt dây đồng hồ kim loại tại nhà',
      description: 'Dễ dàng tự căn chỉnh độ dài mắt xích dây kim loại mà không cần ra tiệm.',
      basePrice: 20000,
      categoryId: catWatchStraps.id,
      status: ProductStatus.ACTIVE,
      quantity: 45,
      image:
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Cây nạy tháo chốt dây đồng hồ 2 đầu đa năng',
      description: 'Một đầu nạy chốt lò xo và một đầu kim đột lỗ dây da chuyên dụng.',
      basePrice: 12000,
      categoryId: catWatchStraps.id,
      status: ProductStatus.ACTIVE,
      quantity: 60,
      image:
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    },

    // --- Bảo Quản & Vệ Sinh Đồng Hồ ---
    {
      title: 'Khăn vải da lộn chuyên dụng lau sáng bóng mặt kính đồng hồ',
      description: 'Chất sợi microfiber mịn màng, làm sạch dấu vân tay và bụi bẩn không để lại xơ.',
      basePrice: 10000,
      categoryId: catWatchBoxes.id,
      status: ProductStatus.ACTIVE,
      quantity: 100,
      image:
        'https://images.unsplash.com/photo-1518131672697-613becd4fab5?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Gối nhung kê đồng hồ chống trầy xước đế trưng bày',
      description: 'Lõi bông xốp bọc nhung mềm, giữ phom dây da và thép không bị méo lệch.',
      basePrice: 15000,
      categoryId: catWatchBoxes.id,
      status: ProductStatus.ACTIVE,
      quantity: 50,
      image:
        'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Hộp đựng đồng hồ đơn bọc da có khóa bấm chống sốc',
      description: 'Hộp quà tặng bọc da PU sang trọng, lót đệm nhung êm ái bảo vệ máy.',
      basePrice: 45000,
      categoryId: catWatchBoxes.id,
      status: ProductStatus.ACTIVE,
      quantity: 20,
      image:
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Vỉ 5 viên pin cúc áo Maxell chính hãng cho đồng hồ Quartz',
      description: 'Điện áp ổn định 1.55V, không rò rỉ dung dịch, tuổi thọ sử dụng lên tới 2 năm.',
      basePrice: 15000,
      categoryId: catWatchStraps.id,
      status: ProductStatus.ACTIVE,
      quantity: 70,
      image:
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Kính lúp thợ kim hoàn phóng đại 10x soi chi tiết mặt đồng hồ',
      description:
        'Thấu kính thủy tinh quang học cho độ phóng đại sắc nét rõ từng chi tiết kim cọc.',
      basePrice: 29000,
      categoryId: catWatchStraps.id,
      status: ProductStatus.ACTIVE,
      quantity: 25,
      image:
        'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=800&q=80',
    },

    // --- INACTIVE (3 món) ---
    {
      title: 'Dây lưới Milanese thép không gỉ khóa nam châm 20mm',
      description: '[Tạm ngưng] Lưới đan thoáng khí chống mồ hôi, khóa hút nam châm ôm sát.',
      basePrice: 40000,
      categoryId: catWatchStraps.id,
      status: ProductStatus.INACTIVE,
      quantity: 12,
      image:
        'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Lọ dầu bôi trơn máy đồng hồ cơ chuyên dụng Moebius 5ml',
      description: '[Tạm ngưng] Giảm ma sát ổ trục bánh xe, duy trì độ chính xác của máy cơ.',
      basePrice: 24000,
      categoryId: catWatchStraps.id,
      status: ProductStatus.INACTIVE,
      quantity: 15,
      image:
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Vòng tay đá phong thủy mắt hổ vàng 10mm may mắn tài lộc',
      description: '[Tạm ngưng] Chuỗi hạt đá thạch anh mắt hổ tự nhiên phản xạ ánh lụa bắt mắt.',
      basePrice: 33000,
      categoryId: catLuxuryWatches.id,
      status: ProductStatus.INACTIVE,
      quantity: 18,
      image:
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    },

    // --- DRAFT (2 món) ---
    {
      title: 'Bao da du lịch đựng 2 chiếc đồng hồ gập gọn cao cấp',
      description: '[Bản nháp] Chất da nhân tạo dày dặn có ngăn ngăn cách 2 mặt số tránh va đập.',
      basePrice: 44000,
      categoryId: catWatchBoxes.id,
      status: ProductStatus.DRAFT,
      quantity: 15,
      image:
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Kẹp cà vạt mạ bạc chạm khắc hoa văn sang trọng',
      description: '[Bản nháp] Phụ kiện cài áo sơ mi lịch lãm cho quý ông công sở và dự tiệc.',
      basePrice: 22000,
      categoryId: catLuxuryWatches.id,
      status: ProductStatus.DRAFT,
      quantity: 30,
      image:
        'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80',
    },
  ];

  // =========================================================================
  // 10. HÀM SEED SẢN PHẨM & TỒN KHO AN TOÀN
  // =========================================================================
  interface SeedProductItem {
    title: string;
    description: string;
    basePrice: number;
    categoryId: string;
    status: ProductStatus;
    quantity: number;
    image: string;
  }

  async function seedProductsForSeller(sellerUser: { id: string }, products: SeedProductItem[]) {
    for (const item of products) {
      let product = await prisma.product.findFirst({
        where: {
          sellerId: sellerUser.id,
          title: item.title,
        },
      });

      if (product) {
        product = await prisma.product.update({
          where: { id: product.id },
          data: {
            categoryId: item.categoryId,
            description: item.description,
            basePrice: item.basePrice,
            status: item.status,
            weightGrams: 200,
            lengthCm: 15,
            widthCm: 10,
            heightCm: 5,
          },
        });
      } else {
        product = await prisma.product.create({
          data: {
            sellerId: sellerUser.id,
            categoryId: item.categoryId,
            title: item.title,
            description: item.description,
            basePrice: item.basePrice,
            status: item.status,
            weightGrams: 200,
            lengthCm: 15,
            widthCm: 10,
            heightCm: 5,
          },
        });
      }

      // Ảnh sản phẩm
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      await prisma.productImage.create({
        data: {
          productId: product.id,
          imageUrl: item.image,
          isThumbnail: true,
          sortOrder: 0,
        },
      });

      // Tồn kho tại WH_001
      await prisma.inventory.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: product.id,
          },
        },
        update: {
          totalQty: item.quantity,
          availableQty: item.quantity,
          reservedQty: 0,
        },
        create: {
          warehouseId: warehouse.id,
          productId: product.id,
          totalQty: item.quantity,
          availableQty: item.quantity,
          reservedQty: 0,
        },
      });
    }
  }

  await seedProductsForSeller(sellerEntities['Jos'], josProducts);
  console.info('✅ 7. Đã khởi tạo 20 sản phẩm cho Seller Jos (Công nghệ & Phụ kiện)');

  await seedProductsForSeller(sellerEntities['Huy'], huyProducts);
  console.info('✅ 8. Đã khởi tạo 20 sản phẩm cho Seller Huy (Đồng hồ & Phụ kiện)');

  // =========================================================================
  // 11. KHỞI TẠO CÁC PHIÊN ĐẤU GIÁ VÀ LƯỢT TRẢ GIÁ MẪU (AUCTIONS & BIDS)
  // =========================================================================
  const huyProduct = await prisma.product.findFirst({
    where: {
      sellerId: sellerEntities['Jos'].id,
      title: 'Đồng hồ nam phong cách Classic mặt tròn dây da nâu',
    },
  });

  const buyerLien = await prisma.user.findFirst({
    where: { email: 'lien.buyer@gmail.com' },
  });
  const buyerCuong = await prisma.user.findFirst({
    where: { email: 'cuong.buyer@gmail.com' },
  });

  const now = new Date();

  // -------------------------------------------------------------------------
  // 11A. PHIÊN ĐẤU GIÁ CỦA ADMIN (SCHEDULED) ĐÃ DUYỆT SẴN 5 SẢN PHẨM CỦA SELLER
  // Chỉ cần Admin bấm nút "Bắt đầu" là phát ngay Video 3D Bảo Tàng Triển Lãm!
  // -------------------------------------------------------------------------
  const showcaseAuctionTitle = 'Triển Lãm Đấu Giá Bảo Vật & Tuyệt Tác NEXUS 2026';
  const scheduledStart = new Date(now.getTime() + 6 * 3600 * 1000);
  const scheduledEnd = new Date(now.getTime() + 30 * 3600 * 1000);

  let adminShowcaseAuction = await prisma.auction.findFirst({
    where: {
      title: showcaseAuctionTitle,
    },
  });

  if (adminShowcaseAuction) {
    adminShowcaseAuction = await prisma.auction.update({
      where: { id: adminShowcaseAuction.id },
      data: {
        createdByAdminId: admin.id,
        sellerId: sellerEntities['Jos'].id,
        productId: huyProduct?.id ?? null,
        description:
          'Phiên đấu giá đặc biệt quy tụ 5 vật phẩm đã qua thẩm định nghiêm ngặt từ các nhà sưu tầm và gian hàng uy tín trên NEXUS.',
        imageUrl:
          'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=80',
        startingPrice: 25000000,
        reservePrice: 30000000,
        currentHighestBid: 0,
        bidIncrement: 1000000,
        minBuyerReputation: 40,
        minSellerReputation: 50,
        status: AuctionStatus.SCHEDULED,
        startTime: scheduledStart,
        endTime: scheduledEnd,
        originalEndTime: scheduledEnd,
        isExtended: false,
        isConsignmentLocked: true,
        consignmentLockedAt: new Date(now.getTime() - 3600 * 1000),
        consignmentDeadline: new Date(now.getTime() - 7200 * 1000),
      },
    });
  } else {
    adminShowcaseAuction = await prisma.auction.create({
      data: {
        createdByAdminId: admin.id,
        sellerId: sellerEntities['Jos'].id,
        productId: huyProduct?.id ?? null,
        title: showcaseAuctionTitle,
        description:
          'Phiên đấu giá đặc biệt quy tụ 5 vật phẩm đã qua thẩm định nghiêm ngặt từ các nhà sưu tầm và gian hàng uy tín trên NEXUS.',
        imageUrl:
          'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=80',
        startingPrice: 25000000,
        reservePrice: 30000000,
        currentHighestBid: 0,
        bidIncrement: 1000000,
        minBuyerReputation: 40,
        minSellerReputation: 50,
        status: AuctionStatus.SCHEDULED,
        startTime: scheduledStart,
        endTime: scheduledEnd,
        originalEndTime: scheduledEnd,
        isExtended: false,
        totalBidsCount: 0,
        isConsignmentLocked: true,
        consignmentLockedAt: new Date(now.getTime() - 3600 * 1000),
        consignmentDeadline: new Date(now.getTime() - 7200 * 1000),
      },
    });
  }

  // Làm mới danh sách 5 vật phẩm đã được Admin APPROVED trong phiên này
  await prisma.auctionItem.deleteMany({
    where: { auctionId: adminShowcaseAuction.id },
  });

  const approvedLots = [
    {
      // [1/3 THUỘC 10 MODEL 3D] -> Đồng hồ
      lotNumber: 1,
      sellerId: sellerEntities['Jos'].id,
      title: 'Đồng hồ cơ Patek Philippe Calatrava Skeleton 18K',
      description:
        'Tình trạng: Like New 99% Fullbox. Bộ máy cơ lộ cơ hoàn thiện thủ công tại Geneva, Thụy Sĩ. Đã kiểm định chuẩn xác thực 100%.',
      images: [
        'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80',
      ],
      threeModelKey: 'preset_watch',
      startingPrice: 85000000,
      reservePrice: 95000000,
      bidIncrement: 2000000,
      appraisalCertificateNumber: 'NEXUS-CERT-2026-001',
      appraisalAgency: 'Swiss Horology Institute (SHI)',
      certificateImages: [
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      // [2/3 THUỘC 10 MODEL 3D] -> Tai nghe
      lotNumber: 2,
      sellerId: sellerEntities['Jos'].id,
      title: 'Tai nghe Studio Hi-Fi Extra Bass Mạ Vàng 24K',
      description:
        'Tình trạng: Sưu tầm 99%. Phiên bản giới hạn mạ vàng 24K củ loa Dynamic Hi-Res Audio, kèm hộp chống sốc nguyên bản.',
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=80',
      ],
      threeModelKey: 'preset_headphone',
      startingPrice: 18500000,
      reservePrice: 22000000,
      bidIncrement: 500000,
      appraisalCertificateNumber: 'NEXUS-CERT-2026-002',
      appraisalAgency: 'Japan Audio Society (JAS Hi-Res)',
      certificateImages: [
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      // [3/3 THUỘC 10 MODEL 3D] -> Bàn phím
      lotNumber: 3,
      sellerId: sellerEntities['Jos'].id,
      title: 'Bàn phím cơ Custom Nhôm CNC Gasket Mount Gold Edition',
      description:
        'Tình trạng: Mới 100% Độc bản. Khung nhôm nguyên khối anot hóa vàng đồng, tạ đáy đồng thau chạm khắc tinh xảo.',
      images: [
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=1000&q=80',
      ],
      threeModelKey: 'preset_keyboard',
      startingPrice: 14500000,
      reservePrice: 17000000,
      bidIncrement: 500000,
      appraisalCertificateNumber: 'NEXUS-CERT-2026-003',
      appraisalAgency: 'Custom Mechanical Guild',
      certificateImages: [
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      // [1/2 KHÔNG THUỘC 10 MODEL 3D] -> Tự động đóng gói Khung Tranh 3D từ ảnh Seller
      lotNumber: 4,
      sellerId: sellerEntities['Jos'].id,
      title: 'Vòng tay hạt trầm hương tự nhiên Khánh Hòa mix charm bạc',
      description:
        'Tình trạng: Mới 100%. Trầm hương tốc kiến tự nhiên Khánh Hòa 18 năm tích trầm, kết hợp charm bạc S925 chế tác thủ công.',
      images: [
        'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1518131672697-613becd4fab5?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80',
      ],
      threeModelKey: null,
      startingPrice: 12000000,
      reservePrice: 15000000,
      bidIncrement: 500000,
      appraisalCertificateNumber: 'NEXUS-CERT-2026-004',
      appraisalAgency: 'Viện Đá Quý & Trang Sức Việt Nam (DOJI Lab)',
      certificateImages: [
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      // [2/2 KHÔNG THUỘC 10 MODEL 3D] -> Tự động đóng gói Khung Tranh 3D từ ảnh Seller
      lotNumber: 5,
      sellerId: sellerEntities['Jos'].id,
      title: 'Bình gốm men lam Chu Đậu vẽ vàng 24K Di Sản',
      description:
        'Tình trạng: Cổ vật tuyển chọn. Bình gốm hoa lam vẽ tay họa tiết liên hoa và rồng mây, nung nhiệt độ 1300°C và dát vàng 24K.',
      images: [
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1000&q=80',
      ],
      threeModelKey: null,
      startingPrice: 42000000,
      reservePrice: 50000000,
      bidIncrement: 1000000,
      appraisalCertificateNumber: 'NEXUS-CERT-2026-005',
      appraisalAgency: 'Trung Tâm Giám Định Cổ Vật & Di Sản Việt Nam',
      certificateImages: [
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
      ],
    },
  ];

  for (const lot of approvedLots) {
    await prisma.auctionItem.create({
      data: {
        auctionId: adminShowcaseAuction.id,
        sellerId: lot.sellerId,
        title: lot.title,
        description: lot.description,
        images: lot.images,
        threeModelKey: lot.threeModelKey,
        proposedStartingPrice: lot.startingPrice,
        proposedReservePrice: lot.reservePrice,
        proposedBidIncrement: lot.bidIncrement,
        startingPrice: lot.startingPrice,
        reservePrice: lot.reservePrice,
        bidIncrement: lot.bidIncrement,
        lotNumber: lot.lotNumber,
        appraisalCertificateNumber: lot.appraisalCertificateNumber,
        appraisalAgency: lot.appraisalAgency,
        certificateImages: lot.certificateImages,
        certificateIssueDate: new Date(now.getTime() - 7 * 86400000),
        status: AuctionItemStatus.APPROVED,
        reviewedByAdminId: admin.id,
        reviewedAt: new Date(now.getTime() - 3600 * 1000),
        isSellerFlagged: false,
      },
    });
  }

  console.info(
    '✅ 9. Đã khởi tạo phiên đấu giá SCHEDULED của Admin với 5 sản phẩm đã duyệt (chỉ cần ấn Bắt đầu để test video)',
  );

  // -------------------------------------------------------------------------
  // 11A-2. BỔ SUNG THÊM 5 BUỔI ĐẤU GIÁ SCHEDULED ĐỂ TEST (ĐỦ 11 MODEL 3D + SP NGOÀI 3D)
  // -------------------------------------------------------------------------
  const extraShowcaseSessions: Array<{
    title: string;
    description: string;
    imageUrl: string;
    startingPrice: number;
    reservePrice: number;
    bidIncrement: number;
    hoursOffset: number;
    lots: Array<{
      lotNumber: number;
      sellerId: string;
      title: string;
      description: string;
      images: string[];
      threeModelKey: string | null;
      startingPrice: number;
      reservePrice: number;
      bidIncrement: number;
      appraisalCertificateNumber: string;
      appraisalAgency: string;
      certificateImages: string[];
    }>;
  }> = [
    {
      title: 'Tuyệt Tác Kim Cương & Trang Sức Hoàng Gia NEXUS 2026',
      description:
        'Phiên đấu giá trang sức cao cấp hội tụ kim cương nước D kiểm định GIA, nhẫn kim cương bạch kim và ngọc trai tự nhiên.',
      imageUrl:
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
      startingPrice: 95000000,
      reservePrice: 115000000,
      bidIncrement: 3000000,
      hoursOffset: 10,
      lots: [
        {
          lotNumber: 1,
          sellerId: sellerEntities['Jos'].id,
          title: 'Viên Kim Cương Tự Nhiên GIA Nước D 5.2 Carat',
          description:
            'Giác cắt Brilliant hoàn mỹ, độ tinh khiết Flawless (FL), đi kèm hồ sơ kiểm định GIA khắc laser trên vành.',
          images: [
            'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_diamond',
          startingPrice: 480000000,
          reservePrice: 540000000,
          bidIncrement: 10000000,
          appraisalCertificateNumber: 'GIA-2026-520889',
          appraisalAgency: 'Gemological Institute of America (GIA)',
          certificateImages: [
            'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 2,
          sellerId: sellerEntities['Jos'].id,
          title: 'Nhẫn Kim Cương Solitaire Bạch Kim PT950 2.5 Carat',
          description:
            'Chế tác thủ công trên nền bạch kim PT950 nguyên khối cùng chấu 6 cạnh cổ điển.',
          images: [
            'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_diamond_ring',
          startingPrice: 195000000,
          reservePrice: 230000000,
          bidIncrement: 5000000,
          appraisalCertificateNumber: 'GIA-2026-250114',
          appraisalAgency: 'GIA International Lab',
          certificateImages: [
            'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 3,
          sellerId: sellerEntities['Jos'].id,
          title: 'Nhẫn Hoàng Gia Đá Sapphire Xanh Kashmir Đính Kim Cương',
          description:
            'Sapphire xanh hoàng gia 3.8 carat tự nhiên không xử lý nhiệt, bao quanh bởi 16 viên kim cương tấm.',
          images: [
            'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_royal_ring',
          startingPrice: 145000000,
          reservePrice: 175000000,
          bidIncrement: 3000000,
          appraisalCertificateNumber: 'SSEF-2026-9910',
          appraisalAgency: 'Swiss Gemmological Institute (SSEF)',
          certificateImages: [
            'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 4,
          sellerId: sellerEntities['Jos'].id,
          title: 'Dây Chuyền Ngọc Trai Akoya Nhật Bản Khóa Vàng 18K',
          description:
            'Tuyển chọn 45 viên ngọc trai biển Akoya ánh hồng tự nhiên kích thước 8.5–9mm đồng đều.',
          images: [
            'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: null,
          startingPrice: 48000000,
          reservePrice: 58000000,
          bidIncrement: 1000000,
          appraisalCertificateNumber: 'PSL-2026-AKO89',
          appraisalAgency: 'Pearl Science Laboratory Tokyo',
          certificateImages: [
            'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 5,
          sellerId: sellerEntities['Jos'].id,
          title: 'Trâm Cài Áo Ngọc Phỉ Thúy Cẩm Thạch Loại A Chạm Phượng',
          description:
            'Ngọc cẩm thạch Type A thiên nhiên trong suốt, khung vàng hồng đính hồng ngọc.',
          images: [
            'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: null,
          startingPrice: 62000000,
          reservePrice: 74000000,
          bidIncrement: 1500000,
          appraisalCertificateNumber: 'DOJI-2026-JADE77',
          appraisalAgency: 'Viện Đá Quý DOJI Lab',
          certificateImages: [
            'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80',
          ],
        },
      ],
    },
    {
      title: 'Siêu Xe Sưu Tầm & Bất Động Sản Nghỉ Dưỡng Hạng Sang 2026',
      description:
        'Quy tụ siêu xe phiên bản giới hạn, biệt thự nghỉ dưỡng biển và phụ kiện xa xỉ dành cho giới thượng lưu.',
      imageUrl:
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80',
      startingPrice: 500000000,
      reservePrice: 600000000,
      bidIncrement: 10000000,
      hoursOffset: 14,
      lots: [
        {
          lotNumber: 1,
          sellerId: sellerEntities['Jos'].id,
          title: 'Siêu Xe Porsche 911 GT3 RS Weissach Carbon Edition',
          description:
            'Odo 1.200km, gói nâng cấp sợi carbon Weissach, phanh gốm PCCB, đầy đủ lịch sử bảo dưỡng hãng.',
          images: [
            'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_car',
          startingPrice: 12500000000,
          reservePrice: 13800000000,
          bidIncrement: 100000000,
          appraisalCertificateNumber: 'DEKRA-AUTO-911GT3',
          appraisalAgency: 'DEKRA Luxury Vehicle Inspection',
          certificateImages: [
            'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 2,
          sellerId: sellerEntities['Jos'].id,
          title: 'Biệt Thự Nghỉ Dưỡng Ven Biển Phú Quốc Private Pool Villa',
          description:
            'Diện tích 480m², 4 phòng ngủ hướng biển trực diện, hồ bơi vô cực riêng, sổ hồng sở hữu lâu dài.',
          images: [
            'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_villa',
          startingPrice: 28000000000,
          reservePrice: 31000000000,
          bidIncrement: 250000000,
          appraisalCertificateNumber: 'SAVILLS-VAL-2026-PQ',
          appraisalAgency: 'Savills Vietnam Valuation',
          certificateImages: [
            'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 3,
          sellerId: sellerEntities['Jos'].id,
          title: 'Đồng Hồ Cơ Rolex Cosmograph Daytona Vàng Khối 18K',
          description:
            'Mặt số Meteorite thiên thạch cực hiếm, tình trạng nguyên zin 99% kèm thẻ bảo hành quốc tế.',
          images: [
            'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_watch',
          startingPrice: 980000000,
          reservePrice: 1100000000,
          bidIncrement: 15000000,
          appraisalCertificateNumber: 'COSC-RLX-2026-88',
          appraisalAgency: 'COSC Swiss Chronometer Testing',
          certificateImages: [
            'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 4,
          sellerId: sellerEntities['Jos'].id,
          title: 'Bộ Gậy Golf Honma Beres 5 Sao Dát Vàng 24K Fullset',
          description:
            'Phiên bản thủ công Sakata Nhật Bản 14 gậy kèm túi da bê cao cấp, mới nguyên seal.',
          images: [
            'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: null,
          startingPrice: 165000000,
          reservePrice: 190000000,
          bidIncrement: 3000000,
          appraisalCertificateNumber: 'HONMA-SAKATA-5S-09',
          appraisalAgency: 'Honma Golf Japan Authentication',
          certificateImages: [
            'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=800&q=80',
          ],
        },
      ],
    },
    {
      title: 'Hệ Sinh Thái Công Nghệ Flagship & Workstation Độc Bản',
      description:
        'Tuyển tập thiết bị công nghệ cao cấp phiên bản Custom Limited dành cho nhà sáng tạo và giới mộ điệu.',
      imageUrl:
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80',
      startingPrice: 20000000,
      reservePrice: 25000000,
      bidIncrement: 1000000,
      hoursOffset: 18,
      lots: [
        {
          lotNumber: 1,
          sellerId: sellerEntities['Jos'].id,
          title: 'Laptop Apple MacBook Pro 16 M4 Max Custom Gold Plate',
          description:
            'RAM 128GB, SSD 8TB, vỏ nhôm mạ vàng 24K số thứ tự 09/50 toàn cầu, bảo hành AppleCare+.',
          images: [
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_laptop',
          startingPrice: 135000000,
          reservePrice: 155000000,
          bidIncrement: 2500000,
          appraisalCertificateNumber: 'NEXUS-TECH-MBP-09',
          appraisalAgency: 'NEXUS Hardware Lab',
          certificateImages: [
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 2,
          sellerId: sellerEntities['Jos'].id,
          title: 'Điện Thoại Vertu Signature Touch Titanium & Da Cá Sấu',
          description:
            'Khung titan cấp độ 5, mặt kính sapphire nguyên khối chống trầy, dịch vụ Concierge kích hoạt sẵn.',
          images: [
            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_phone',
          startingPrice: 88000000,
          reservePrice: 105000000,
          bidIncrement: 2000000,
          appraisalCertificateNumber: 'VERTU-UK-2026-441',
          appraisalAgency: 'Vertu England Heritage Guild',
          certificateImages: [
            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 3,
          sellerId: sellerEntities['Jos'].id,
          title: 'Bàn Phím Cơ Custom Keycult No.2 Brass Polished Edition',
          description:
            'Phiên bản Commission duy nhất, switch Cherry Nixie lubed thủ công, keycap GMK Olivia.',
          images: [
            'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_keyboard',
          startingPrice: 36000000,
          reservePrice: 44000000,
          bidIncrement: 1000000,
          appraisalCertificateNumber: 'KEYCULT-2026-002',
          appraisalAgency: 'Custom Mechanical Guild',
          certificateImages: [
            'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 4,
          sellerId: sellerEntities['Jos'].id,
          title: 'Máy Ảnh Leica M11 Monochrom Kèm Ống Kính Summilux 50mm',
          description:
            'Cảm biến B&W 60MP nguyên bản Đức, số shot 150 tấm, fullbox kèm chứng chỉ xuất xưởng Wetzlar.',
          images: [
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: null,
          startingPrice: 215000000,
          reservePrice: 245000000,
          bidIncrement: 5000000,
          appraisalCertificateNumber: 'LEICA-WETZLAR-M11-77',
          appraisalAgency: 'Leica Camera AG Germany',
          certificateImages: [
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
          ],
        },
      ],
    },
    {
      title: 'Hội Họa Đương Đại, Cổ Vật & Nghệ Thuật Di Sản Đông Dương',
      description:
        'Những tác phẩm hội họa sơn dầu, cổ vật đồng và gốm sứ nghệ nhân được giám định niên đại chính xác.',
      imageUrl:
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1000&q=80',
      startingPrice: 30000000,
      reservePrice: 40000000,
      bidIncrement: 1000000,
      hoursOffset: 22,
      lots: [
        {
          lotNumber: 1,
          sellerId: sellerEntities['Jos'].id,
          title: 'Bức Tranh Sơn Dầu Hoàng Hôn Sông Hồng Thế Kỷ XX',
          description:
            'Kích thước 120x90cm trên toan bố cổ, khung gỗ gụ chạm khắc tay, có chữ ký họa sĩ và giấy giám định bảo tàng.',
          images: [
            'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_painting',
          startingPrice: 120000000,
          reservePrice: 150000000,
          bidIncrement: 3000000,
          appraisalCertificateNumber: 'FINEART-VN-1988-12',
          appraisalAgency: 'Hội đồng Giám định Mỹ thuật Đông Dương',
          certificateImages: [
            'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 2,
          sellerId: sellerEntities['Jos'].id,
          title: 'Viên Kim Cương Vàng Canary Fancy Vivid 3.0 Carat',
          description:
            'Sắc vàng tự nhiên quý hiếm Fancy Vivid Yellow, giác cắt Cushion lấp lánh rực rỡ.',
          images: [
            'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_diamond',
          startingPrice: 310000000,
          reservePrice: 360000000,
          bidIncrement: 5000000,
          appraisalCertificateNumber: 'GIA-2026-CANARY30',
          appraisalAgency: 'GIA Colored Diamond Division',
          certificateImages: [
            'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 3,
          sellerId: sellerEntities['Jos'].id,
          title: 'Tượng Đồng Phong Thủy Rồng Thời Lý Dát Vàng 9999',
          description:
            'Đúc thủ công nguyên khối theo mẫu cổ vật Hoàng Thành, dát vàng lá 24K, kèm đế gỗ trắc.',
          images: [
            'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: null,
          startingPrice: 54000000,
          reservePrice: 66000000,
          bidIncrement: 1500000,
          appraisalCertificateNumber: 'HERITAGE-VN-2026-31',
          appraisalAgency: 'Trung Tâm Di Sản Văn Hóa Việt',
          certificateImages: [
            'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 4,
          sellerId: sellerEntities['Jos'].id,
          title: 'Ấm Tử Sa Nghi Hưng Đất Chu Nê Chế Tác Nghệ Nhân',
          description:
            'Dung tích 220ml, đất khoáng cổ khai thác thập niên 90, triện đáy nghệ nhân quốc gia.',
          images: [
            'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: null,
          startingPrice: 28000000,
          reservePrice: 35000000,
          bidIncrement: 1000000,
          appraisalCertificateNumber: 'YIXING-TEAPOT-908',
          appraisalAgency: 'Hiệp hội Trà Cụ & Gốm Nghi Hưng',
          certificateImages: [
            'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
          ],
        },
      ],
    },
    {
      title: 'Phiên Thẩm Định Đặc Biệt Đa Chủng Loại NEXUS Premier',
      description:
        'Phiên đấu giá tổng hợp dành cho nhà đầu tư sưu tầm đa lĩnh vực với các lô hàng chuẩn quốc tế.',
      imageUrl:
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=80',
      startingPrice: 40000000,
      reservePrice: 50000000,
      bidIncrement: 1500000,
      hoursOffset: 26,
      lots: [
        {
          lotNumber: 1,
          sellerId: sellerEntities['Jos'].id,
          title: 'Tai Nghe Focal Utopia Reference Studio Open-Back',
          description:
            'Màng loa Beryllium nguyên chất chế tác tại Pháp, âm trường tham chiếu phòng thu.',
          images: [
            'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_headphone',
          startingPrice: 78000000,
          reservePrice: 92000000,
          bidIncrement: 2000000,
          appraisalCertificateNumber: 'FOCAL-FR-2026-511',
          appraisalAgency: 'Focal JMlab France',
          certificateImages: [
            'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 2,
          sellerId: sellerEntities['Jos'].id,
          title: 'Mô Hình Siêu Xe Ferrari 250 GTO Tỷ Lệ 1:8 Amalgam',
          description:
            'Hoàn thiện thủ công hơn 3.000 giờ bởi nghệ nhân Amalgam Collection, có chứng thư bản giới hạn.',
          images: [
            'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: 'preset_car',
          startingPrice: 240000000,
          reservePrice: 280000000,
          bidIncrement: 5000000,
          appraisalCertificateNumber: 'AMALGAM-250GTO-19',
          appraisalAgency: 'Amalgam Fine Model Cars UK',
          certificateImages: [
            'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 3,
          sellerId: sellerEntities['Jos'].id,
          title: 'Kính Mát Cartier Panthère Gọng Vàng Đúc 18K',
          description:
            'Kính thời trang cao cấp gọng vàng đặc 18K khắc họa tiết báo gấm, hộp gỗ sơn mài nguyên bản.',
          images: [
            'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: null,
          startingPrice: 46000000,
          reservePrice: 55000000,
          bidIncrement: 1000000,
          appraisalCertificateNumber: 'CARTIER-PARIS-882',
          appraisalAgency: 'Cartier Maison Authentication',
          certificateImages: [
            'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          lotNumber: 4,
          sellerId: sellerEntities['Jos'].id,
          title: 'Hộp Bảo Quản Xì Gà Gỗ Tuyết Tùng Khảm Xà Cừ Thủ Công',
          description: 'Sức chứa 100 điếu kèm ẩm kế đồng hồ Thụy Sĩ và khóa đồng mạ vàng.',
          images: [
            'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80',
          ],
          threeModelKey: null,
          startingPrice: 22000000,
          reservePrice: 28000000,
          bidIncrement: 500000,
          appraisalCertificateNumber: 'NEXUS-HUMIDOR-2026',
          appraisalAgency: 'Viện Kiểm Định Thủ Công Mỹ Nghệ',
          certificateImages: [
            'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
          ],
        },
      ],
    },
  ];

  for (const session of extraShowcaseSessions) {
    const sessStart = new Date(now.getTime() + session.hoursOffset * 3600 * 1000);
    const sessEnd = new Date(now.getTime() + (session.hoursOffset + 24) * 3600 * 1000);

    let seededAuction = await prisma.auction.findFirst({
      where: { title: session.title },
    });

    if (seededAuction) {
      seededAuction = await prisma.auction.update({
        where: { id: seededAuction.id },
        data: {
          createdByAdminId: admin.id,
          sellerId: session.lots[0]?.sellerId ?? sellerEntities['Jos'].id,
          description: session.description,
          imageUrl: session.imageUrl,
          startingPrice: session.startingPrice,
          reservePrice: session.reservePrice,
          currentHighestBid: 0,
          bidIncrement: session.bidIncrement,
          minBuyerReputation: 40,
          minSellerReputation: 50,
          status: AuctionStatus.SCHEDULED,
          startTime: sessStart,
          endTime: sessEnd,
          originalEndTime: sessEnd,
          isExtended: false,
          isConsignmentLocked: true,
          consignmentLockedAt: new Date(now.getTime() - 3600 * 1000),
          consignmentDeadline: new Date(now.getTime() - 7200 * 1000),
        },
      });
    } else {
      seededAuction = await prisma.auction.create({
        data: {
          createdByAdminId: admin.id,
          sellerId: session.lots[0]?.sellerId ?? sellerEntities['Jos'].id,
          title: session.title,
          description: session.description,
          imageUrl: session.imageUrl,
          startingPrice: session.startingPrice,
          reservePrice: session.reservePrice,
          currentHighestBid: 0,
          bidIncrement: session.bidIncrement,
          minBuyerReputation: 40,
          minSellerReputation: 50,
          status: AuctionStatus.SCHEDULED,
          startTime: sessStart,
          endTime: sessEnd,
          originalEndTime: sessEnd,
          isExtended: false,
          totalBidsCount: 0,
          isConsignmentLocked: true,
          consignmentLockedAt: new Date(now.getTime() - 3600 * 1000),
          consignmentDeadline: new Date(now.getTime() - 7200 * 1000),
        },
      });
    }

    await prisma.auctionItem.deleteMany({
      where: { auctionId: seededAuction.id },
    });

    for (const lot of session.lots) {
      await prisma.auctionItem.create({
        data: {
          auctionId: seededAuction.id,
          sellerId: lot.sellerId,
          title: lot.title,
          description: lot.description,
          images: lot.images,
          threeModelKey: lot.threeModelKey,
          proposedStartingPrice: lot.startingPrice,
          proposedReservePrice: lot.reservePrice,
          proposedBidIncrement: lot.bidIncrement,
          startingPrice: lot.startingPrice,
          reservePrice: lot.reservePrice,
          bidIncrement: lot.bidIncrement,
          lotNumber: lot.lotNumber,
          appraisalCertificateNumber: lot.appraisalCertificateNumber,
          appraisalAgency: lot.appraisalAgency,
          certificateImages: lot.certificateImages,
          certificateIssueDate: new Date(now.getTime() - 5 * 86400000),
          status: AuctionItemStatus.APPROVED,
          reviewedByAdminId: admin.id,
          reviewedAt: new Date(now.getTime() - 1800 * 1000),
          isSellerFlagged: false,
        },
      });
    }
  }

  console.info(
    '✅ 9B. Đã bổ sung thêm 5 buổi đấu giá SCHEDULED (đủ 11 Model 3D gồm Kim Cương + sản phẩm ngoài 3D)',
  );

  // -------------------------------------------------------------------------
  // 11B. PHIÊN ĐẤU GIÁ ĐANG DIỄN RA (ACTIVE) KÈM 3 LƯỢT TRẢ GIÁ MẪU
  // -------------------------------------------------------------------------
  if (huyProduct && buyerLien && buyerCuong) {
    const liveStartTime = new Date(now.getTime() - 2 * 3600 * 1000);
    const liveEndTime = new Date(now.getTime() + 4 * 3600 * 1000);

    let liveAuction = await prisma.auction.findFirst({
      where: {
        title: 'Audemars Piguet Royal Oak Chronograph 41mm Selfwinding',
      },
    });

    if (!liveAuction) {
      liveAuction = await prisma.auction.create({
        data: {
          createdByAdminId: admin.id,
          productId: huyProduct.id,
          sellerId: sellerEntities['Jos'].id,
          title: 'Audemars Piguet Royal Oak Chronograph 41mm Selfwinding',
          startingPrice: 100000000,
          reservePrice: 120000000,
          currentHighestBid: 128500000,
          currentHighestBidderId: buyerCuong.id,
          bidIncrement: 1000000,
          status: AuctionStatus.ACTIVE,
          startTime: liveStartTime,
          endTime: liveEndTime,
          originalEndTime: liveEndTime,
          isExtended: false,
          totalBidsCount: 3,
        },
      });

      await prisma.bid.createMany({
        data: [
          {
            auctionId: liveAuction.id,
            bidderId: buyerLien.id,
            bidAmount: 110000000,
            status: BidStatus.SUPERSEDED,
            placedAt: new Date(now.getTime() - 90 * 60 * 1000),
          },
          {
            auctionId: liveAuction.id,
            bidderId: buyerCuong.id,
            bidAmount: 120000000,
            status: BidStatus.SUPERSEDED,
            placedAt: new Date(now.getTime() - 45 * 60 * 1000),
          },
          {
            auctionId: liveAuction.id,
            bidderId: buyerCuong.id,
            bidAmount: 128500000,
            status: BidStatus.ACCEPTED,
            placedAt: new Date(now.getTime() - 10 * 60 * 1000),
          },
        ],
      });
      console.info(
        '✅ 10. Đã khởi tạo phiên đấu giá Live 3D (Audemars Piguet) cùng 3 lượt trả giá mẫu',
      );
    }
  }

  console.info('\n🎉🎉🎉 SEED TOÀN BỘ DỮ LIỆU DEMO THÀNH CÔNG RỰC RỠ! 🎉🎉🎉');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi thực thi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
