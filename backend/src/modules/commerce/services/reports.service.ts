import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ReportDto } from '../dtos/feedback.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    reporterId: string,
    targetId: string,
    kind: 'shop' | 'product',
    dto: ReportDto,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      // Serialize reports from the same account, including shop/product submissions.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${reporterId} FOR UPDATE`;
      const product =
        kind === 'product'
          ? await tx.product.findFirst({
              where: {
                id: targetId,
                status: 'ACTIVE',
                seller: { isShopSuspended: false },
              },
              select: { id: true, sellerId: true },
            })
          : null;
      if (kind === 'product' && !product) throw new NotFoundException('Không tìm thấy sản phẩm.');
      const shopId = product?.sellerId ?? targetId;
      const shop = await tx.user.findFirst({
        where: { id: shopId, role: 'SELLER' },
        select: { id: true },
      });
      if (!shop) throw new NotFoundException('Không tìm thấy shop.');
      if (shopId === reporterId)
        throw new BadRequestException('Không thể báo cáo shop/sản phẩm của chính mình.');
      const productId = product?.id ?? null;
      const pending = await tx.shopViolation.findFirst({
        where: { reporterId, shopId, productId, status: { in: ['PENDING', 'INVESTIGATING'] } },
        select: { id: true },
      });
      if (pending)
        throw new ConflictException('Bạn đã có báo cáo đang được xử lý cho đối tượng này.');
      const report = await tx.shopViolation.create({
        data: {
          reporterId,
          shopId,
          productId,
          title: dto.title.trim(),
          description: dto.description.trim(),
          evidenceUrls: dto.evidenceUrls ?? [],
        },
        select: { id: true, shopId: true, productId: true, status: true, createdAt: true },
      });
      return report;
    });
  }
}
