import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, ProductStatus, Role, SellerRequestStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { QueryAdminShopsDto } from '../dto/query-admin-shops.dto';
import { UpdateShopStatusDto } from '../dto/update-shop-status.dto';

@Injectable()
export class AdminShopsService {
  private readonly logger = new Logger(AdminShopsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách toàn bộ các gian hàng (Shop/Seller) kèm phân trang & lọc trạng thái
   */
  async listShops(query: QueryAdminShopsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: Role.SELLER,
    };

    if (query.status === 'ACTIVE') {
      where.isShopSuspended = false;
      where.isSellerActive = true;
    } else if (query.status === 'SUSPENDED') {
      where.isShopSuspended = true;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        {
          sellerUpgradeRequests: {
            some: {
              OR: [
                { storeName: { contains: search, mode: 'insensitive' } },
                { storeDescription: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    if (query.city?.trim()) {
      where.addresses = {
        some: {
          city: { contains: query.city.trim(), mode: 'insensitive' },
        },
      };
    }

    const [total, sellers] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sellerUpgradeRequests: {
            where: { status: SellerRequestStatus.APPROVED },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          addresses: {
            where: { isDefault: true },
            take: 1,
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
      }),
    ]);

    const items = sellers.map((s) => {
      const latestRequest = s.sellerUpgradeRequests[0];
      const defaultAddress = s.addresses[0];
      return {
        id: s.id,
        sellerFullName: s.fullName,
        sellerEmail: s.email,
        sellerPhone: s.phoneNumber,
        storeName: latestRequest?.storeName || s.fullName,
        storeDescription: latestRequest?.storeDescription || null,
        avatarUrl: s.avatarUrl,
        isSellerActive: s.isSellerActive,
        isShopSuspended: s.isShopSuspended,
        suspensionReason: s.suspensionReason,
        status: s.isShopSuspended ? 'SUSPENDED' : s.isSellerActive ? 'ACTIVE' : 'INACTIVE',
        totalProducts: s._count.products,
        address: defaultAddress
          ? {
              street: defaultAddress.street,
              ward: defaultAddress.ward,
              district: defaultAddress.district,
              city: defaultAddress.city,
              formattedAddress: defaultAddress.formattedAddress,
            }
          : null,
        createdAt: s.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Đình chỉ hoặc Khôi phục hoạt động của một gian hàng (Shop Suspension)
   * Không khóa tài khoản cá nhân, Seller vẫn có thể dùng tài khoản để mua sắm (Buyer mode).
   */
  async updateShopStatus(sellerId: string, adminId: string, dto: UpdateShopStatusDto) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          take: 1,
        },
      },
    });

    if (!seller || seller.role !== Role.SELLER) {
      throw new NotFoundException('Không tìm thấy gian hàng của người bán này.');
    }

    const isSuspending = !dto.isSellerActive;
    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật isShopSuspended, suspensionReason và isSellerActive
      const updatedUser = await tx.user.update({
        where: { id: sellerId },
        data: {
          isSellerActive: dto.isSellerActive,
          isShopSuspended: isSuspending,
          suspensionReason: isSuspending
            ? dto.reason?.trim() || 'Gian hàng bị Admin tạm đình chỉ'
            : null,
        },
      });

      // 2. Nếu đình chỉ gian hàng, tự động ẩn toàn bộ sản phẩm của gian hàng để người mua không đặt được
      if (isSuspending) {
        await tx.product.updateMany({
          where: { sellerId, status: ProductStatus.ACTIVE },
          data: { status: ProductStatus.INACTIVE },
        });
      }

      // 3. Gửi thông báo đến người bán
      await tx.notification.create({
        data: {
          userId: sellerId,
          title: isSuspending
            ? 'Gian hàng của bạn đã bị tạm đình chỉ hoạt động ⚠️'
            : 'Gian hàng của bạn đã được mở lại 🎉',
          content: isSuspending
            ? `Gian hàng "${storeName}" đã bị Quản trị viên tạm đình chỉ.${dto.reason ? ` Lý do: ${dto.reason}` : ''} Toàn bộ sản phẩm của gian hàng đã được tạm ẩn. Bạn vẫn có thể sử dụng tài khoản để mua sắm bình thường.`
            : `Gian hàng "${storeName}" đã được khôi phục trạng thái hoạt động. Bạn có thể kích hoạt lại các sản phẩm và tiếp tục kinh doanh.`,
          type: NotificationType.SYSTEM,
        },
      });

      return updatedUser;
    });

    this.logger.log(
      `Admin (${adminId}) đã chuyển trạng thái gian hàng ${storeName} (${sellerId}) thành ${dto.isSellerActive ? 'ACTIVE' : 'SUSPENDED'}.`,
    );

    return {
      success: true,
      message: isSuspending
        ? `Đã tạm đình chỉ hoạt động gian hàng "${storeName}". Sản phẩm của shop đã được ẩn khỏi sàn.`
        : `Đã mở lại hoạt động cho gian hàng "${storeName}".`,
      shop: {
        id: result.id,
        storeName,
        isSellerActive: result.isSellerActive,
        isShopSuspended: result.isShopSuspended,
        suspensionReason: result.suspensionReason,
        status: result.isShopSuspended
          ? 'SUSPENDED'
          : result.isSellerActive
            ? 'ACTIVE'
            : 'INACTIVE',
      },
    };
  }
}
