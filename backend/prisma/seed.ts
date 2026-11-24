import { PrismaPg } from '@prisma/adapter-pg';
import {
  AuctionItemStatus,
  AuctionStatus,
  BannerCreatorRole,
  OrderStatus,
  Prisma,
  PrismaClient,
  ProductStatus,
  ReputationTrustLevel,
  Role,
  SellerRequestStatus,
  WalletTransactionStatus,
  WalletTransactionType,
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

const DEMO_WALLET_BALANCE = 4_000_000;

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
    reputationScore: number;
    trustLevel: ReputationTrustLevel;
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
  },
) {
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

  const payload = {
    email: data.email,
    platformEmail: data.platformEmail ?? null,
    personalEmail: data.personalEmail ?? data.email,
    fullName: data.fullName,
    phoneNumber: data.phoneNumber,
    role: data.role,
    isSellerActive: data.isSellerActive,
    isShopSuspended: false,
    isVerified: true,
    reputationScore: data.reputationScore,
    trustLevel: data.trustLevel,
    passwordHash: data.passwordHash,
    bankName: data.bankName ?? null,
    accountNumber: data.accountNumber ?? null,
    accountHolderName: data.accountHolderName ?? null,
  };

  if (existing) {
    return client.user.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return client.user.create({ data: payload });
}

async function ensureDemoWallet(client: PrismaClient, userId: string, balance: number) {
  const wallet = await client.wallet.upsert({
    where: { userId },
    update: { balance, lockedBalance: 0 },
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

async function upsertDefaultAddress(
  client: PrismaClient,
  userId: string,
  address: {
    recipientName: string;
    phone: string;
    street: string;
    ward: string;
    district: string;
    city: string;
  },
) {
  const existingAddr = await client.userAddress.findFirst({ where: { userId } });
  if (existingAddr) {
    return client.userAddress.update({
      where: { id: existingAddr.id },
      data: { ...address, isDefault: true },
    });
  }
  return client.userAddress.create({
    data: { userId, ...address, isDefault: true },
  });
}

interface SeedProductItem {
  title: string;
  description: string;
  basePrice: number;
  categoryId: string;
  status: ProductStatus;
  quantity: number;
  image: string;
}

async function seedProductsForSeller(
  sellerUser: { id: string },
  warehouseId: string,
  products: SeedProductItem[],
): Promise<Record<string, { id: string; title: string; basePrice: number }>> {
  const keepTitles = products.map((p) => p.title);
  const seededMap: Record<string, { id: string; title: string; basePrice: number }> = {};

  // Dọn các sản phẩm mẫu cũ dư thừa của seller nếu chưa gắn với đơn hàng/giỏ hàng/đánh giá/đấu giá
  const removableProducts = await prisma.product.findMany({
    where: {
      sellerId: sellerUser.id,
      title: { notIn: keepTitles },
      orderItems: { none: {} },
      auctions: { none: {} },
      cartItems: { none: {} },
      productReviews: { none: {} },
    },
    select: { id: true },
  });
  if (removableProducts.length > 0) {
    const removableIds = removableProducts.map((p) => p.id);
    await prisma.inventory.deleteMany({ where: { productId: { in: removableIds } } });
    await prisma.product.deleteMany({ where: { id: { in: removableIds } } });
  }

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
          weightGrams: 250,
          lengthCm: 18,
          widthCm: 12,
          heightCm: 8,
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
          weightGrams: 250,
          lengthCm: 18,
          widthCm: 12,
          heightCm: 8,
        },
      });
    }

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        imageUrl: item.image,
        isThumbnail: true,
        sortOrder: 0,
      },
    });

    await prisma.inventory.upsert({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId: product.id,
        },
      },
      update: {
        totalQty: item.quantity,
        availableQty: item.quantity,
        reservedQty: 0,
      },
      create: {
        warehouseId,
        productId: product.id,
        totalQty: item.quantity,
        availableQty: item.quantity,
        reservedQty: 0,
      },
    });

    seededMap[item.title] = {
      id: product.id,
      title: product.title,
      basePrice: item.basePrice,
    };
  }

  return seededMap;
}

