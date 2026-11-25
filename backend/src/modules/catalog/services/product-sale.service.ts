import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { UpdateProductSaleDto } from '../dtos/product-features.dto';
import { priceView } from '../../../core/domain/product-price';

@Injectable()
export class ProductSaleService {
  constructor(private readonly prisma: PrismaService) {}

  async update(
    sellerId: string,
    productId: string,
    dto: UpdateProductSaleDto,
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
        throw new ForbiddenException('Shop không có quyền cập nhật sale.');
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
      if (product.sellerId !== sellerId)
        throw new ForbiddenException('Không được sửa sale của shop khác.');
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
        throw new BadRequestException('Giá sale phải từ 1.000đ và nhỏ hơn giá gốc.');
      }
      if (salePrice !== null && startsAt && endsAt && startsAt >= endsAt)
        throw new BadRequestException('Thời gian kết thúc sale phải sau thời gian bắt đầu.');
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
