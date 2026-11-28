import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { UpdateProductSaleInput } from '../dtos/product-features.dto';
import { priceView } from '../../../core/domain/product-price';

@Injectable()
export class ProductSaleService {
  constructor(private readonly prisma: PrismaService) {}

  async update(
    sellerId: string,
    productId: string,
    dto: UpdateProductSaleInput,
  ): Promise<{
    id: string;
    basePrice: number;
    currentPrice: number;
    salePrice: number | null;
    saleStartsAt: Date | null;
    saleEndsAt: Date | null;
    isOnSale: boolean;
  }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${sellerId} FOR UPDATE`;
      const seller = await tx.user.findUnique({ where: { id: sellerId } });
      if (
        !seller ||
        !['SELLER', 'ADMIN'].includes(seller.role) ||
        seller.isShopSuspended ||
        (seller.role === 'SELLER' && !seller.isSellerActive)
      )
        throw new ForbiddenException('Store does not have permission to update sale settings.');
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Product not found.');
      if (product.sellerId !== sellerId)
        throw new ForbiddenException('Cannot modify sale settings for another store.');
      const salePrice = dto.salePrice === undefined ? product.salePrice : dto.salePrice;
      const startsAt =
        dto.saleStartsAt === undefined
          ? product.saleStartsAt
          : dto.saleStartsAt
            ? new Date(dto.saleStartsAt)
            : null;
      const endsAt =
        dto.saleEndsAt === undefined
          ? product.saleEndsAt
          : dto.saleEndsAt
            ? new Date(dto.saleEndsAt)
            : null;
      if (
        salePrice !== null &&
        (Number(salePrice) < 1000 || Number(salePrice) >= Number(product.basePrice))
      ) {
        throw new BadRequestException(
          'Sale price must be at least 1,000 VND and less than the original price.',
        );
      }
      if (salePrice !== null && startsAt && endsAt && startsAt >= endsAt)
        throw new BadRequestException('Sale end time must be after the start time.');
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          salePrice,
          saleStartsAt: salePrice === null ? null : startsAt,
          saleEndsAt: salePrice === null ? null : endsAt,
        },
      });
      return { id: updated.id, basePrice: Number(updated.basePrice), ...priceView(updated) };
    });
  }
}
