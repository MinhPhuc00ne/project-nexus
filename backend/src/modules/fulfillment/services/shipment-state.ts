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
  const s = (status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (
    ['ready_to_pick', 'picking', 'money_collect_picking', 'cho_lay_hang', 'dang_lay_hang'].includes(
      s,
    )
  )
    return { shipment: ShipmentStatus.CREATED, terminal: false };
  if (['picked', 'da_lay_hang'].includes(s))
    return { shipment: ShipmentStatus.PICKED_UP, order: OrderStatus.SHIPPING, terminal: false };
  if (
    [
      'storing',
      'sorting',
      'transporting',
      'delivering',
      'money_collect_delivering',
      'out_for_delivery',
      'shipping',
      'in_transit',
      'dang_giao',
      'dang_van_chuyen',
    ].includes(s)
  )
    return { shipment: ShipmentStatus.IN_TRANSIT, order: OrderStatus.SHIPPING, terminal: false };
  if (
    [
      'delivered',
      'da_giao',
      'giao_thanh_cong',
      'cod_collected',
      'money_collected',
      'da_thu_tien',
      'completed',
      'done',
      'finish',
    ].includes(s)
  )
    return { shipment: ShipmentStatus.DELIVERED, order: OrderStatus.DELIVERED, terminal: true };
  if (['returned', 'da_tra_hang'].includes(s))
    return { shipment: ShipmentStatus.RETURNED, terminal: true };
  if (
    [
      'delivery_fail',
      'waiting_to_return',
      'return',
      'return_transporting',
      'return_sorting',
      'returning',
      'return_fail',
      'giao_that_bai',
    ].includes(s)
  )
    return { shipment: ShipmentStatus.FAILED, terminal: false };
  if (['cancel', 'cancelled', 'exception', 'lost', 'damage', 'scrap', 'huy', 'da_huy'].includes(s))
    return { shipment: ShipmentStatus.FAILED, terminal: true };
  throw new BadGatewayException(`GHN trả trạng thái chưa được hỗ trợ: ${status}`);
}
