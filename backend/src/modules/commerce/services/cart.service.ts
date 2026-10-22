import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AddToCartDto } from '../dtos/add-to-cart.dto';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto';
import { MergeCartDto } from '../dtos/merge-cart.dto';
import { ProductStatus } from '@prisma/client';
import { getCartExpiresAt, formatCartItem, summarizeCart } from '../utils/cart.util';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tìm hoặc tạo mới giỏ hàng cho user
   */
  private async findOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        expiresAt: getCartExpiresAt(),
      },
    });
  }

  /**
   * Lấy giỏ hàng của Buyer kèm kiểm tra tái thẩm định giá (Price Revalidation)
   */
  async getCart(userId: string) {
    const cart = await this.findOrCreateCart(userId);

    const fullCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' } },
                seller: { select: { id: true, fullName: true, avatarUrl: true } },
                inventories: { select: { availableQty: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!fullCart) {
      throw new NotFoundException('Không tìm thấy giỏ hàng.');
    }

    const formattedItems = fullCart.items.map((item) => formatCartItem(item));
    const summary = summarizeCart(formattedItems);

    return {
      cartId: fullCart.id,
      userId: fullCart.userId,
      expiresAt: fullCart.expiresAt,
      items: formattedItems,
      ...summary,
    };
  }

  /**
   * Thêm sản phẩm vào giỏ hàng
   */
  async addToCart(userId: string, dto: AddToCartDto) {
    // 1. Kiểm tra sản phẩm tồn tại và đang mở bán
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { inventories: true },
    });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Sản phẩm không tồn tại hoặc đã ngừng mở bán.');
    }

    // 2. Chặn Người bán tự mua sản phẩm của chính mình (Anti-Self-Purchase)
    if (product.sellerId === userId) {
      throw new BadRequestException(
        'Bạn không thể tự mua sản phẩm do chính mình đăng bán (Anti-Self-Purchase).',
      );
    }

    // 3. Kiểm tra số lượng tồn kho khả dụng
    const totalAvailable = product.inventories.reduce((acc, curr) => acc + curr.availableQty, 0);
    if (totalAvailable <= 0) {
      throw new BadRequestException('Sản phẩm này hiện tại đã hết hàng.');
    }

    // 4. Lấy giỏ hàng
    const cart = await this.findOrCreateCart(userId);

    // 5. Kiểm tra sản phẩm đã có trong giỏ chưa
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    const targetQty = currentQtyInCart + dto.quantity;

    if (targetQty > totalAvailable) {
      throw new BadRequestException(
        `Số lượng trong kho không đủ (chỉ còn lại ${totalAvailable} sản phẩm). Giỏ hàng của bạn hiện đã có ${currentQtyInCart} sản phẩm.`,
      );
    }

    // 6. Cập nhật hoặc tạo mới CartItem (dùng upsert để đảm bảo an toàn đa luồng/race conditions)
    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
      update: {
        quantity: targetQty,
      },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        priceAtAdded: product.basePrice,
      },
    });

    // 7. Gia hạn 7 ngày cho giỏ hàng
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { expiresAt: getCartExpiresAt() },
    });

    return this.getCart(userId);
  }

  /**
   * Cập nhật số lượng của 1 món hàng trong giỏ
   */
  async updateCartItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        product: { include: { inventories: true } },
      },
    });

    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Món hàng không tồn tại trong giỏ của bạn.');
    }

    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    } else {
      const totalAvailable = item.product.inventories.reduce(
        (acc, curr) => acc + curr.availableQty,
        0,
      );
      if (dto.quantity > totalAvailable) {
        throw new BadRequestException(
          `Số lượng tồn kho không đủ (chỉ còn lại ${totalAvailable} sản phẩm).`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity: dto.quantity },
      });
    }

    await this.prisma.cart.update({
      where: { id: item.cartId },
      data: { expiresAt: getCartExpiresAt() },
    });

    return this.getCart(userId);
  }

  /**
   * Xóa 1 món khỏi giỏ
   */
  async removeCartItem(userId: string, cartItemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Món hàng không tồn tại trong giỏ.');
    }

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return this.getCart(userId);
  }

  /**
   * Xóa toàn bộ giỏ hàng
   */
  async clearCart(userId: string) {
    const cart = await this.findOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    return this.getCart(userId);
  }

  /**
   * Gộp giỏ hàng từ Guest (LocalStorage) khi đăng nhập thành công
   */
  async mergeGuestCart(userId: string, dto: MergeCartDto) {
    const cart = await this.findOrCreateCart(userId);

    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      return this.getCart(userId);
    }

    // 1. Gộp các items có cùng productId để loại trừ trùng lặp từ FE payload
    const itemMap = new Map<string, number>();
    for (const item of dto.items) {
      if (!item?.productId) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      itemMap.set(item.productId, (itemMap.get(item.productId) || 0) + qty);
    }

    // 2. Lần lượt xử lý từng sản phẩm với upsert nguyên tử (atomic), chống hoàn toàn race condition
    for (const [productId, guestQty] of itemMap.entries()) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { inventories: true },
      });

      if (!product || product.status !== ProductStatus.ACTIVE || product.sellerId === userId) {
        continue;
      }

      const totalAvailable = product.inventories.reduce((acc, curr) => acc + curr.availableQty, 0);
      if (totalAvailable <= 0) continue;

      const existing = await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      const mergedQty = Math.min(
        totalAvailable,
        (existing?.quantity || 0) + guestQty,
      );

      await this.prisma.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        update: {
          quantity: mergedQty,
        },
        create: {
          cartId: cart.id,
          productId,
          quantity: Math.min(totalAvailable, guestQty),
          priceAtAdded: product.basePrice,
        },
      });
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { expiresAt: getCartExpiresAt() },
    });

    return this.getCart(userId);
  }
}