async function main() {
  console.info('🚀 Bắt đầu seed tài khoản, sản phẩm và phiên đấu giá test...');

  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const demoPasswordHash = await bcrypt.hash('Demo@123456', 10);

  // =========================================================================
  // 1. TÀI KHOẢN ADMIN CỐ ĐỊNH
  // =========================================================================
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexus.com' },
    update: {
      passwordHash: adminPasswordHash,
      isVerified: true,
      role: Role.ADMIN,
      reputationScore: 120,
      trustLevel: ReputationTrustLevel.EXCELLENT,
    },
    create: {
      email: 'admin@nexus.com',
      passwordHash: adminPasswordHash,
      fullName: 'System Admin',
      role: Role.ADMIN,
      isVerified: true,
      reputationScore: 120,
      trustLevel: ReputationTrustLevel.EXCELLENT,
    },
  });
  await ensureDemoWallet(prisma, admin.id, 1_000_000);
  console.info('✅ 1. Admin: admin@nexus.com | Mật khẩu: Admin@123456');

  // =========================================================================
  // 2. KHO HÀNG & DANH MỤC (TỐI THIỂU ĐỂ TẠO 10 SẢN PHẨM / SELLER)
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

  interface SeedCategoryNode {
    name: string;
    slug: string;
    children?: SeedCategoryNode[];
  }

  const categoryTree: SeedCategoryNode[] = [
    {
      name: 'Đồng Hồ & Trang Sức',
      slug: 'dong-ho-trang-suc',
      children: [
        {
          name: 'Đồng Hồ Cao Cấp',
          slug: 'dong-ho-cao-cap',
          children: [
            { name: 'Đồng Hồ Nam Sang Trọng', slug: 'dong-ho-nam-sang-trong' },
            { name: 'Đồng Hồ Thể Thao & Thông Minh', slug: 'dong-ho-the-thao-thong-minh' },
            { name: 'Dây Da & Phụ Kiện Đồng Hồ', slug: 'day-da-phu-kien-dong-ho' },
            { name: 'Hộp Đựng & Trưng Bày Đồng Hồ', slug: 'hop-dung-trung-bay-dong-ho' },
            { name: 'Dụng Cụ Bảo Dưỡng Đồng Hồ', slug: 'dung-cu-bao-duong-dong-ho' },
          ],
        },
        {
          name: 'Trang Sức & Phụ Kiện',
          slug: 'trang-suc-phu-kien',
          children: [
            { name: 'Nhẫn & Dây Chuyền Bạc', slug: 'nhan-day-chuyen-bac' },
            { name: 'Vòng Tay & Đá Phong Thủy', slug: 'vong-tay-da-phong-thuy' },
            { name: 'Trâm Cài & Phụ Kiện Thời Trang', slug: 'tram-cai-phu-kien-thoi-trang' },
          ],
        },
      ],
    },
    {
      name: 'Công Nghệ & Điện Tử',
      slug: 'cong-nghe-dien-tu',
      children: [
        {
          name: 'Điện Thoại & Phụ Kiện Số',
          slug: 'dien-thoai-phu-kien',
          children: [
            { name: 'Tai Nghe & Thiết Bị Âm Thanh', slug: 'tai-nghe-am-thanh' },
            { name: 'Cáp Sạc & Đế Sạc Không Dây', slug: 'cap-sac-de-sac-khong-day' },
            { name: 'Giá Đỡ & Phụ Kiện Bàn Làm Việc', slug: 'gia-do-phu-kien-ban-lam-viec' },
          ],
        },
        {
          name: 'Máy Tính & Gaming Gear',
          slug: 'may-tinh-gaming-gear',
          children: [
            { name: 'Phụ Kiện Gaming & Bàn Phím', slug: 'phu-kien-gaming-may-tinh' },
            { name: 'Tản Nhiệt & Phụ Kiện Laptop', slug: 'tan-nhiet-phu-kien-laptop' },
            { name: 'Túi Chống Sốc & Balo Laptop', slug: 'tui-chong-soc-balo-laptop' },
            { name: 'Thiết Bị Mạng & Cáp Kết Nối', slug: 'thiet-bi-mang-cap-ket-noi' },
          ],
        },
      ],
    },
    {
      name: 'Nghệ Thuật & Vật Phẩm Sưu Tầm',
      slug: 'nghe-thuat-suu-tam',
      children: [
        {
          name: 'Hội Họa & Tranh Ảnh',
          slug: 'hoi-hoa-tranh-anh',
          children: [
            { name: 'Tranh Nghệ Thuật Treo Tường', slug: 'tranh-nghe-thuat-treo-tuong' },
            { name: 'Tranh Sơn Dầu & Sơn Mài', slug: 'tranh-son-dau-son-mai' },
          ],
        },
        {
          name: 'Thủ Công Mỹ Nghệ & Gốm Sứ',
          slug: 'thu-cong-my-nghe-gom-su',
          children: [
            { name: 'Gốm Sứ Nghệ Thuật', slug: 'gom-su-nghe-thuat' },
            { name: 'Trà Cụ & Gốm Tử Sa', slug: 'tra-cu-gom-tu-sa' },
          ],
        },
        {
          name: 'Đồ Cổ & Vật Phẩm Sưu Tầm',
          slug: 'do-co-vat-pham-suu-tam',
          children: [
            { name: 'Tượng & Vật Phẩm Phong Thủy', slug: 'tuong-vat-pham-phong-thuy' },
            { name: 'Hộp Khảm & Đồ Sưu Tầm Cổ', slug: 'hop-kham-do-suu-tam-co' },
          ],
        },
      ],
    },
    {
      name: 'Thời Trang & Phong Cách Sống',
      slug: 'thoi-trang-phong-cach',
      children: [
        {
          name: 'Túi Xách & Đồ Da',
          slug: 'tui-xach-do-da',
          children: [
            { name: 'Ví Da & Thắt Lưng', slug: 'vi-da-that-lung' },
            { name: 'Túi Đeo Chéo & Balo', slug: 'tui-deo-cheo-balo' },
          ],
        },
        {
          name: 'Kính Mắt & Phụ Kiện',
          slug: 'kinh-mat-phu-kien',
          children: [
            { name: 'Kính Râm Thời Trang', slug: 'kinh-ram-thoi-trang' },
            { name: 'Phụ Kiện Chăm Sóc Giày', slug: 'phu-kien-cham-soc-giay' },
          ],
        },
      ],
    },
    {
      name: 'Nhà Cửa & Đời Sống',
      slug: 'nha-cua-doi-song',
      children: [
        {
          name: 'Trang Trí Nội Thất',
          slug: 'trang-tri-noi-that',
          children: [
            { name: 'Đèn Trang Trí & Đèn Bàn', slug: 'den-trang-tri-den-ban' },
            { name: 'Nến Thơm & Tinh Dầu', slug: 'nen-thom-tinh-dau' },
          ],
        },
        {
          name: 'Pha Chế & Bàn Ăn',
          slug: 'pha-che-ban-an',
          children: [
            { name: 'Dụng Cụ Pha Cà Phê', slug: 'dung-cu-pha-ca-phe' },
            { name: 'Bình Giữ Nhiệt & Ly Sứ', slug: 'binh-giu-nhiet-ly-su' },
          ],
        },
      ],
    },
    {
      name: 'Sách & Văn Phòng Phẩm',
      slug: 'sach-van-phong-pham',
      children: [
        {
          name: 'Dụng Cụ Viết & Sổ Tay',
          slug: 'dung-cu-viet-so-tay',
          children: [
            { name: 'Sổ Tay & Bút Ký Cao Cấp', slug: 'so-tay-but-ky-cao-cap' },
            { name: 'Phụ Kiện Bàn Học & Văn Phòng', slug: 'phu-kien-ban-hoc-van-phong' },
          ],
        },
      ],
    },
    {
      name: 'Thể Thao & Dã Ngoại',
      slug: 'the-thao-du-lich',
      children: [
        {
          name: 'Phụ Kiện Thể Thao & Du Lịch',
          slug: 'phu-kien-the-thao-du-lich',
          children: [
            { name: 'Bình Nước & Phụ Kiện Gym', slug: 'binh-nuoc-phu-kien-gym' },
            { name: 'Đèn Pin & Dụng Cụ Cắm Trại', slug: 'den-pin-dung-cu-cam-trai' },
          ],
        },
      ],
    },
  ];

  const categoriesBySlug: Record<string, { id: string }> = {};

  async function seedCategoryNodes(
    nodes: SeedCategoryNode[],
    parentId: string | null = null,
    level = 1,
  ) {
    for (const node of nodes) {
      const cat = await prisma.category.upsert({
        where: { slug: node.slug },
        update: { name: node.name, parentId, level },
        create: { name: node.name, slug: node.slug, parentId, level },
      });
      categoriesBySlug[node.slug] = cat;
      if (node.children?.length) {
        await seedCategoryNodes(node.children, cat.id, level + 1);
      }
    }
  }

  await seedCategoryNodes(categoryTree);
  console.info(
    `✅ 2. Kho hàng & ${Object.keys(categoriesBySlug).length} danh mục (3 cấp) đã được khởi tạo`,
  );

  // =========================================================================
  // 3. TÀI KHOẢN STAFF (QuyetFen, Kim Cường)
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
      reputationScore: 120,
      trustLevel: ReputationTrustLevel.EXCELLENT,
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
  console.info('✅ 2. Staff (2 tài khoản): quyetfen@staff.com, kimcuong@staff.com');

  // =========================================================================
  // 4. TÀI KHOẢN BUYER (4 tài khoản đủ điều kiện đấu giá, ví 4.000.000 VNĐ)
  // =========================================================================
  const buyerList = [
    {
      fullName: 'Liên',
      email: 'lien.buyer@gmail.com',
      phoneNumber: '0901234003',
      bankName: 'Vietcombank',
      accountNumber: '1012340003',
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
      phoneNumber: '0901234004',
      bankName: 'Techcombank',
      accountNumber: '1901234004',
      address: {
        recipientName: 'Cường',
        phone: '0901234004',
        street: '88 Cầu Giấy',
        ward: 'Phường Quan Hoa',
        district: 'Quận Cầu Giấy',
        city: 'Hà Nội',
      },
    },
    {
      fullName: 'Minh',
      email: 'minh.buyer@gmail.com',
      phoneNumber: '0901234007',
      bankName: 'MB Bank',
      accountNumber: '0901234007',
      address: {
        recipientName: 'Minh',
        phone: '0901234007',
        street: '120 Nguyễn Văn Linh',
        ward: 'Phường Nam Dương',
        district: 'Quận Hải Châu',
        city: 'Đà Nẵng',
      },
    },
    {
      fullName: 'An',
      email: 'an.buyer@gmail.com',
      phoneNumber: '0901234008',
      bankName: 'ACB',
      accountNumber: '8801234008',
      address: {
        recipientName: 'An',
        phone: '0901234008',
        street: '25 Phan Xích Long',
        ward: 'Phường 2',
        district: 'Quận Phú Nhuận',
        city: 'TP. Hồ Chí Minh',
      },
    },
  ];

  const buyerEntities: Record<
    string,
    {
      id: string;
      fullName: string;
      address: (typeof buyerList)[number]['address'];
    }
  > = {};

  for (const b of buyerList) {
    const buyerUser = await upsertDemoUser(prisma, {
      fullName: b.fullName,
      email: b.email,
      platformEmail: null,
      personalEmail: b.email,
      phoneNumber: b.phoneNumber,
      passwordHash: demoPasswordHash,
      role: Role.BUYER,
      isSellerActive: false,
      reputationScore: 120,
      trustLevel: ReputationTrustLevel.EXCELLENT,
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      accountHolderName: b.fullName.toUpperCase(),
    });

    buyerEntities[b.fullName] = {
      id: buyerUser.id,
      fullName: b.fullName,
      address: b.address,
    };

    await ensureDemoWallet(prisma, buyerUser.id, DEMO_WALLET_BALANCE);
    await upsertDefaultAddress(prisma, buyerUser.id, b.address);
  }
  console.info(
    '✅ 3. Buyer (4 tài khoản): lien.buyer, cuong.buyer, minh.buyer, an.buyer (@gmail.com | Ví 4.000.000 VNĐ)',
  );

  // =========================================================================
  // 5. TÀI KHOẢN SELLER ĐÃ UPGRADE (3 tài khoản: Jos, Huy, Linh | Ví 4.000.000 VNĐ)
  // =========================================================================
  const sellerConfigs = [
    {
      fullName: 'Jos',
      email: 'jos.seller@gmail.com',
      phoneNumber: '0901234005',
      storeName: 'Jos Tech & Gadgets',
      storeDescription: 'Gian hàng phụ kiện công nghệ, gaming gear và đồ chơi số tiện ích.',
      businessEmail: 'jos.tech@gmail.com',
      identityCardNumber: '079201008888',
      bankName: 'Vietcombank',
      accountNumber: '1012340005',
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
      phoneNumber: '0901234006',
      storeName: 'Huy Time & Accessories',
      storeDescription: 'Thế giới đồng hồ đeo tay phong cách & phụ kiện thời trang cao cấp.',
      businessEmail: 'huy.watch@gmail.com',
      identityCardNumber: '001201009999',
      bankName: 'Techcombank',
      accountNumber: '1901234006',
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
    {
      fullName: 'Linh',
      email: 'linh.seller@gmail.com',
      phoneNumber: '0901234009',
      storeName: 'Linh Collectibles & Art',
      storeDescription: 'Gian hàng vật phẩm sưu tầm, tranh nghệ thuật và trang sức tinh xảo.',
      businessEmail: 'linh.art@gmail.com',
      identityCardNumber: '079202007777',
      bankName: 'ACB',
      accountNumber: '8801234009',
      address: {
        street: '18 Thảo Điền',
        ward: 'Phường Thảo Điền',
        district: 'TP. Thủ Đức',
        city: 'TP. Hồ Chí Minh',
      },
      pickup: {
        name: 'Linh Collectibles & Art',
        phone: '0901234009',
        city: 'TP. Hồ Chí Minh',
        district: 'TP. Thủ Đức',
        ward: 'Phường Thảo Điền',
        street: '18 Thảo Điền',
        districtId: 3695,
        wardCode: '90737',
        ghnShopId: 235552,
        ghnClientId: 2545858,
      },
    },
  ];

  const sellerEntities: Record<string, { id: string }> = {};

  for (const s of sellerConfigs) {
    const sellerUser = await upsertDemoUser(prisma, {
      fullName: s.fullName,
      email: s.email,
      platformEmail: null,
      personalEmail: s.email,
      phoneNumber: s.phoneNumber,
      passwordHash: demoPasswordHash,
      role: Role.SELLER,
      isSellerActive: true,
      reputationScore: 120,
      trustLevel: ReputationTrustLevel.EXCELLENT,
      bankName: s.bankName,
      accountNumber: s.accountNumber,
      accountHolderName: s.fullName.toUpperCase(),
    });

    sellerEntities[s.fullName] = sellerUser;

    await ensureDemoWallet(prisma, sellerUser.id, DEMO_WALLET_BALANCE);
    await upsertDefaultAddress(prisma, sellerUser.id, {
      recipientName: s.storeName,
      phone: s.phoneNumber,
      ...s.address,
    });

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
    '✅ 4. Seller (3 tài khoản): jos.seller, huy.seller, linh.seller (@gmail.com | Ví 4.000.000 VNĐ)',
  );

  // =========================================================================
  // 6. MỖI SELLER CÓ 10 MÓN HÀNG ĐẦY ĐỦ STATUS (ACTIVE, INACTIVE, DRAFT) & SỐ LƯỢNG (0..50)
  // =========================================================================
  const josProducts: SeedProductItem[] = [
    {
      title: 'Tai nghe nhét tai có dây Jack 3.5mm Extra Bass',
      description: 'Chất âm sống động, bass mạnh mẽ, kèm micro đàm thoại tiện lợi.',
      basePrice: 45000,
      categoryId: categoriesBySlug['tai-nghe-am-thanh'].id,
      status: ProductStatus.ACTIVE,
      quantity: 25,
      image:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Cáp sạc nhanh Type-C bọc dù chống đứt 1m',
      description: 'Lõi đồng nguyên chất hỗ trợ sạc nhanh và truyền dữ liệu tốc độ cao.',
      basePrice: 25000,
      categoryId: categoriesBySlug['cap-sac-de-sac-khong-day'].id,
      status: ProductStatus.ACTIVE,
      quantity: 50,
      image:
        'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Giá đỡ điện thoại để bàn kim loại xoay gập 360 độ',
      description: 'Khung nhôm chắc chắn, gấp gọn dễ mang theo, điều chỉnh góc nhìn linh hoạt.',
      basePrice: 35000,
      categoryId: categoriesBySlug['gia-do-phu-kien-ban-lam-viec'].id,
      status: ProductStatus.ACTIVE,
      quantity: 10,
      image:
        'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Quạt tản nhiệt mini cắm cổng USB làm mát laptop',
      description: 'Thiết kế nhỏ gọn, gió êm không ồn, sử dụng trực tiếp cổng USB nguồn 5V.',
      basePrice: 48000,
      categoryId: categoriesBySlug['tan-nhiet-phu-kien-laptop'].id,
      status: ProductStatus.ACTIVE,
      quantity: 3,
      image:
        'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bộ chổi quét và dụng cụ vệ sinh bàn phím đa năng 5 in 1',
      description: 'Gồm đầu quét mềm, đầu nhổ keycap, bút lau kẽ tai nghe và khăn lau màn hình.',
      basePrice: 28000,
      categoryId: categoriesBySlug['phu-kien-gaming-may-tinh'].id,
      status: ProductStatus.ACTIVE,
      quantity: 1,
      image:
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Lót chuột gaming speed may viền chống bong mép 20x25cm',
      description: '[Hết hàng] Mặt vải dệt Speed lướt chuột êm ái, đáy cao su chống trượt.',
      basePrice: 20000,
      categoryId: categoriesBySlug['phu-kien-gaming-may-tinh'].id,
      status: ProductStatus.ACTIVE,
      quantity: 0,
      image:
        'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bộ chia Hub USB 3.0 4 cổng tốc độ truyền cao',
      description: '[Tạm ngưng] Chia 1 cổng USB thành 4 cổng tiện dụng, tốc độ truyền tải 5Gbps.',
      basePrice: 50000,
      categoryId: categoriesBySlug['tan-nhiet-phu-kien-laptop'].id,
      status: ProductStatus.INACTIVE,
      quantity: 8,
      image:
        'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Cáp mạng đúc sẵn RJ45 chuẩn CAT6 dài 3m',
      description: '[Tạm ngưng] Đầu bấm mạ vàng truyền tín hiệu Gigabit ổn định mượt mà.',
      basePrice: 22000,
      categoryId: categoriesBySlug['thiet-bi-mang-cap-ket-noi'].id,
      status: ProductStatus.INACTIVE,
      quantity: 0,
      image:
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Đế sạc không dây chuẩn Qi 15W siêu mỏng nhôm nguyên khối',
      description: '[Bản nháp] Nhận diện sạc thông minh không gây nóng máy.',
      basePrice: 65000,
      categoryId: categoriesBySlug['cap-sac-de-sac-khong-day'].id,
      status: ProductStatus.DRAFT,
      quantity: 15,
      image:
        'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Túi chống sốc laptop 14 inch chất liệu nỉ có ngăn phụ',
      description: '[Bản nháp] Đựng máy chống va đập, ngăn phụ đựng sạc chuột tiện lợi.',
      basePrice: 40000,
      categoryId: categoriesBySlug['tui-chong-soc-balo-laptop'].id,
      status: ProductStatus.DRAFT,
      quantity: 2,
      image:
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Balo chống sốc laptop 15.6 inch chống thấm nước nhiều ngăn',
      description: 'Đệm lưng thoáng khí, ngăn chống sốc riêng cho laptop và phụ kiện.',
      basePrice: 85000,
      categoryId: categoriesBySlug['tui-chong-soc-balo-laptop'].id,
      status: ProductStatus.ACTIVE,
      quantity: 14,
      image:
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Cáp mạng LAN Cat6 UTP bọc đầu đúc sẵn tốc độ Gigabit 5m',
      description: 'Truyền tín hiệu ổn định cho PC, router và smart TV, chống nhiễu tốt.',
      basePrice: 32000,
      categoryId: categoriesBySlug['thiet-bi-mang-cap-ket-noi'].id,
      status: ProductStatus.ACTIVE,
      quantity: 22,
      image:
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bình giữ nhiệt inox 304 khắc tên dung tích 500ml',
      description: 'Giữ nóng lạnh lên đến 12 giờ, nắp kín chống rò rỉ khi mang theo.',
      basePrice: 69000,
      categoryId: categoriesBySlug['binh-giu-nhiet-ly-su'].id,
      status: ProductStatus.ACTIVE,
      quantity: 18,
      image:
        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Khay đựng bút & sắp xếp bàn làm việc tối giản',
      description: 'Chia nhiều ngăn tiện lợi cho bút, thước, ghim giấy và điện thoại.',
      basePrice: 42000,
      categoryId: categoriesBySlug['phu-kien-ban-hoc-van-phong'].id,
      status: ProductStatus.ACTIVE,
      quantity: 16,
      image:
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Đèn pin LED dã ngoại sạc USB chống nước IPX4',
      description: 'Chiếu sáng 3 chế độ, pin sạc tích hợp phù hợp cắm trại ban đêm.',
      basePrice: 59000,
      categoryId: categoriesBySlug['den-pin-dung-cu-cam-trai'].id,
      status: ProductStatus.ACTIVE,
      quantity: 11,
      image:
        'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const huyProducts: SeedProductItem[] = [
    {
      title: 'Đồng hồ nam phong cách Classic mặt tròn dây da nâu',
      description: 'Thiết kế thanh lịch, mặt số tối giản, kính khoáng cứng chống trầy nhẹ.',
      basePrice: 75000,
      categoryId: categoriesBySlug['dong-ho-nam-sang-trong'].id,
      status: ProductStatus.ACTIVE,
      quantity: 12,
      image:
        'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Đồng hồ điện tử thể thao chống nước mặt vuông năng động',
      description: 'Chức năng bấm giờ thể thao, xem lịch ngày và đèn LED nền tiện ích ban đêm.',
      basePrice: 68000,
      categoryId: categoriesBySlug['dong-ho-the-thao-thong-minh'].id,
      status: ProductStatus.ACTIVE,
      quantity: 30,
      image:
        'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Dây da đồng hồ bò sáp phong cách Vintage cổ điển 20mm',
      description: 'Chất da thật mềm mại, đường may chỉ viền tỉ mỉ tạo điểm nhấn cổ điển.',
      basePrice: 35000,
      categoryId: categoriesBySlug['day-da-phu-kien-dong-ho'].id,
      status: ProductStatus.ACTIVE,
      quantity: 20,
      image:
        'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Khóa bướm tự động inox chống gãy gập dây da đồng hồ',
      description: 'Bảo vệ tuổi thọ dây da không bị cong gấp, thao tác bấm mở 1 chạm nhẹ nhàng.',
      basePrice: 25000,
      categoryId: categoriesBySlug['day-da-phu-kien-dong-ho'].id,
      status: ProductStatus.ACTIVE,
      quantity: 5,
      image:
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Kính lúp thợ kim hoàn phóng đại 10x soi chi tiết mặt đồng hồ',
      description: 'Thấu kính thủy tinh quang học cho độ phóng đại sắc nét từng chi tiết.',
      basePrice: 29000,
      categoryId: categoriesBySlug['dung-cu-bao-duong-dong-ho'].id,
      status: ProductStatus.ACTIVE,
      quantity: 1,
      image:
        'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Hộp đựng đồng hồ đơn bọc da có khóa bấm chống sốc',
      description: '[Hết hàng] Hộp quà tặng bọc da PU sang trọng, lót đệm nhung êm ái.',
      basePrice: 45000,
      categoryId: categoriesBySlug['hop-dung-trung-bay-dong-ho'].id,
      status: ProductStatus.ACTIVE,
      quantity: 0,
      image:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Hộp trưng bày 6 chiếc đồng hồ mặt kính trong suốt',
      description: 'Khung gỗ bọc da lộn cao cấp, bảo vệ bộ sưu tập đồng hồ khỏi bụi bẩn.',
      basePrice: 92000,
      categoryId: categoriesBySlug['hop-dung-trung-bay-dong-ho'].id,
      status: ProductStatus.ACTIVE,
      quantity: 10,
      image:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Dây lưới Milanese thép không gỉ khóa nam châm 20mm',
      description: '[Tạm ngưng] Lưới đan thoáng khí chống mồ hôi, khóa hút nam châm ôm sát.',
      basePrice: 40000,
      categoryId: categoriesBySlug['day-da-phu-kien-dong-ho'].id,
      status: ProductStatus.INACTIVE,
      quantity: 9,
      image:
        'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Lọ dầu bôi trơn máy đồng hồ cơ chuyên dụng Moebius 5ml',
      description: '[Tạm ngưng] Giảm ma sát ổ trục bánh xe, duy trì độ chính xác của máy cơ.',
      basePrice: 24000,
      categoryId: categoriesBySlug['dung-cu-bao-duong-dong-ho'].id,
      status: ProductStatus.INACTIVE,
      quantity: 0,
      image:
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bao da du lịch đựng 2 chiếc đồng hồ gập gọn cao cấp',
      description: '[Bản nháp] Chất da dày dặn có ngăn ngăn cách 2 mặt số tránh va đập.',
      basePrice: 44000,
      categoryId: categoriesBySlug['hop-dung-trung-bay-dong-ho'].id,
      status: ProductStatus.DRAFT,
      quantity: 14,
      image:
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Cây nạy tháo chốt dây đồng hồ 2 đầu đa năng',
      description: '[Bản nháp] Một đầu nạy chốt lò xo và một đầu kim đột lỗ dây da chuyên dụng.',
      basePrice: 15000,
      categoryId: categoriesBySlug['dung-cu-bao-duong-dong-ho'].id,
      status: ProductStatus.DRAFT,
      quantity: 3,
      image:
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Ví da bò nam dáng ngang tối giản nhiều ngăn thẻ',
      description: 'Da bò thật mềm mịn, đường chỉ khâu tay chắc chắn, nhỏ gọn bỏ túi.',
      basePrice: 79000,
      categoryId: categoriesBySlug['vi-da-that-lung'].id,
      status: ProductStatus.ACTIVE,
      quantity: 15,
      image:
        'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Túi đeo chéo vải canvas phối da phong cách đường phố',
      description: 'Chống bám bụi nhẹ, dây đeo điều chỉnh linh hoạt cho đi học và dạo phố.',
      basePrice: 88000,
      categoryId: categoriesBySlug['tui-deo-cheo-balo'].id,
      status: ProductStatus.ACTIVE,
      quantity: 10,
      image:
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Kính râm gọng kim loại mảnh chống tia UV400',
      description: 'Tròng kính phân cực giảm chói khi lái xe và hoạt động ngoài trời.',
      basePrice: 65000,
      categoryId: categoriesBySlug['kinh-ram-thoi-trang'].id,
      status: ProductStatus.ACTIVE,
      quantity: 19,
      image:
        'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bộ vệ sinh giày sneaker bọt tuyết kèm bàn chải lông mềm',
      description: 'Làm sạch nhanh vết bẩn trên da, vải lưới và đế cao su không làm ố màu.',
      basePrice: 48000,
      categoryId: categoriesBySlug['phu-kien-cham-soc-giay'].id,
      status: ProductStatus.ACTIVE,
      quantity: 20,
      image:
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bình nước thể thao Tritan chia vạch 1 lít kèm ống hút',
      description: 'Nhựa không chứa BPA, nắp bật mở một tay tiện lợi khi tập gym.',
      basePrice: 54000,
      categoryId: categoriesBySlug['binh-nuoc-phu-kien-gym'].id,
      status: ProductStatus.ACTIVE,
      quantity: 24,
      image:
        'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const linhProducts: SeedProductItem[] = [
    {
      title: 'Vòng tay hạt trầm hương tự nhiên mix charm bạc S925',
      description: 'Mùi hương dịu nhẹ thư thái, xâu hạt thủ công tỉ mỉ mang lại bình an.',
      basePrice: 58000,
      categoryId: categoriesBySlug['vong-tay-da-phong-thuy'].id,
      status: ProductStatus.ACTIVE,
      quantity: 18,
      image:
        'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bình gốm men lam vẽ tay họa tiết liên hoa mini',
      description: 'Gốm nung thủ công men lam cổ điển, phù hợp trang trí bàn trà và kệ sách.',
      basePrice: 82000,
      categoryId: categoriesBySlug['gom-su-nghe-thuat'].id,
      status: ProductStatus.ACTIVE,
      quantity: 6,
      image:
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Tranh canvas nghệ thuật tối giản khung gỗ thông 30x40cm',
      description: 'In màu sắc nét trên vải canvas dày, tặng kèm đinh ba chân treo tường.',
      basePrice: 64000,
      categoryId: categoriesBySlug['tranh-nghe-thuat-treo-tuong'].id,
      status: ProductStatus.ACTIVE,
      quantity: 40,
      image:
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Tách trà gốm Tử Sa đất chu nê dung tích 90ml',
      description: 'Đất khoáng giữ nhiệt tốt, dáng tròn cổ điển dành cho người thưởng trà.',
      basePrice: 49000,
      categoryId: categoriesBySlug['tra-cu-gom-tu-sa'].id,
      status: ProductStatus.ACTIVE,
      quantity: 4,
      image:
        'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Nhẫn bạc đính đá CZ cắt giác kim cương phiên bản giới hạn',
      description: 'Bạc 925 xi bạch kim sáng bóng, chấu 6 cạnh cổ điển.',
      basePrice: 89000,
      categoryId: categoriesBySlug['nhan-day-chuyen-bac'].id,
      status: ProductStatus.ACTIVE,
      quantity: 1,
      image:
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Tượng đồng phong thủy để bàn chế tác thủ công',
      description: '[Hết hàng] Đúc đồng nguyên khối phủ màu cổ điển, đế gỗ trắc.',
      basePrice: 95000,
      categoryId: categoriesBySlug['tuong-vat-pham-phong-thuy'].id,
      status: ProductStatus.ACTIVE,
      quantity: 0,
      image:
        'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Tượng kỳ lân đá ngọc mini trưng bày bàn làm việc',
      description: 'Điêu khắc tinh xảo mang ý nghĩa chiêu tài và bình an.',
      basePrice: 74000,
      categoryId: categoriesBySlug['tuong-vat-pham-phong-thuy'].id,
      status: ProductStatus.ACTIVE,
      quantity: 7,
      image:
        'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Dây chuyền ngọc trai nuôi nước ngọt khóa bạc 925',
      description: '[Tạm ngưng] Ánh xà cừ tự nhiên dịu mắt, chiều dài dây 42cm.',
      basePrice: 72000,
      categoryId: categoriesBySlug['nhan-day-chuyen-bac'].id,
      status: ProductStatus.INACTIVE,
      quantity: 7,
      image:
        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Hộp gỗ khảm xà cừ đựng trang sức thủ công',
      description: '[Tạm ngưng] Lót nhung đỏ chống trầy bên trong, khóa đồng cổ điển.',
      basePrice: 55000,
      categoryId: categoriesBySlug['hop-kham-do-suu-tam-co'].id,
      status: ProductStatus.INACTIVE,
      quantity: 0,
      image:
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bức tranh sơn dầu phong cảnh phố cổ cỡ nhỏ',
      description: '[Bản nháp] Vẽ tay trên toan bố, màu sơn dầu bền đẹp theo thời gian.',
      basePrice: 90000,
      categoryId: categoriesBySlug['tranh-son-dau-son-mai'].id,
      status: ProductStatus.DRAFT,
      quantity: 12,
      image:
        'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Trâm cài áo hợp kim đính đá phong cách cổ điển',
      description: '[Bản nháp] Phụ kiện cài áo vest, áo dài sang trọng.',
      basePrice: 32000,
      categoryId: categoriesBySlug['tram-cai-phu-kien-thoi-trang'].id,
      status: ProductStatus.DRAFT,
      quantity: 2,
      image:
        'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Ghim cài ve áo hình hoa sen mạ vàng tinh xảo',
      description: 'Phụ kiện trang sức cài áo vest và áo dài, khóa gài chắc chắn.',
      basePrice: 46000,
      categoryId: categoriesBySlug['tram-cai-phu-kien-thoi-trang'].id,
      status: ProductStatus.ACTIVE,
      quantity: 12,
      image:
        'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Tranh sơn mài phong cảnh làng quê Việt Nam cỡ 25x35cm',
      description: 'Vẽ tay tỉ mỉ trên vóc gỗ, phủ sơn bóng bảo vệ bền màu.',
      basePrice: 92000,
      categoryId: categoriesBySlug['tranh-son-dau-son-mai'].id,
      status: ProductStatus.ACTIVE,
      quantity: 5,
      image:
        'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Hộp đựng trang sức gỗ hương khảm họa tiết cổ điển',
      description: 'Chế tác thủ công, lót nhung mịn bảo vệ nhẫn và vòng tay.',
      basePrice: 78000,
      categoryId: categoriesBySlug['hop-kham-do-suu-tam-co'].id,
      status: ProductStatus.ACTIVE,
      quantity: 8,
      image:
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Đèn bàn ngủ chụp vải linen chân gỗ sồi ấm áp',
      description: 'Ánh sáng vàng dịu mắt, công tắc bật tắt tiện lợi cho phòng ngủ.',
      basePrice: 86000,
      categoryId: categoriesBySlug['den-trang-tri-den-ban'].id,
      status: ProductStatus.ACTIVE,
      quantity: 9,
      image:
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Nến thơm sáp đậu nành hương gỗ đàn hương & oải hương',
      description: 'Thời gian đốt khoảng 30 giờ, giúp thư giãn không gian làm việc.',
      basePrice: 52000,
      categoryId: categoriesBySlug['nen-thom-tinh-dau'].id,
      status: ProductStatus.ACTIVE,
      quantity: 20,
      image:
        'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Phin pha cà phê thủ công bằng gốm tráng men kèm đĩa lót',
      description: 'Giữ nhiệt tốt khi chiết xuất cà phê, họa tiết men hỏa biến độc đáo.',
      basePrice: 67000,
      categoryId: categoriesBySlug['dung-cu-pha-ca-phe'].id,
      status: ProductStatus.ACTIVE,
      quantity: 14,
      image:
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Sổ tay bìa da khâu tay giấy kem 120gsm kèm bút ký kim loại',
      description: 'Giấy dày chống lem mực, bộ quà tặng sang trọng cho dân văn phòng.',
      basePrice: 62000,
      categoryId: categoriesBySlug['so-tay-but-ky-cao-cap'].id,
      status: ProductStatus.ACTIVE,
      quantity: 16,
      image:
        'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const josProductMap = await seedProductsForSeller(
    sellerEntities['Jos'],
    warehouse.id,
    josProducts,
  );
  const huyProductMap = await seedProductsForSeller(
    sellerEntities['Huy'],
    warehouse.id,
    huyProducts,
  );
  const linhProductMap = await seedProductsForSeller(
    sellerEntities['Linh'],
    warehouse.id,
    linhProducts,
  );
  console.info(
    `✅ 5. Đã tạo ${josProducts.length + huyProducts.length + linhProducts.length} sản phẩm cho 3 seller (đủ ACTIVE/INACTIVE/DRAFT, bao phủ mọi danh mục lá)`,
  );

  // =========================================================================
  // 6B. ĐƠN HÀNG ĐÃ HOÀN TẤT ĐỂ 4 SẢN PHẨM LỌT TOP XU HƯỚNG (TRENDING)
  // =========================================================================
  const trendingOrderSeeds = [
    {
      idempotencyKey: 'seed-trending-order-jos-headphone',
      buyer: buyerEntities['Liên'],
      sellerId: sellerEntities['Jos'].id,
      product: josProductMap['Tai nghe nhét tai có dây Jack 3.5mm Extra Bass'],
      quantity: 12,
      status: OrderStatus.DELIVERED,
    },
    {
      idempotencyKey: 'seed-trending-order-huy-watch',
      buyer: buyerEntities['Cường'],
      sellerId: sellerEntities['Huy'].id,
      product: huyProductMap['Đồng hồ nam phong cách Classic mặt tròn dây da nâu'],
      quantity: 9,
      status: OrderStatus.CONFIRMED,
    },
    {
      idempotencyKey: 'seed-trending-order-linh-bracelet',
      buyer: buyerEntities['Minh'],
      sellerId: sellerEntities['Linh'].id,
      product: linhProductMap['Vòng tay hạt trầm hương tự nhiên mix charm bạc S925'],
      quantity: 7,
      status: OrderStatus.DELIVERED,
    },
    {
      idempotencyKey: 'seed-trending-order-jos-cable',
      buyer: buyerEntities['An'],
      sellerId: sellerEntities['Jos'].id,
      product: josProductMap['Cáp sạc nhanh Type-C bọc dù chống đứt 1m'],
      quantity: 5,
      status: OrderStatus.CONFIRMED,
    },
  ];

  for (const seedOrder of trendingOrderSeeds) {
    if (!seedOrder.product) continue;
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey: seedOrder.idempotencyKey },
    });
    if (existingOrder) continue;

    const unitPrice = seedOrder.product.basePrice;
    const subtotal = unitPrice * seedOrder.quantity;
    await prisma.order.create({
      data: {
        buyerId: seedOrder.buyer.id,
        sellerId: seedOrder.sellerId,
        subtotal,
        shippingFee: 0,
        totalAmount: subtotal,
        status: seedOrder.status,
        isAuction: false,
        shippingAddressSnapshot: seedOrder.buyer.address,
        idempotencyKey: seedOrder.idempotencyKey,
        items: {
          create: [
            {
              productId: seedOrder.product.id,
              titleSnapshot: seedOrder.product.title,
              quantity: seedOrder.quantity,
              unitPrice,
              totalPrice: subtotal,
            },
          ],
        },
      },
    });
  }
  console.info('✅ 5B. Đã tạo 4 đơn hàng mẫu để 4 sản phẩm ACTIVE lọt mục Xu hướng (Trending)');

  // =========================================================================
  // 7. DỌN CÁC PHIÊN ĐẤU GIÁ MẪU CŨ (NẾU CHƯA CÓ BID/AWARD) & TẠO 2 PHIÊN ADMIN MỚI
  // =========================================================================
  const legacySeedAuctionTitles = [
    'Triển Lãm Đấu Giá Bảo Vật & Tuyệt Tác NEXUS 2026',
    'Tuyệt Tác Kim Cương & Trang Sức Hoàng Gia NEXUS 2026',
    'Siêu Xe Sưu Tầm & Bất Động Sản Nghỉ Dưỡng Hạng Sang 2026',
    'Hệ Sinh Thái Công Nghệ Flagship & Workstation Độc Bản',
    'Hội Họa Đương Đại, Cổ Vật & Nghệ Thuật Di Sản Đông Dương',
    'Phiên Thẩm Định Đặc Biệt Đa Chủng Loại NEXUS Premier',
    'Audemars Piguet Royal Oak Chronograph 41mm Selfwinding',
  ];

  await prisma.auction.deleteMany({
    where: {
      title: { in: legacySeedAuctionTitles },
      bids: { none: {} },
      awards: { none: {} },
    },
  });

  const now = new Date();

  interface SeedAuctionLot {
    sellerId: string;
    title: string;
    description: string;
    images: string[];
    threeModelKey: string | null;
    proposedStartingPrice: number;
    proposedReservePrice: number;
    proposedBidIncrement: number;
    appraisalCertificateNumber: string;
    appraisalAgency: string;
    certificateImages: string[];
    status: AuctionItemStatus;
    lotNumber: number | null;
    rejectionReason?: string | null;
    staffNote?: string | null;
  }

  async function upsertAdminAuctionWithLots(params: {
    title: string;
    description: string;
    imageUrl: string;
    startTime: Date;
    endTime: Date;
    consignmentDeadline: Date;
    isConsignmentLocked: boolean;
    lots: SeedAuctionLot[];
  }) {
    let auction = await prisma.auction.findFirst({
      where: { title: params.title },
      include: { _count: { select: { bids: true, awards: true } } },
    });

    // Giữ nguyên nếu phiên đã phát sinh lượt đặt giá thật khi test
    if (auction && (auction._count.bids > 0 || auction._count.awards > 0)) {
      console.info(`ℹ️ Bỏ qua cập nhật phiên "${params.title}" vì đã có lượt đặt giá/award.`);
      return auction;
    }

    const baseData = {
      createdByAdminId: admin.id,
      sellerId: null,
      productId: null,
      title: params.title,
      description: params.description,
      imageUrl: params.imageUrl,
      startingPrice: 0,
      reservePrice: null,
      currentHighestBid: 0,
      currentHighestBidderId: null,
      bidIncrement: 2000,
      minBuyerReputation: 40,
      minSellerReputation: 50,
      status: AuctionStatus.SCHEDULED,
      startTime: params.startTime,
      endTime: params.endTime,
      originalEndTime: params.endTime,
      isExtended: false,
      totalBidsCount: 0,
      isConsignmentLocked: params.isConsignmentLocked,
      consignmentLockedAt: params.isConsignmentLocked
        ? new Date(now.getTime() - 1800 * 1000)
        : null,
      consignmentDeadline: params.consignmentDeadline,
    };

    if (auction) {
      auction = await prisma.auction.update({
        where: { id: auction.id },
        data: baseData,
        include: { _count: { select: { bids: true, awards: true } } },
      });
    } else {
      auction = await prisma.auction.create({
        data: baseData,
        include: { _count: { select: { bids: true, awards: true } } },
      });
    }

    await prisma.auctionItem.deleteMany({ where: { auctionId: auction.id } });

    for (const lot of params.lots) {
      const isApproved = lot.status === AuctionItemStatus.APPROVED;
      const isReviewed = lot.status !== AuctionItemStatus.PENDING_REVIEW;

      await prisma.auctionItem.create({
        data: {
          auctionId: auction.id,
          sellerId: lot.sellerId,
          title: lot.title,
          description: lot.description,
          images: lot.images,
          threeModelKey: lot.threeModelKey,
          proposedStartingPrice: lot.proposedStartingPrice,
          proposedReservePrice: lot.proposedReservePrice,
          proposedBidIncrement: lot.proposedBidIncrement,
          startingPrice: isApproved ? lot.proposedStartingPrice : null,
          reservePrice: isApproved ? lot.proposedReservePrice : null,
          bidIncrement: isApproved ? lot.proposedBidIncrement : null,
          lotNumber: isApproved ? lot.lotNumber : null,
          appraisalCertificateNumber: lot.appraisalCertificateNumber,
          appraisalAgency: lot.appraisalAgency,
          certificateImages: lot.certificateImages,
          certificateIssueDate: new Date(now.getTime() - 3 * 86400000),
          status: lot.status,
          lotStatus: AuctionStatus.SCHEDULED,
          rejectionReason: lot.rejectionReason ?? null,
          staffNote: lot.staffNote ?? null,
          reviewedByAdminId: isReviewed ? admin.id : null,
          reviewedAt: isReviewed ? new Date(now.getTime() - 1800 * 1000) : null,
          isSellerFlagged: false,
        },
      });
    }

    return auction;
  }

  // Phiên 1: Đang mở ký gửi & có đủ lô PENDING_REVIEW / APPROVED / REJECTED (có 3D & không 3D)
  const auction1 = await upsertAdminAuctionWithLots({
    title: 'Phiên Ký Gửi & Kiểm Duyệt Lô Đấu Giá NEXUS #1',
    description:
      'Phiên dùng để kiểm tra luồng Seller gửi vật phẩm ký gửi và Admin duyệt/từ chối/sắp lô (giá khởi điểm dưới 100.000đ, bước giá 2.000đ).',
    imageUrl:
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=80',
    startTime: new Date(now.getTime() + 1 * 3600 * 1000),
    consignmentDeadline: new Date(now.getTime() + 12 * 3600 * 1000),
    endTime: new Date(now.getTime() + 24 * 3600 * 1000),
    isConsignmentLocked: false,
    lots: [
      {
        sellerId: sellerEntities['Jos'].id,
        title: 'Tai nghe Studio Hi-Fi Extra Bass (Bản Test 3D)',
        description:
          'Vật phẩm có model 3D dựng sẵn (preset_headphone) đang chờ Admin duyệt vào lô.',
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: 'preset_headphone',
        proposedStartingPrice: 45000,
        proposedReservePrice: 35000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-TEST-101',
        appraisalAgency: 'NEXUS Quality Lab',
        certificateImages: [
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.PENDING_REVIEW,
        lotNumber: null,
        staffNote: 'Đã đối chiếu ảnh sản phẩm và chứng nhận cơ bản.',
      },
      {
        sellerId: sellerEntities['Huy'].id,
        title: 'Hộp xoay & trưng bày đồng hồ gỗ óc chó (Không 3D)',
        description:
          'Vật phẩm không dùng model 3D (hiển thị khung ảnh 3D tự động), đang chờ Admin duyệt.',
        images: [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: null,
        proposedStartingPrice: 55000,
        proposedReservePrice: 45000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-TEST-102',
        appraisalAgency: 'Huy Watch Guild',
        certificateImages: [
          'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.PENDING_REVIEW,
        lotNumber: null,
      },
      {
        sellerId: sellerEntities['Linh'].id,
        title: 'Tranh sơn dầu Hoàng Hôn Phố Cổ (Bản Test 3D)',
        description:
          'Vật phẩm có model 3D (preset_painting) của Seller Linh, đang chờ Admin xét duyệt.',
        images: [
          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: 'preset_painting',
        proposedStartingPrice: 70000,
        proposedReservePrice: 60000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-TEST-103',
        appraisalAgency: 'Hội đồng Mỹ thuật NEXUS',
        certificateImages: [
          'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.PENDING_REVIEW,
        lotNumber: null,
      },
      {
        sellerId: sellerEntities['Jos'].id,
        title: 'Bàn phím cơ Custom Aluminum Test Edition (Có 3D)',
        description:
          'Lô đã được Admin duyệt sẵn (preset_keyboard) để kiểm tra danh sách lô đã duyệt.',
        images: [
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: 'preset_keyboard',
        proposedStartingPrice: 60000,
        proposedReservePrice: 50000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-TEST-104',
        appraisalAgency: 'Custom Mechanical Guild',
        certificateImages: [
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.APPROVED,
        lotNumber: 1,
      },
      {
        sellerId: sellerEntities['Huy'].id,
        title: 'Dây da cá sấu thủ công khóa bướm 20mm (Không 3D)',
        description: 'Lô đã duyệt không dùng model 3D để test hiển thị khung ảnh 3D song song.',
        images: [
          'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: null,
        proposedStartingPrice: 30000,
        proposedReservePrice: 24000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-TEST-105',
        appraisalAgency: 'Huy Leather Lab',
        certificateImages: [
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.APPROVED,
        lotNumber: 2,
      },
      {
        sellerId: sellerEntities['Linh'].id,
        title: 'Bình gốm men lam mini (Mẫu bị từ chối)',
        description: 'Lô mẫu bị từ chối để kiểm tra giao diện & thông báo REJECTED ở Seller/Admin.',
        images: [
          'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: null,
        proposedStartingPrice: 50000,
        proposedReservePrice: 40000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-TEST-106',
        appraisalAgency: 'Trung Tâm Gốm Cổ',
        certificateImages: [
          'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.REJECTED,
        lotNumber: null,
        rejectionReason: 'Ảnh chụp chứng thư thẩm định bị mờ, vui lòng bổ sung ảnh rõ nét.',
      },
    ],
  });

  // Phiên 2: Đã chốt ký gửi & duyệt đủ lô, Admin chỉ cần bấm Bắt đầu để test 3D Showcase & Đấu giá live
  const auction2 = await upsertAdminAuctionWithLots({
    title: 'Phiên Đấu Giá Showcase Sẵn Sàng Mở Bán NEXUS #2',
    description:
      'Phiên đã khóa ký gửi và duyệt sẵn 5 lô từ cả 3 Seller (có cả 3D model và ảnh thường), giá khởi điểm dưới 100.000đ, bước giá 2.000đ. Admin chỉ cần bấm "Bắt đầu" để test.',
    imageUrl:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
    startTime: new Date(now.getTime() + 2 * 3600 * 1000),
    consignmentDeadline: new Date(now.getTime() + 3 * 3600 * 1000),
    endTime: new Date(now.getTime() + 26 * 3600 * 1000),
    isConsignmentLocked: true,
    lots: [
      {
        sellerId: sellerEntities['Huy'].id,
        title: 'Đồng hồ cơ Classic Sapphire Test Edition (Có 3D)',
        description: 'Hiển thị model 3D đồng hồ (preset_watch) trong phòng đấu giá bảo tàng.',
        images: [
          'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: 'preset_watch',
        proposedStartingPrice: 80000,
        proposedReservePrice: 70000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-LIVE-201',
        appraisalAgency: 'Swiss Horology Test Lab',
        certificateImages: [
          'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.APPROVED,
        lotNumber: 1,
      },
      {
        sellerId: sellerEntities['Jos'].id,
        title: 'Laptop Workstation Custom Aluminum Test (Có 3D)',
        description: 'Hiển thị model 3D laptop (preset_laptop) để test đa chủng loại 3D.',
        images: [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: 'preset_laptop',
        proposedStartingPrice: 90000,
        proposedReservePrice: 80000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-LIVE-202',
        appraisalAgency: 'NEXUS Hardware Lab',
        certificateImages: [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.APPROVED,
        lotNumber: 2,
      },
      {
        sellerId: sellerEntities['Linh'].id,
        title: 'Nhẫn Kim Cương Solitaire Test Edition (Có 3D)',
        description: 'Hiển thị model 3D nhẫn kim cương (preset_diamond_ring).',
        images: [
          'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: 'preset_diamond_ring',
        proposedStartingPrice: 75000,
        proposedReservePrice: 65000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-LIVE-203',
        appraisalAgency: 'GIA Test Lab',
        certificateImages: [
          'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.APPROVED,
        lotNumber: 3,
      },
      {
        sellerId: sellerEntities['Huy'].id,
        title: 'Kính lúp kim hoàn 10x bọc da thủ công (Không 3D)',
        description: 'Lô không gắn model 3D, tự động dựng khung tranh 3D từ ảnh sản phẩm.',
        images: [
          'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: null,
        proposedStartingPrice: 35000,
        proposedReservePrice: 25000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-LIVE-204',
        appraisalAgency: 'Huy Watch Guild',
        certificateImages: [
          'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.APPROVED,
        lotNumber: 4,
      },
      {
        sellerId: sellerEntities['Linh'].id,
        title: 'Ấm Tử Sa Chu Nê nghệ nhân ký tặng (Không 3D)',
        description: 'Lô không gắn model 3D, dùng để test chuyển cảnh giữa lô 3D và lô ảnh thường.',
        images: [
          'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80',
        ],
        threeModelKey: null,
        proposedStartingPrice: 50000,
        proposedReservePrice: 40000,
        proposedBidIncrement: 2000,
        appraisalCertificateNumber: 'NEXUS-LIVE-205',
        appraisalAgency: 'Hiệp hội Gốm Sứ Việt',
        certificateImages: [
          'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
        ],
        status: AuctionItemStatus.APPROVED,
        lotNumber: 5,
      },
    ],
  });

  console.info(
    '✅ 6. Đã khởi tạo 2 phiên đấu giá Admin kèm các lô từ 3 Seller (giá < 100k, bước giá 2k)',
  );

  // =========================================================================
  // 8. BANNER SỰ KIỆN ĐẤU GIÁ (GẮN TRỰC TIẾP VÀO 2 PHIÊN ĐẤU GIÁ ADMIN)
  // =========================================================================
  const eventBanners = [
    {
      title: 'Sự Kiện Đấu Giá 3D Showcase NEXUS #2 — Sẵn Sàng Mở Bán',
      imageUrl:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      auctionId: auction2.id,
      priority: 20,
    },
    {
      title: 'Mở Ký Gửi Vật Phẩm Đấu Giá NEXUS #1 — Giá Khởi Điểm Dưới 100K',
      imageUrl:
        'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=80',
      auctionId: auction1.id,
      priority: 10,
    },
  ];

  for (const banner of eventBanners) {
    const existingBanner = await prisma.eventBanner.findFirst({
      where: {
        OR: [{ auctionId: banner.auctionId }, { title: banner.title }],
      },
    });

    const bannerData = {
      title: banner.title,
      imageUrl: banner.imageUrl,
      targetUrl: `/auction/${encodeURIComponent(banner.auctionId)}`,
      auctionId: banner.auctionId,
      startsAt: null,
      endsAt: null,
      isActive: true,
      priority: banner.priority,
      creatorId: admin.id,
      creatorRole: BannerCreatorRole.ADMIN,
    };

    if (existingBanner) {
      await prisma.eventBanner.update({
        where: { id: existingBanner.id },
        data: bannerData,
      });
    } else {
      await prisma.eventBanner.create({
        data: bannerData,
      });
    }
  }
  console.info('✅ 7. Đã khởi tạo 2 Banner sự kiện gắn với 2 phiên đấu giá');
  console.info('\n🎉🎉🎉 SEED HOÀN TẤT! 🎉🎉🎉');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi thực thi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
