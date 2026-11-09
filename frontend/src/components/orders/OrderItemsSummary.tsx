import React from 'react';
import { Link } from 'react-router-dom';
import { Store, ChevronRight } from 'lucide-react';
import type { BuyerOrder } from '../../services/orders';

interface OrderItemsSummaryProps {
  order: BuyerOrder;
}

export const OrderItemsSummary: React.FC<OrderItemsSummaryProps> = ({ order }) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const rawSubtotal = items.reduce(
    (sum, item) => sum + Number(item?.unitPrice ?? 0) * (item?.quantity ?? 0),
    0,
  );
  const totalAmount = Number(order?.totalAmount ?? 0);
  const shippingFee = Math.max(0, totalAmount - rawSubtotal);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Seller Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Store size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              {order?.seller?.fullName || 'Gian Hàng NEXUS'}
            </h4>
            <p className="text-[11px] text-slate-400">Người bán đối tác đã xác thực</p>
          </div>
        </div>
        {order?.seller?.id && (
          <Link
            to={`/shop/${order.seller.id}`}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
          >
            <span>Xem gian hàng</span>
            <ChevronRight size={13} />
          </Link>
        )}
      </div>

      {/* Items list */}
      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const title = item?.product?.title || 'Sản phẩm mua sắm';
          const thumbnail =
            item?.product?.thumbnail ||
            item?.product?.images?.[0]?.imageUrl ||
            item?.product?.images?.[0]?.url ||
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';

          return (
            <div key={item?.id} className="py-4 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <img
                  src={thumbnail}
                  alt={title}
                  className="w-14 h-14 object-contain rounded-xl border border-slate-100 bg-slate-50 shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <div className="min-w-0 flex-1">
                  {item?.product?.id ? (
                    <Link
                      to={`/product/${item.product.id}`}
                      className="font-bold text-slate-900 line-clamp-1 hover:text-blue-600 transition"
                    >
                      {title}
                    </Link>
                  ) : (
                    <span className="font-bold text-slate-900 line-clamp-1">{title}</span>
                  )}
                  {(() => {
                    const selections = (
                      item as unknown as { selections?: Record<string, string | number> }
                    ).selections;
                    if (!selections || Object.keys(selections).length === 0) return null;
                    return (
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Phân loại:{' '}
                        {Object.entries(selections)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' • ')}
                      </p>
                    );
                  })()}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Số lượng: x{item?.quantity ?? 1}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-extrabold text-slate-900 text-sm">
                  {(Number(item?.unitPrice ?? 0) * (item?.quantity ?? 1)).toLocaleString('vi-VN')} ₫
                </p>
                <p className="text-[10px] text-slate-400">
                  {Number(item?.unitPrice ?? 0).toLocaleString('vi-VN')} ₫ / sản phẩm
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Price breakdown */}
      <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
        <div className="flex justify-between">
          <span>Tổng tiền hàng:</span>
          <span className="font-semibold text-slate-900">
            {rawSubtotal.toLocaleString('vi-VN')} ₫
          </span>
        </div>
        <div className="flex justify-between">
          <span>Phí vận chuyển (GHN Express):</span>
          <span className="font-semibold text-slate-900">
            {shippingFee > 0 ? `${shippingFee.toLocaleString('vi-VN')} ₫` : 'Miễn phí'}
          </span>
        </div>
        <div className="flex justify-between items-baseline pt-3 border-t border-slate-100 text-slate-900">
          <span className="text-sm font-bold">Tổng thanh toán:</span>
          <span className="text-xl font-extrabold text-blue-600">
            {totalAmount.toLocaleString('vi-VN')} ₫
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderItemsSummary;
