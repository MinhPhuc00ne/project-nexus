import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Nạp file .env ở thư mục gốc (lùi ra 2 cấp từ backend/prisma/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:nexus_secret_2026@localhost:5432/nexus_main?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Tạo mật khẩu mã hóa cho Admin (Admin@123456)
  const hashedPassword = await bcrypt.hash('Admin@123456', 10);

  // 2. Tạo hoặc cập nhật tài khoản Admin cố định
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexus.com' },
    update: { passwordHash: hashedPassword, isVerified: true },
    create: {
      email: 'admin@nexus.com',
      passwordHash: hashedPassword,
      fullName: 'System Admin',
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  console.info('✅ Đã tạo tài khoản Admin cố định thành công:', admin.email);

  // 3. Tạo kho hàng mặc định WH_001
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
  console.info('✅ Đã khởi tạo kho hàng mặc định:', warehouse.code);

  // 4. Tạo cây danh mục sản phẩm 3 cấp mẫu
  const catWatches = await prisma.category.upsert({
    where: { slug: 'dong-ho-trang-suc' },
    update: { name: 'Đồng Hồ & Trang Sức', level: 1 },
    create: {
      name: 'Đồng Hồ & Trang Sức',
      slug: 'dong-ho-trang-suc',
      level: 1,
    },
  });

  const catLuxuryWatches = await prisma.category.upsert({
    where: { slug: 'dong-ho-cao-cap' },
    update: { name: 'Đồng Hồ Cao Cấp', parentId: catWatches.id, level: 2 },
    create: {
      name: 'Đồng Hồ Cao Cấp',
      slug: 'dong-ho-cao-cap',
      parentId: catWatches.id,
      level: 2,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'dong-ho-nam-sang-trong' },
    update: { name: 'Đồng Hồ Nam Sang Trọng', parentId: catLuxuryWatches.id, level: 3 },
    create: {
      name: 'Đồng Hồ Nam Sang Trọng',
      slug: 'dong-ho-nam-sang-trong',
      parentId: catLuxuryWatches.id,
      level: 3,
    },
  });

  const catTech = await prisma.category.upsert({
    where: { slug: 'cong-nghe-dien-tu' },
    update: { name: 'Công Nghệ & Điện Tử', level: 1 },
    create: {
      name: 'Công Nghệ & Điện Tử',
      slug: 'cong-nghe-dien-tu',
      level: 1,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'dien-thoai-phu-kien' },
    update: { name: 'Điện Thoại & Phụ Kiện', parentId: catTech.id, level: 2 },
    create: {
      name: 'Điện Thoại & Phụ Kiện',
      slug: 'dien-thoai-phu-kien',
      parentId: catTech.id,
      level: 2,
    },
  });

  console.info('✅ Đã khởi tạo cây danh mục sản phẩm mẫu thành công!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
