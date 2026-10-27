import { BadGatewayException } from '@nestjs/common';
import { OrderStatus, ShipmentStatus } from '@prisma/client';

export function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function mapGhnStatus(status: string): {
  shipment: ShipmentStatus;
  order?: OrderStatus;
  terminal: boolean;
} {
  if (['ready_to_pick', 'picking', 'money_collect_picking'].includes(status))
    return { shipment: ShipmentStatus.CREATED, terminal: false };
  if (status === 'picked')
    return { shipment: ShipmentStatus.PICKED_UP, order: OrderStatus.SHIPPING, terminal: false };
  if (
    ['storing', 'sorting', 'transporting', 'delivering', 'money_collect_delivering'].includes(
      status,
    )
  )
    return { shipment: ShipmentStatus.IN_TRANSIT, order: OrderStatus.SHIPPING, terminal: false };
  if (status === 'delivered')
    return { shipment: ShipmentStatus.DELIVERED, order: OrderStatus.DELIVERED, terminal: true };
  if (status === 'returned') return { shipment: ShipmentStatus.RETURNED, terminal: true };
  if (
    [
      'delivery_fail',
      'waiting_to_return',
      'return',
      'return_transporting',
      'return_sorting',
      'returning',
      'return_fail',
    ].includes(status)
  )
    return { shipment: ShipmentStatus.FAILED, terminal: false };
  if (['cancel', 'exception', 'lost', 'damage', 'scrap'].includes(status))
    return { shipment: ShipmentStatus.FAILED, terminal: true };
  throw new BadGatewayException(`GHN trả trạng thái chưa được hỗ trợ: ${status}`);
}
