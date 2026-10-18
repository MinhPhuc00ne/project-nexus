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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
