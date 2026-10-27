import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { QueryAdminProductsDto } from '../dto/query-admin-products.dto';
import { UpdateProductStatusDto } from '../dto/update-product-status.dto';

@Injectable()
export class AdminProductsService {
  private readonly logger = new Logger(AdminProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách toàn bộ sản phẩm trên hệ thống có phân trang & bộ lọc kiểm duyệt
   */
  async listProducts(query: QueryAdminProductsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.sellerId) {
      where.sellerId = query.sellerId;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          seller: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true, level: true } },
          seller: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              avatarUrl: true,
              isSellerActive: true,
            },
          },
          images: { orderBy: { sortOrder: 'asc' } },
          inventories: { select: { availableQty: true, totalQty: true, reservedQty: true } },
        },
      }),
    ]);

    const items = products.map((p) => {
      const availableQty = p.inventories.reduce((acc, curr) => acc + curr.availableQty, 0);
      const totalQty = p.inventories.reduce((acc, curr) => acc + curr.totalQty, 0);
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        basePrice: Number(p.basePrice),
        status: p.status,
        threeModelKey: p.threeModelKey,
        weightGrams: p.weightGrams,
        category: p.category,
        seller: p.seller,
        thumbnailUrl: p.images[0]?.imageUrl || null,
        imagesCount: p.images.length,
        stock: {
          availableQty,
          totalQty,
        },
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
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
   * Xem chi tiết sản phẩm dưới góc nhìn Admin kiểm duyệt
   */
  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            level: true,
            parent: { select: { id: true, name: true } },
          },
        },
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
            isSellerActive: true,
            reputationScore: true,
            trustLevel: true,
          },
        },
        images: { orderBy: { sortOrder: 'asc' } },
        inventories: {
          include: {
            warehouse: { select: { id: true, code: true, name: true, address: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    const availableQty = product.inventories.reduce((acc, curr) => acc + curr.availableQty, 0);
    const totalQty = product.inventories.reduce((acc, curr) => acc + curr.totalQty, 0);

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      basePrice: Number(product.basePrice),
      status: product.status,
      threeModelKey: product.threeModelKey,
      weightGrams: product.weightGrams,
      dimensions: {
        lengthCm: product.lengthCm,
        widthCm: product.widthCm,
        heightCm: product.heightCm,
      },
      category: product.category,
      seller: product.seller,
      images: product.images,
      inventories: product.inventories,
      stockSummary: {
        availableQty,
        totalQty,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Cập nhật trạng thái sản phẩm (Duyệt bán ACTIVE hoặc Khóa/Ẩn INACTIVE)
   */
  async updateProductStatus(id: string, adminId: string, dto: UpdateProductStatusDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isShopSuspended: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    if (dto.status === ProductStatus.ACTIVE && product.seller?.isShopSuspended) {
      throw new BadRequestException(
        'Không thể kích hoạt sản phẩm vì gian hàng của người bán này đang bị đình chỉ hoạt động.',
      );
    }

    const oldStatus = product.status;
    // Gửi thông báo đến người bán nếu sản phẩm bị ẩn hoặc được duyệt
    const isHidden = dto.status === ProductStatus.INACTIVE;
    const actionText = isHidden ? 'đã bị tạm ẩn/khóa' : 'đã được chuyển sang trạng thái hoạt động';

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${product.sellerId} FOR UPDATE`;
      const seller = await tx.user.findUnique({
        where: { id: product.sellerId },
        select: { isShopSuspended: true },
      });
      if (!seller || (dto.status === ProductStatus.ACTIVE && seller.isShopSuspended)) {
        throw new BadRequestException('Không thể kích hoạt sản phẩm của shop đang bị đình chỉ.');
      }
      const result = await tx.product.update({
        where: { id },
        data: { status: dto.status, hiddenByShopSuspension: false },
      });
      await tx.notification.create({
        data: {
          userId: product.sellerId,
          title: isHidden
            ? 'Sản phẩm của bạn đã bị ẩn bởi Quản trị viên ⚠️'
            : 'Sản phẩm đã được kích hoạt 🎉',
          content: `Sản phẩm "${product.title}" của bạn ${actionText}.${dto.reason ? ` Lý do: ${dto.reason}` : ''}`,
          type: NotificationType.SYSTEM,
        },
      });
      return result;
    });

    this.logger.log(
      `Admin (${adminId}) đã đổi trạng thái sản phẩm ${product.title} (${product.id}) từ ${oldStatus} sang ${dto.status}.`,
    );

    return {
      success: true,
      message: `Đã cập nhật trạng thái sản phẩm thành ${dto.status} thành công.`,
      product: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
      },
    };
  }

  /**
   * Xóa sản phẩm bởi Quản trị viên (kiểm tra an toàn đơn hàng)
   */
  async deleteProduct(id: string, adminId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: { select: { id: true }, take: 1 },
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    // Nếu sản phẩm đã từng phát sinh đơn hàng, chỉ cho phép chuyển sang INACTIVE thay vì xóa vật lý
    if (product.orderItems.length > 0) {
      await this.prisma.product.update({
        where: { id },
        data: { status: ProductStatus.INACTIVE, hiddenByShopSuspension: false },
      });
      return {
        success: true,
        message:
          'Sản phẩm đã phát sinh đơn hàng trong quá khứ nên hệ thống đã chuyển sang trạng thái ẨN (INACTIVE) để bảo toàn lịch sử giao dịch.',
      };
    }

    // Xóa an toàn khi chưa có đơn hàng
    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.inventoryReservation.deleteMany({ where: { inventory: { productId: id } } });
      const inventories = await tx.inventory.findMany({ where: { productId: id } });
      for (const inv of inventories) {
        await tx.inventoryLedger.deleteMany({ where: { inventoryId: inv.id } });
      }
      await tx.inventory.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    this.logger.log(`Admin (${adminId}) đã xóa vĩnh viễn sản phẩm ${product.title} (${id}).`);

    return {
      success: true,
      message: `Đã xóa vĩnh viễn sản phẩm "${product.title}" thành công.`,
    };
  }
}
