import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AddToCartInput } from '../dtos/add-to-cart.dto';
import { UpdateCartItemInput } from '../dtos/update-cart-item.dto';
import { MergeCartInput } from '../dtos/merge-cart.dto';
import {
  getCartExpiresAt,
  formatCartItem,
  summarizeCart,
  FormattedCartItem,
} from '../../../core/domain/cart-item';
import { effectivePrice } from '../../../core/domain/product-price';
import { validateSelections } from '../../../core/domain/product-options';

export interface CartView {
  cartId: string;
  userId: string;
  expiresAt: Date;
  items: FormattedCartItem[];
  totalCount: number;
  totalPrice: number;
  hasPriceChanged: boolean;
  skippedItems?: Array<{ productId: string; reason: string }>;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async lockedCart(tx: Prisma.TransactionClient, userId: string): Promise<{ id: string }> {
    const cart = await tx.cart.upsert({
      where: { userId },
      update: { expiresAt: getCartExpiresAt() },
      create: { userId, expiresAt: getCartExpiresAt() },
    });
    await tx.$queryRaw`SELECT id FROM carts WHERE id = ${cart.id} FOR UPDATE`;
    return cart;
  }

  async getCart(userId: string): Promise<CartView> {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId, expiresAt: getCartExpiresAt() },
    });
    const fullCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                options: true,
                images: { orderBy: { sortOrder: 'asc' } },
                seller: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                    shopAvatarUrl: true,
                    isShopSuspended: true,
                  },
                },
                inventories: { select: { availableQty: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!fullCart) throw new NotFoundException('Không tìm thấy giỏ hàng.');
    const items = fullCart.items.map((item) => formatCartItem(item));
    return {
      cartId: fullCart.id,
      userId: fullCart.userId,
      expiresAt: fullCart.expiresAt,
      items,
      ...summarizeCart(items),
    };
  }

  private async purchasable(tx: Prisma.TransactionClient, userId: string, productId: string) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { inventories: true, options: true, seller: { select: { isShopSuspended: true } } },
    });
    if (!product || product.status !== ProductStatus.ACTIVE || product.seller.isShopSuspended) {
      throw new BadRequestException('Sản phẩm ngừng bán hoặc shop đang bị đình chỉ.');
    }
    if (product.sellerId === userId)
      throw new BadRequestException({
        message: 'Không thể tự mua sản phẩm của mình.',
        errorCode: AppErrorCode.CANNOT_PURCHASE_OWN_PRODUCT,
      });
    return product;
  }

  private async append(
    tx: Prisma.TransactionClient,
    userId: string,
    cartId: string,
    dto: AddToCartInput,
    clamp = false,
  ): Promise<void> {
    if (!Number.isSafeInteger(dto.quantity) || dto.quantity < 1)
      throw new BadRequestException('Số lượng không hợp lệ.');
    const product = await this.purchasable(tx, userId, dto.productId);
    const choice = validateSelections(product.options, dto.selections);
    const totalAvailable = product.inventories.reduce((sum, inv) => sum + inv.availableQty, 0);
    const existing = await tx.cartItem.aggregate({
      where: { cartId, productId: dto.productId },
      _sum: { quantity: true },
    });
    const room = totalAvailable - (existing._sum.quantity ?? 0);
    const quantity = clamp ? Math.min(dto.quantity, room) : dto.quantity;
    if (quantity < 1 || quantity > room)
      throw new BadRequestException({
        message: 'Tổng số lượng các màu/size trong giỏ vượt tồn kho sản phẩm.',
        errorCode: AppErrorCode.INSUFFICIENT_STOCK,
      });
    await tx.cartItem.upsert({
      where: {
        cartId_productId_optionKey: {
          cartId,
          productId: dto.productId,
          optionKey: choice.optionKey,
        },
      },
      update: { quantity: { increment: quantity } },
      create: {
        cartId,
        productId: dto.productId,
        optionKey: choice.optionKey,
        selections: choice.selections,
        quantity,
        priceAtAdded: effectivePrice(product),
      },
    });
  }

  async addToCart(userId: string, dto: AddToCartInput): Promise<CartView> {
    await this.prisma.$transaction(async (tx) => {
      const cart = await this.lockedCart(tx, userId);
      await this.append(tx, userId, cart.id, dto);
    });
    return this.getCart(userId);
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemInput,
  ): Promise<CartView> {
    if (!Number.isSafeInteger(dto.quantity) || dto.quantity < 0)
      throw new BadRequestException('Số lượng không hợp lệ.');
    await this.prisma.$transaction(async (tx) => {
      const cart = await this.lockedCart(tx, userId);
      const item = await tx.cartItem.findUnique({ where: { id: cartItemId } });
      if (!item || item.cartId !== cart.id)
        throw new NotFoundException('Món hàng không thuộc giỏ của bạn.');
      if (dto.quantity === 0) {
        await tx.cartItem.delete({ where: { id: item.id } });
        return;
      }
      const product = await this.purchasable(tx, userId, item.productId);
      validateSelections(product.options, item.selections);
      const other = await tx.cartItem.aggregate({
        where: { cartId: cart.id, productId: item.productId, id: { not: item.id } },
        _sum: { quantity: true },
      });
      const available = product.inventories.reduce((sum, inv) => sum + inv.availableQty, 0);
      if (dto.quantity + (other._sum.quantity ?? 0) > available)
        throw new BadRequestException('Tổng lựa chọn vượt tồn kho sản phẩm.');
      await tx.cartItem.update({ where: { id: item.id }, data: { quantity: dto.quantity } });
    });
    return this.getCart(userId);
  }

  async removeCartItem(userId: string, cartItemId: string): Promise<CartView> {
    await this.prisma.$transaction(async (tx) => {
      const cart = await this.lockedCart(tx, userId);
      const result = await tx.cartItem.deleteMany({ where: { id: cartItemId, cartId: cart.id } });
      if (result.count !== 1) throw new NotFoundException('Món hàng không thuộc giỏ của bạn.');
    });
    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<CartView> {
    await this.prisma.$transaction(async (tx) => {
      const cart = await this.lockedCart(tx, userId);
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    });
    return this.getCart(userId);
  }

  async mergeGuestCart(userId: string, dto: MergeCartInput): Promise<CartView> {
    const skippedItems: Array<{ productId: string; reason: string }> = [];
    await this.prisma.$transaction(
      async (tx) => {
        const cart = await this.lockedCart(tx, userId);
        for (const item of dto.items) {
          try {
            await this.append(tx, userId, cart.id, item, true);
          } catch (error) {
            if (!(error instanceof BadRequestException)) throw error;
            skippedItems.push({ productId: item.productId, reason: error.message });
          }
        }
      },
      { timeout: 20000 },
    );
    return { ...(await this.getCart(userId)), skippedItems };
  }
}
