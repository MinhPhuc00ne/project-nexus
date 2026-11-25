import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { notifyAllAdmins } from '../../../core/notifications/admin-notification.util';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { QueryProductDto } from '../dtos/query-product.dto';
import { InventoryService } from './inventory.service';
import { NotificationType, ProductStatus, Prisma, Role } from '@prisma/client';
import { PaginatedResult, formatProductDetail } from '../utils/product.util';
import { normalizeOptions } from '../utils/product-options';
import { priceView } from '../utils/product-price';
import { ProductSearchService } from './product-search.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly search: ProductSearchService,
  ) {}

  private async validateSellerActiveShop(
    sellerId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    const user = await client.user.findUnique({
      where: { id: sellerId },
      select: { role: true, isSellerActive: true, isShopSuspended: true, suspensionReason: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy thông tin người bán.');
    if (user.role === Role.ADMIN) return;
    if (user.role !== Role.SELLER)
      throw new ForbiddenException('Chỉ Seller được quản lý sản phẩm.');
    if (user.isShopSuspended)
      throw new ForbiddenException(
        `Gian hàng của bạn hiện đang bị Admin đình chỉ hoạt động.${user.suspensionReason ? ` Lý do: ${user.suspensionReason}` : ''} Không thể thực hiện thao tác này.`,
      );
    if (!user.isSellerActive)
      throw new ForbiddenException(
        'Gian hàng chưa được kích hoạt chế độ Người bán. Vui lòng chuyển sang chế độ Người bán trước khi thực hiện.',
      );
  }

  async createProduct(sellerId: string, dto: CreateProductDto) {
    await this.validateSellerActiveShop(sellerId);
    assertCleanContent(dto.title, 'Tên sản phẩm');
    assertCleanContent(dto.description, 'Mô tả sản phẩm');
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Danh mục sản phẩm không tồn tại.');
    const warehouse = await this.inventoryService.ensureDefaultWarehouse();
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${sellerId} FOR UPDATE`;
      await this.validateSellerActiveShop(sellerId, tx);
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
          options: dto.options ? { create: normalizeOptions(dto.options) } : undefined,
          images: {
            create: dto.images.map((url, index) => ({
              imageUrl: url,
              isThumbnail: index === 0,
              sortOrder: index,
            })),
          },
        },
        include: { images: true, category: true, options: true },
      });
      const inventory = await this.inventoryService.createInitialStock(
        tx,
        warehouse.id,
        product.id,
        dto.quantity,
      );
      await notifyAllAdmins(tx, {
        title: 'Sản phẩm mới vừa được đăng bán',
        content: `Sản phẩm "${product.title}" vừa được đăng tải với giá ${Number(dto.basePrice).toLocaleString('vi-VN')} VND.`,
        type: NotificationType.SYSTEM,
        targetUrl: '/admin/products',
      });
      return {
        ...product,
        basePrice: Number(product.basePrice),
        ...priceView(product),
        inventory: {
          totalQty: inventory.totalQty,
          availableQty: inventory.availableQty,
          reservedQty: inventory.reservedQty,
        },
      };
    });
  }

  async getSellerProducts(sellerId: string) {
    const products = await this.prisma.product.findMany({
      where: { sellerId },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        inventories: true,
        options: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      ...priceView(p),
      availableQty: this.inventoryService.calculateAvailable(p.inventories),
      totalQty: this.inventoryService.calculateTotal(p.inventories),
    }));
  }

  async updateProduct(sellerId: string, productId: string, dto: UpdateProductDto) {
    await this.validateSellerActiveShop(sellerId);
    if (dto.title) assertCleanContent(dto.title, 'Tên sản phẩm');
    if (dto.description) assertCleanContent(dto.description, 'Mô tả sản phẩm');
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventories: true },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại.');
    if (product.sellerId !== sellerId)
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa sản phẩm này.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${sellerId} FOR UPDATE`;
      await this.validateSellerActiveShop(sellerId, tx);
      const current = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        include: { inventories: true },
      });
      if (
        dto.basePrice !== undefined &&
        current.salePrice !== null &&
        Number(current.salePrice) >= dto.basePrice
      ) {
        throw new BadRequestException(
          'Hãy điều chỉnh/dừng sale trước khi hạ giá gốc xuống thấp hơn giá sale.',
        );
      }
      if (dto.options !== undefined) {
        const options = normalizeOptions(dto.options ?? []);
        await tx.productOption.deleteMany({ where: { productId } });
        await tx.productOption.createMany({
          data: options.map((option) => ({ ...option, productId })),
        });
      }
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
      if (dto.quantity !== undefined)
        await this.inventoryService.updateProductStock(
          tx,
          productId,
          current.inventories,
          dto.quantity,
        );
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          title: dto.title?.trim(),
          description: dto.description?.trim(),
          basePrice: dto.basePrice,
          categoryId: dto.categoryId,
          status: dto.status,
          ...(dto.status !== undefined ? { hiddenByShopSuspension: false } : {}),
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
          options: true,
        },
      });
      return {
        ...updated,
        basePrice: Number(updated.basePrice),
        ...priceView(updated),
        availableQty: this.inventoryService.calculateAvailable(updated.inventories),
        totalQty: this.inventoryService.calculateTotal(updated.inventories),
      };
    });
  }

  async deleteProduct(sellerId: string, productId: string) {
    await this.validateSellerActiveShop(sellerId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại.');
    if (product.sellerId !== sellerId)
      throw new ForbiddenException('Bạn không có quyền xóa sản phẩm này.');
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${sellerId} FOR UPDATE`;
      await this.validateSellerActiveShop(sellerId, tx);
      await tx.product.update({
        where: { id: productId },
        data: { status: ProductStatus.INACTIVE, hiddenByShopSuspension: false },
      });
    });
    return { success: true, message: 'Đã ẩn sản phẩm thành công.' };
  }

  getProducts(query: QueryProductDto): Promise<PaginatedResult<unknown>> {
    return this.search.getProducts(query);
  }

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
            shopAvatarUrl: true,
            reputationScore: true,
            trustLevel: true,
            isShopSuspended: true,
          },
        },
        inventories: true,
        options: true,
      },
    });
    if (!product || product.status !== ProductStatus.ACTIVE)
      throw new NotFoundException('Sản phẩm không tồn tại.');
    if (product.seller?.isShopSuspended)
      throw new NotFoundException(
        'Sản phẩm không tồn tại hoặc gian hàng hiện đang tạm đình chỉ hoạt động.',
      );
    const availableQty = this.inventoryService.calculateAvailable(product.inventories);
    const totalQty = this.inventoryService.calculateTotal(product.inventories);
    const purchaseMeta = await this.search.getProductPurchaseMeta(
      product.id,
      Boolean(product.trendingExcluded),
    );
    return {
      ...formatProductDetail(product, availableQty, totalQty),
      ...purchaseMeta,
    };
  }
}
