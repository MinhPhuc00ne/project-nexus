import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { notifyAdminsAndStaff } from '../../../core/notifications/admin-notification.util';
import { NotificationPublisher } from '../../../core/notifications/notification-publisher.service';
import { ReportInput } from '../dtos/feedback.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  async create(
    reporterId: string,
    targetId: string,
    kind: 'shop' | 'product',
    dto: ReportInput,
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
      if (kind === 'product' && !product) throw new NotFoundException('Product not found.');
      const shopId = product?.sellerId ?? targetId;
      const shop = await tx.user.findFirst({
        where: { id: shopId, role: 'SELLER' },
        select: { id: true },
      });
      if (!shop) throw new NotFoundException('Shop not found.');
      if (shopId === reporterId)
        throw new BadRequestException('You cannot report your own shop or product.');
      const productId = product?.id ?? null;
      const pending = await tx.shopViolation.findFirst({
        where: { reporterId, shopId, productId, status: { in: ['PENDING', 'INVESTIGATING'] } },
        select: { id: true },
      });
      if (pending)
        throw new ConflictException('You already have a pending report for this target.');
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
      await notifyAdminsAndStaff(
        tx,
        {
          title: kind === 'product' ? 'New product violation report' : 'New shop violation report',
          content: `Title: ${dto.title.trim()} (${kind === 'product' ? 'Product' : 'Shop'} #${targetId.slice(0, 8)}).`,
          type: NotificationType.DISPUTE,
          adminTargetUrl: '/admin/reports',
          staffTargetUrl: '/staff/disputes',
          metadata: {
            entityType: 'VIOLATION_REPORT',
            reportId: report.id,
            shopId,
            productId,
            kind,
          },
        },
        this.notifications,
      );
      return report;
    });
  }
}
