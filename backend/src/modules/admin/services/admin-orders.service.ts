import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { QueryAdminOrdersInput } from '../dtos/query-admin-orders.dto';

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
  shipment: {
    select: {
      carrier: true,
      trackingNumber: true,
      waybillCode: true,
      status: true,
      shippingFee: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  dispute: {
    select: {
      id: true,
      status: true,
      reason: true,
      evidenceUrls: true,
      resolutionNotes: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
      openedBy: { select: { id: true, fullName: true, email: true } },
      resolvedBy: { select: { id: true, fullName: true, email: true } },
    },
  },
  items: {
    include: { product: { select: { id: true, title: true } } },
  },
  payments: {
    select: {
      id: true,
      provider: true,
      amount: true,
      status: true,
      transactionCode: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
  escrowRecord: true,
  refunds: true,
} satisfies Prisma.OrderSelect;

type AdminOrder = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;
type AdminOrderDetailRaw = Prisma.OrderGetPayload<{ select: typeof detailSelect }>;

export interface OrderHistoryActor {
  id: string;
  fullName: string | null;
  email: string;
  role?: string;
}

export interface OrderHistoryEntry {
  source: 'ORDER' | 'PAYMENT' | 'ESCROW' | 'SHIPMENT' | 'DISPUTE' | 'REFUND' | 'EVENT_LOG';
  action: string;
  label: string;
  timestamp: Date;
  actor?: OrderHistoryActor | null;
  note?: string | null;
  details?: Record<string, unknown>;
}

export type AdminOrderDetail = AdminOrderDetailRaw & {
  history: OrderHistoryEntry[];
};

const EVENT_LABELS: Record<string, string> = {
  'order.cancel-requested': 'Yêu cầu hủy đơn hàng',
  'order.cancel-approved': 'Duyệt hủy đơn hàng',
  'order.cancel-rejected': 'Từ chối yêu cầu hủy đơn',
  'order.return-requested': 'Yêu cầu trả hàng / hoàn tiền',
  'order.return-approved': 'Duyệt yêu cầu trả hàng',
  'order.return-rejected': 'Từ chối yêu cầu trả hàng',
  'order.return-waybill-attached': 'Cập nhật mã vận đơn hoàn hàng',
  'order.return-received': 'Xác nhận đã nhận lại hàng hoàn',
  'order.shipment-updated': 'Cập nhật trạng thái vận chuyển',
  'order.return-shipment-updated': 'Cập nhật trạng thái vận đơn hoàn hàng',
};

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function buildLifecycleHistory(order: AdminOrderDetailRaw): OrderHistoryEntry[] {
  const entries: OrderHistoryEntry[] = [
    {
      source: 'ORDER',
      action: 'order.created',
      label: 'Tạo đơn hàng',
      timestamp: order.createdAt,
      actor: order.buyer,
      details: { totalAmount: order.totalAmount, status: order.status },
    },
  ];

  for (const payment of order.payments) {
    entries.push({
      source: 'PAYMENT',
      action: `payment.${payment.status.toLowerCase()}`,
      label: `Thanh toán ${payment.provider} (${payment.status})`,
      timestamp: payment.status === 'PENDING' ? payment.createdAt : payment.updatedAt,
      details: {
        paymentId: payment.id,
        provider: payment.provider,
        amount: payment.amount,
        status: payment.status,
        transactionCode: payment.transactionCode,
      },
    });
  }

  if (order.escrowRecord) {
    entries.push({
      source: 'ESCROW',
      action: 'escrow.held',
      label: 'Tạm giữ tiền ký quỹ',
      timestamp: order.escrowRecord.heldAt,
      details: { totalAmount: order.escrowRecord.totalAmount, status: order.escrowRecord.status },
    });
    if (order.escrowRecord.disbursedAt) {
      entries.push({
        source: 'ESCROW',
        action: 'escrow.disbursed',
        label: 'Giải ngân tiền ký quỹ cho Người bán',
        timestamp: order.escrowRecord.disbursedAt,
        details: { sellerPayout: order.escrowRecord.sellerPayout },
      });
    }
    if (order.escrowRecord.refundedAt) {
      entries.push({
        source: 'ESCROW',
        action: 'escrow.refunded',
        label: 'Hoàn tiền ký quỹ cho Người mua',
        timestamp: order.escrowRecord.refundedAt,
      });
    }
  }

  if (order.shipment) {
    entries.push({
      source: 'SHIPMENT',
      action: 'shipment.created',
      label: `Tạo vận đơn ${order.shipment.carrier}`,
      timestamp: order.shipment.createdAt,
      details: {
        waybillCode: order.shipment.waybillCode,
        status: order.shipment.status,
      },
    });
  }

  if (order.dispute) {
    entries.push({
      source: 'DISPUTE',
      action: 'dispute.opened',
      label: 'Mở khiếu nại đơn hàng',
      timestamp: order.dispute.createdAt,
      actor: order.dispute.openedBy,
      note: order.dispute.reason,
      details: { disputeId: order.dispute.id, status: order.dispute.status },
    });
    if (order.dispute.resolvedAt) {
      entries.push({
        source: 'DISPUTE',
        action: 'dispute.resolved',
        label: `Phân xử khiếu nại (${order.dispute.status})`,
        timestamp: order.dispute.resolvedAt,
        actor: order.dispute.resolvedBy,
        note: order.dispute.resolutionNotes,
        details: { disputeId: order.dispute.id, status: order.dispute.status },
      });
    }
  }

  for (const refund of order.refunds) {
    entries.push({
      source: 'REFUND',
      action: 'refund.created',
      label: `Tạo yêu cầu hoàn tiền (${refund.destination})`,
      timestamp: refund.createdAt,
      details: { refundId: refund.id, amount: refund.amount, status: refund.status },
    });
    if (refund.completedAt) {
      entries.push({
        source: 'REFUND',
        action: 'refund.completed',
        label: 'Hoàn tất hoàn tiền',
        timestamp: refund.completedAt,
        details: { refundId: refund.id, externalReference: refund.externalReference },
      });
    }
  }

  return entries;
}

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryAdminOrdersInput): Promise<{
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

    const eventLogs = this.prisma.eventLog?.findMany
      ? await this.prisma.eventLog.findMany({
          where: { payload: { path: ['orderId'], equals: id } },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const operatorIds = [
      ...new Set(eventLogs.map((log) => log.operatorId).filter((op): op is string => Boolean(op))),
    ];
    const operators =
      operatorIds.length > 0 && this.prisma.user?.findMany
        ? await this.prisma.user.findMany({
            where: { id: { in: operatorIds } },
            select: { id: true, fullName: true, email: true, role: true },
          })
        : [];
    const operatorMap = new Map(operators.map((op) => [op.id, op]));

    const logEntries: OrderHistoryEntry[] = eventLogs.map((log) => {
      const details = asObject(log.payload);
      const note = typeof details.reason === 'string' ? details.reason : null;
      return {
        source: 'EVENT_LOG',
        action: log.eventName,
        label: EVENT_LABELS[log.eventName] ?? log.eventName,
        timestamp: log.createdAt,
        actor: log.operatorId ? (operatorMap.get(log.operatorId) ?? null) : null,
        note,
        details,
      };
    });

    const history = [...buildLifecycleHistory(order), ...logEntries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return { ...order, history };
  }
}
