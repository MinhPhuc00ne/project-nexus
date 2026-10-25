import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { QueryProductDto } from '../dtos/query-product.dto';
import { InventoryService } from './inventory.service';
import { ProductStatus, Prisma, Role } from '@prisma/client';
import {
  PaginatedResult,
  buildProductWhere,
  formatProductSummary,
  formatProductDetail,
} from '../utils/product.util';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  private async validateSellerActiveShop(sellerId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { role: true, isSellerActive: true, isShopSuspended: true, suspensionReason: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy thông tin người bán.');
    if (user.role === Role.ADMIN) return;
    if (user.isShopSuspended) {
      throw new ForbiddenException(
        `Gian hàng của bạn hiện đang bị Admin đình chỉ hoạt động.${user.suspensionReason ? ` Lý do: ${user.suspensionReason}` : ''} Không thể thực hiện thao tác này.`,
      );
    }
    if (!user.isSellerActive) {
      throw new ForbiddenException(
        'Gian hàng chưa được kích hoạt chế độ Người bán. Vui lòng chuyển sang chế độ Người bán trước khi thực hiện.',
      );
    }
  }

  /** Đăng bán sản phẩm mới và tự động khởi tạo tồn kho */
  async createProduct(sellerId: string, dto: CreateProductDto) {
    await this.validateSellerActiveShop(sellerId);
    assertCleanContent(dto.title, 'Tên sản phẩm');
    assertCleanContent(dto.description, 'Mô tả sản phẩm');

    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Danh mục sản phẩm không tồn tại.');

    const warehouse = await this.inventoryService.ensureDefaultWarehouse();

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sellerId,
          categoryId: dto.categoryId,
          title: dto.title.trim(),
          description: dto.description.trim(),
          basePrice: dto.basePrice,
          weightGrams: dto.weightGrams ?? 500,
          lengthCm: dto.lengthCm ?? 10,
          widthCm: dto.widthCm ?? 10,
          heightCm: dto.heightCm ?? 10,
          threeModelKey: dto.threeModelKey,
          status: ProductStatus.ACTIVE,
          images: {
            create: dto.images.map((url, index) => ({
              imageUrl: url,
              isThumbnail: index === 0,
              sortOrder: index,
            })),
          },
        },
        include: { images: true, category: true },
      });

      const inventory = await this.inventoryService.createInitialStock(
        tx,
        warehouse.id,
        product.id,
        dto.quantity,
      );

      return {
        ...product,
        basePrice: Number(product.basePrice),
        inventory: {
          totalQty: inventory.totalQty,
          availableQty: inventory.availableQty,
          reservedQty: inventory.reservedQty,
        },
      };
    });
  }

  /** Lấy danh sách sản phẩm của chính Seller đang đăng bán */
  async getSellerProducts(sellerId: string) {
    const products = await this.prisma.product.findMany({
      where: { sellerId },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        inventories: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      availableQty: this.inventoryService.calculateAvailable(p.inventories),
      totalQty: this.inventoryService.calculateTotal(p.inventories),
    }));
  }

  /** Cập nhật sản phẩm & điều chỉnh số lượng tồn kho */
  async updateProduct(sellerId: string, productId: string, dto: UpdateProductDto) {
    await this.validateSellerActiveShop(sellerId);
    if (dto.title) assertCleanContent(dto.title, 'Tên sản phẩm');
    if (dto.description) assertCleanContent(dto.description, 'Mô tả sản phẩm');

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventories: true },
    });

    if (!product) throw new NotFoundException('Sản phẩm không tồn tại.');
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa sản phẩm này.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.images && dto.images.length > 0) {
        await tx.productImage.deleteMany({ where: { productId } });
        await tx.productImage.createMany({
          data: dto.images.map((url, index) => ({
            productId,
            imageUrl: url,
            isThumbnail: index === 0,
            sortOrder: index,
          })),
        });
      }

      if (dto.quantity !== undefined) {
        await this.inventoryService.updateProductStock(
          tx,
          productId,
          product.inventories,
          dto.quantity,
        );
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          title: dto.title?.trim(),
          description: dto.description?.trim(),
          basePrice: dto.basePrice,
          categoryId: dto.categoryId,
          status: dto.status,
          weightGrams: dto.weightGrams,
          lengthCm: dto.lengthCm,
          widthCm: dto.widthCm,
          heightCm: dto.heightCm,
          threeModelKey: dto.threeModelKey,
        },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: true,
          inventories: true,
        },
      });

      return {
        ...updated,
        basePrice: Number(updated.basePrice),
        availableQty: this.inventoryService.calculateAvailable(updated.inventories),
        totalQty: this.inventoryService.calculateTotal(updated.inventories),
      };
    });
  }

  /** Xóa / Ẩn sản phẩm */
  async deleteProduct(sellerId: string, productId: string) {
    await this.validateSellerActiveShop(sellerId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại.');
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền xóa sản phẩm này.');
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.INACTIVE },
    });

    return { success: true, message: 'Đã ẩn sản phẩm thành công.' };
  }

  /** Tìm kiếm & Lấy danh sách sản phẩm công khai */
  async getProducts(query: QueryProductDto): Promise<PaginatedResult<unknown>> {
    if (query.search) assertCleanContent(query.search, 'Từ khóa tìm kiếm');

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    let categoryIds: string[] | undefined;
    if (query.categoryId) {
      const childCategories = await this.prisma.category.findMany({
        where: { parentId: query.categoryId },
        select: { id: true },
      });
      categoryIds = [query.categoryId, ...childCategories.map((c) => c.id)];
    }

    const where = buildProductWhere(query, categoryIds);
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy === 'price_asc') orderBy = { basePrice: 'asc' };
    else if (query.sortBy === 'price_desc') orderBy = { basePrice: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, fullName: true, avatarUrl: true } },
          inventories: { select: { availableQty: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const formattedItems = items.map((p) => {
      const availableQty = this.inventoryService.calculateAvailable(p.inventories);
      return formatProductSummary(p, availableQty);
    });

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Lấy chi tiết 1 sản phẩm */
  async getProductDetail(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: { select: { id: true, name: true } },
          },
        },
        seller: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            reputationScore: true,
            trustLevel: true,
            isShopSuspended: true,
          },
        },
        inventories: true,
      },
    });

    if (!product) throw new NotFoundException('Sản phẩm không tồn tại.');
    if (product.seller?.isShopSuspended) {
      throw new NotFoundException(
        'Sản phẩm không tồn tại hoặc gian hàng hiện đang tạm đình chỉ hoạt động.',
      );
    }
    const availableQty = this.inventoryService.calculateAvailable(product.inventories);
    const totalQty = this.inventoryService.calculateTotal(product.inventories);

    return formatProductDetail(product, availableQty, totalQty);
  }
}
