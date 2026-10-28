import React from 'react';
import { MapPin, User, Phone, ShieldCheck } from 'lucide-react';
import type { BuyerOrder } from '../../services/orders';

interface OrderAddressCardProps {
  address: NonNullable<BuyerOrder['shippingAddress']>;
}

export const OrderAddressCard: React.FC<OrderAddressCardProps> = ({ address }) => {
  const formattedAddress = [address.street, address.ward, address.district, address.city]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MapPin size={16} className="text-[#f24e1e]" />
          <span>Địa chỉ nhận hàng (GHN Express)</span>
        </h3>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          Bản ghi đơn hàng
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <User size={14} className="text-slate-400 shrink-0" />
          <span>{address.recipientName || 'Chưa có họ tên'}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Phone size={14} className="text-slate-400 shrink-0" />
          <span>{address.phone || 'Chưa có số điện thoại'}</span>
        </div>
        <div className="flex items-start gap-2 text-slate-600 pt-1">
          <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            {formattedAddress || 'Chưa có thông tin địa chỉ chi tiết.'}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl">
        <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          Địa chỉ giao hàng đã được cố định theo đơn hàng để đảm bảo quyền lợi bảo chứng ký quỹ và
          kiểm định bàn giao.
        </span>
      </div>
    </div>
  );
};

export default OrderAddressCard;
