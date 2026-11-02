import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { QueryAdminOrdersDto } from '../dto/query-admin-orders.dto';

const orderSelect = {
  id: true,
  status: true,
  subtotal: true,
  shippingFee: true,
  totalAmount: true,
  createdAt: true,
  updatedAt: true,
  cancellationActor: true,
  buyer: { select: { id: true, fullName: true, email: true } },
  seller: { select: { id: true, fullName: true, email: true } },
  shipment: { select: { status: true, waybillCode: true } },
  afterSales: true,
  dispute: { select: { id: true, status: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

const detailSelect = {
  ...orderSelect,
  shippingAddressSnapshot: true,
  items: {
    include: { product: { select: { id: true, title: true } } },
  },
  payments: {
    select: { id: true, provider: true, amount: true, status: true, createdAt: true },
  },
  escrowRecord: true,
  refunds: true,
} satisfies Prisma.OrderSelect;

type AdminOrder = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;
type AdminOrderDetail = Prisma.OrderGetPayload<{ select: typeof detailSelect }>;

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryAdminOrdersDto): Promise<{
    items: AdminOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit } = query;
    const search = query.search?.trim();
    const where: Prisma.OrderWhereInput = {
      status: query.status,
      sellerId: query.sellerId,
      buyerId: query.buyerId,
      ...(search && {
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { shipment: { waybillCode: { contains: search, mode: 'insensitive' } } },
          ...(['buyer', 'seller'] as const).flatMap((relation) => [
            { [relation]: { fullName: { contains: search, mode: 'insensitive' } } },
            { [relation]: { email: { contains: search, mode: 'insensitive' } } },
          ]),
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: orderSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async detail(id: string): Promise<AdminOrderDetail> {
    const order = await this.prisma.order.findUnique({ where: { id }, select: detailSelect });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    return order;
  }
}
