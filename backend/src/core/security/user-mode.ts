import { User } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export function userMode(user: Pick<User, 'role' | 'isSellerActive' | 'isShopSuspended'>): {
  accountRole: User['role'];
  activeRole: User['role'];
  currentMode: 'BUYER' | 'SELLER';
  isSellerActive: boolean;
} {
  const active = user.isSellerActive && !user.isShopSuspended;
  const currentMode = active ? 'SELLER' : 'BUYER';
  return {
    accountRole: user.role,
    activeRole: user.role === 'SELLER' ? currentMode : user.role,
    currentMode,
    isSellerActive: active,
  };
}

export async function toggleSellerState(
  prisma: PrismaService,
  userId: string,
  requested?: boolean,
): Promise<User> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');
    if (!['SELLER', 'ADMIN', 'SUPPORT_STAFF'].includes(user.role)) {
      throw new ForbiddenException('Tài khoản chưa được cấp quyền Seller.');
    }
    const active = requested ?? !user.isSellerActive;
    if (active && user.isShopSuspended)
      throw new ForbiddenException('Shop đang bị đình chỉ, không thể bật chế độ Seller.');
    return tx.user.update({ where: { id: userId }, data: { isSellerActive: active } });
  });
}
