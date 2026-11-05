import { useCallback, type ReactElement } from 'react';
import { RefreshCw as ReloadOutlined } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSellerOrderDetail, isVerifiedGhnShipment } from '../../services/sellerOrders';
import useProductResource from '../productDetail/useProductResource';
import { useSellerSession } from './SellerSession';
import { Badge, Panel, SellerButton } from './SellerUI';
import SellerResourceState from './SellerResourceState';
import SellerOrderActions from './SellerOrderActions';
import { sellerOrderLabels } from './orderPresentation';
import { financeDate, financeMoney } from './financeFormat';

export default function SellerLiveOrderDetail({ id }: { id: string }): ReactElement {
  const user = useSellerSession();
  const { token } = useAuth();
  const loader = useCallback(() => getSellerOrderDetail(id, user.id), [id, user.id, token]);
  const resource = useProductResource(loader);
  const order = resource.data;
  return (
    <SellerResourceState loading={resource.loading} error={resource.error} retry={resource.retry}>
      {order && (
        <div className="space-y-5">
          <Panel
            title={`Đơn #${order.id.slice(0, 8)}`}
            action={
              <SellerButton secondary onClick={resource.retry}>
                <ReloadOutlined />
                Làm mới
              </SellerButton>
            }
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge
                  tone={
                    order.status === 'CANCELLED' || order.status === 'REFUNDED'
                      ? 'gray'
                      : order.status === 'PAID' || order.status === 'PREPARING'
                        ? 'amber'
                        : order.status === 'DELIVERED' || order.status === 'CONFIRMED'
                          ? 'green'
                          : 'blue'
                  }
                >
                  {sellerOrderLabels[order.status] || order.status}
                </Badge>
                <p className="mt-3 text-xs text-slate-500">{financeDate(order.createdAt)}</p>
              </div>
              <SellerOrderActions
                id={order.id}
                status={order.status}
                hasShipment={Boolean(order.shipment?.waybillCode)}
                onChanged={resource.retry}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="border-y border-blue-100 bg-blue-50/60 text-xs text-slate-500">
                  <tr>
                    {['Sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền'].map((label) => (
                      <th className="p-3" key={label}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {item.thumbnail && (
                            <img
                              className="size-12 rounded object-contain"
                              src={item.thumbnail}
                              alt=""
                            />
                          )}
                          <span>{item.title}</span>
                        </div>
                      </td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">{financeMoney(item.unitPrice)}</td>
                      <td className="p-3">{financeMoney(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto mt-5 grid max-w-sm grid-cols-2 gap-3 text-sm">
              {[
                ['Tạm tính', order.subtotal],
                ['Phí vận chuyển', order.shippingFee],
                ['Tổng thanh toán', order.totalAmount],
              ].map(([label, amount]) => (
                <div className="col-span-2 flex justify-between gap-3" key={label}>
                  <dt>{label}</dt>
                  <dd className="m-0 font-semibold text-blue-700">
                    {financeMoney(Number(amount))}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Thông tin giao hàng">
              <div className="space-y-2 text-sm leading-7 text-slate-600">
                <p>Người nhận: {order.shippingAddress?.recipientName || order.buyer.fullName}</p>
                <p>
                  Điện thoại:{' '}
                  {order.shippingAddress?.phone || order.buyer.phoneNumber || 'Chưa có thông tin'}
                </p>
                <p>
                  Địa chỉ:{' '}
                  {[
                    order.shippingAddress?.street,
                    order.shippingAddress?.ward,
                    order.shippingAddress?.district,
                    order.shippingAddress?.city,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Chưa có thông tin'}
                </p>
              </div>
            </Panel>
            <Panel title="Vận đơn GHN">
              {order.shipment ? (
                <div className="space-y-3 text-sm text-slate-600">
                  <p className="break-all">
                    Mã lưu trên đơn: <strong>{order.shipment.waybillCode || '—'}</strong>
                  </p>
                  <p>Trạng thái lưu trên hệ thống: {order.shipment.status}</p>
                  {isVerifiedGhnShipment(order.shipment) ? (
                    <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                      Có xác nhận mã vận đơn từ GHN.
                    </p>
                  ) : (
                    <p
                      role="alert"
                      className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800"
                    >
                      Chưa xác minh được mã vận đơn với GHN. Chưa thể in phiếu; vui lòng liên hệ hỗ
                      trợ kiểm tra trước khi bàn giao.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Chưa có vận đơn.</p>
              )}
            </Panel>
          </div>
          {order.escrow && (
            <Panel title="Thông tin ký quỹ">
              <dl className="grid gap-3 text-xs sm:grid-cols-3">
                {[
                  ['Trạng thái', order.escrow.status],
                  ['Phí sàn', financeMoney(order.escrow.platformFee)],
                  ['Khoản trả Seller', financeMoney(order.escrow.sellerPayout)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="mb-2 text-slate-500">{label}</dt>
                    <dd className="m-0 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
        </div>
      )}
    </SellerResourceState>
  );
}
