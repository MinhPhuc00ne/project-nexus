import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import type {
  CommerceChatOrder,
  CommerceChatOrderItem,
  CommerceChatOrders,
  CommerceChatQuery,
} from '../../../core/domain/commerce-chat.types';

const orderSelect = {
  id: true,
  status: true,
  totalAmount: true,
  createdAt: true,
  shipment: { select: { status: true, waybillCode: true } },
  afterSales: { select: { status: true } },
  items: {
    select: {
      quantity: true,
      selections: true,
      product: { select: { title: true } },
    },
  },
} satisfies Prisma.OrderSelect;

type RawOrderPayload = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

function formatOrderItems(items?: RawOrderPayload['items']): CommerceChatOrderItem[] {
  return (items ?? []).map((item) => {
    const rawSelections =
      item.selections && typeof item.selections === 'object' && !Array.isArray(item.selections)
        ? Object.entries(item.selections as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          )
        : [];
    return {
      name: item.product?.title ?? 'Sản phẩm',
      quantity: item.quantity,
      selections: Object.fromEntries(rawSelections),
    };
  });
}

@Injectable()
export class OrdersChatFacade {
  constructor(private readonly prisma: PrismaService) {}

  async order(userId: string, orderId: string): Promise<CommerceChatOrder> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: orderSelect,
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng của bạn.');
    const rawTotal = (order as { totalAmount?: Prisma.Decimal | number | null }).totalAmount;
    const rawCreatedAt = (order as { createdAt?: Date | null }).createdAt;
    return {
      id: order.id,
      status: order.status,
      shipment: order.shipment,
      afterSales: order.afterSales,
      items: formatOrderItems(order.items),
      totalAmount: rawTotal !== undefined && rawTotal !== null ? Number(rawTotal) : null,
      createdAt: rawCreatedAt ?? null,
    };
  }

  async orders(
    userId: string,
    scope: 'PURCHASES' | 'SALES',
    query: CommerceChatQuery,
  ): Promise<CommerceChatOrders> {
    if (scope === 'SALES') {
      const account = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!account || !['SELLER', 'ADMIN'].includes(account.role))
        throw new ForbiddenException('Chỉ người bán mới có thể tra cứu đơn bán của mình.');
    }
    const page = Math.max(1, Math.min(100000, query.page ?? 1));
    const limit = Math.max(1, Math.min(20, query.limit ?? 5));
    const where: Prisma.OrderWhereInput = {
      ...(scope === 'SALES' ? { sellerId: userId } : { buyerId: userId }),
      ...(query.status ? { status: query.status } : {}),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.order.count({ where });
        const rows = await tx.order.findMany({
          where,
          select: { ...orderSelect, totalAmount: true, createdAt: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        });
        return {
          scope,
          items: rows.map((row) => ({
            id: row.id,
            status: row.status,
            shipment: row.shipment,
            afterSales: row.afterSales,
            items: formatOrderItems(row.items),
            totalAmount: Number(row.totalAmount),
            createdAt: row.createdAt,
          })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
