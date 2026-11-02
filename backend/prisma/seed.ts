import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  Prisma,
  Role,
  ProductStatus,
  SellerRequestStatus,
  WalletTransactionType,
  WalletTransactionStatus,
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

  const catWomenWatches = await prisma.category.upsert({
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

  const catProtectors = await prisma.category.upsert({
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

    // Ví 30.000 VNĐ
    await ensureDemoWallet(prisma, buyerUser.id, 30000);

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
        name: 'Kho hàng Jos Tech & Gadgets',
        phone: '0901234005',
        city: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Phường Bến Nghé',
        street: '789 Nguyễn Huệ',
        districtId: 1442,
        wardCode: '20101',
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
        name: 'Kho hàng Huy Time & Accessories',
        phone: '0901234006',
        city: 'TP. Hồ Chí Minh',
        district: 'Quận 3',
        ward: 'Phường 8',
        street: '321 Hai Bà Trưng',
        districtId: 1444,
        wardCode: '20308',
      },
    },
  ];

  const sellerEntities: Record<string, any> = {};

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

    // Ví 30.000 VNĐ
    await ensureDemoWallet(prisma, sellerUser.id, 30000);

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

    // Điểm lấy hàng fulfillment của Seller
    await prisma.sellerPickupPoint.upsert({
      where: {
        sellerId_environment: {
          sellerId: sellerUser.id,
          environment: 'SANDBOX',
        },
      },
      update: {
        name: s.pickup.name,
        phone: s.pickup.phone,
        city: s.pickup.city,
        district: s.pickup.district,
        ward: s.pickup.ward,
        street: s.pickup.street,
        districtId: s.pickup.districtId,
        wardCode: s.pickup.wardCode,
        status: 'PENDING',
      },
      create: {
        sellerId: sellerUser.id,
        environment: 'SANDBOX',
        name: s.pickup.name,
        phone: s.pickup.phone,
        city: s.pickup.city,
        district: s.pickup.district,
        ward: s.pickup.ward,
        street: s.pickup.street,
        districtId: s.pickup.districtId,
        wardCode: s.pickup.wardCode,
        status: 'PENDING',
      },
    });
  }
  console.info('✅ 6. Đã khởi tạo 2 Seller đã nâng cấp: Jos & Huy (Ví 30.000 VNĐ, Shop info đầy đủ)');

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
      description: 'Góc nghiêng 28 độ chống soi lén riêng tư, phủ nano chống bám mồ hôi và vân tay.',
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
      description: 'Thấu kính thủy tinh quang học cho độ phóng đại sắc nét rõ từng chi tiết kim cọc.',
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
  async function seedProductsForSeller(sellerUser: any, products: any[]) {
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
