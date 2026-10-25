import { apiRequest, ApiRequestError } from './api';
import { getStoredUser } from './auth';
import { getSellerResource } from './sellerResources';
import type {
  DispatchGhnRequest,
  GhnDiagnostic,
  SellerOrderDetail,
  SellerOrdersPage,
  SellerOrdersQuery,
  SellerShipment,
  SellerWaybill,
} from '../types/order.types';

const base = '/seller/orders';
export function getSellerOrders(query: SellerOrdersQuery): Promise<SellerOrdersPage> {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
  if (query.status) params.set('status', query.status);
  if (query.search?.trim()) params.set('search', query.search.trim());
  return getSellerResource(`${base}?${params}`);
}
export async function getSellerOrderDetail(
  id: string,
  sellerId: string,
): Promise<SellerOrderDetail> {
  if (!id.trim()) throw new Error('Thiếu mã đơn hàng.');
  if (getStoredUser()?.id !== sellerId) throw new Error('Phiên người bán đã thay đổi.');
  const order = await getSellerResource<SellerOrderDetail>(`${base}/${encodeURIComponent(id)}`);
  if (order.id !== id) throw new Error('Thông tin đơn hàng không hợp lệ.');
  return order;
}
export async function confirmSellerOrder(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const result = await apiRequest<{ success: boolean; message: string }>(
    `${base}/${encodeURIComponent(id)}/confirm`,
    { method: 'POST', requireAuth: true },
  );
  if (!result.success) throw new Error(result.message || 'Chưa xác nhận được đơn hàng.');
  return result;
}
export function getGhnDiagnostic(): Promise<GhnDiagnostic> {
  return getSellerResource('/fulfillment/shipping/diagnostic');
}
export function isVerifiedGhnShipment(shipment: SellerShipment | null): boolean {
  if (!shipment?.waybillCode || shipment.carrier !== 'GHN') return false;
  const meta = shipment.metadata;
  if (
    !meta ||
    typeof meta !== 'object' ||
    !('code' in meta) ||
    meta.code !== 200 ||
    ('fallback' in meta && meta.fallback)
  )
    return false;
  const data = 'data' in meta ? meta.data : null;
  return (
    !!data &&
    typeof data === 'object' &&
    'order_code' in data &&
    data.order_code === shipment.waybillCode
  );
}
export class GhnDispatchUnverifiedError extends Error {
  constructor() {
    super(
      'Chưa xác minh được vận đơn với GHN. Không gửi lại yêu cầu; hãy đóng cửa sổ, kiểm tra trạng thái đơn và liên hệ hỗ trợ.',
    );
    this.name = 'GhnDispatchUnverifiedError';
  }
}
export async function dispatchSellerOrder(
  id: string,
  sellerId: string,
  body: DispatchGhnRequest,
): Promise<SellerOrderDetail> {
  const current = await getSellerOrderDetail(id, sellerId);
  if (!['PAID', 'PREPARING'].includes(current.status))
    throw new Error('Chỉ có thể bàn giao đơn đã thanh toán hoặc đang chuẩn bị.');
  const diagnostic = await getGhnDiagnostic();
  if (
    !diagnostic.tokenConfigured ||
    !diagnostic.shopIdConfigured ||
    diagnostic.ping.status !== 'CONNECTED'
  )
    throw new Error('Kết nối GHN chưa sẵn sàng. Vui lòng kiểm tra cấu hình vận chuyển.');
  if (getStoredUser()?.id !== sellerId) throw new Error('Phiên người bán đã thay đổi.');
  // Once the mutation is sent, an uncertain outcome must never be retried automatically.
  try {
    const result = await apiRequest<{ success: boolean; message: string }>(
      `${base}/${encodeURIComponent(id)}/dispatch-ghn`,
      { method: 'POST', body, requireAuth: true },
    );
    if (!result.success) throw new Error(result.message || 'Chưa bàn giao được đơn hàng.');
    const order = await getSellerOrderDetail(id, sellerId);
    if (order.status !== 'SHIPPING' || !isVerifiedGhnShipment(order.shipment))
      throw new GhnDispatchUnverifiedError();
    return order;
  } catch (cause) {
    if (cause instanceof ApiRequestError && cause.status >= 400 && cause.status < 500) throw cause;
    throw new GhnDispatchUnverifiedError();
  }
}
export async function getSellerWaybill(id: string, sellerId: string): Promise<SellerWaybill> {
  const order = await getSellerOrderDetail(id, sellerId);
  if (!isVerifiedGhnShipment(order.shipment))
    throw new Error('Đơn hàng chưa có vận đơn được GHN xác nhận. Chưa thể in phiếu giao hàng.');
  if (getStoredUser()?.id !== sellerId) throw new Error('Phiên người bán đã thay đổi.');
  const bill = await getSellerResource<SellerWaybill>(
    `${base}/${encodeURIComponent(id)}/print-waybill`,
  );
  if (bill.orderId !== id || bill.waybillCode !== order.shipment?.waybillCode)
    throw new Error('Mã vận đơn không khớp với đơn hàng. Vui lòng tải lại.');
  return bill;
}
