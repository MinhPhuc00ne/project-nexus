import React, { type FormEvent } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import type { ShippingAddressInput } from '../../services/orders';

interface CheckoutAddressFormProps {
  formState: ShippingAddressInput;
  setFormState: React.Dispatch<React.SetStateAction<ShippingAddressInput>>;
  addressesCount: number;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

export const CheckoutAddressForm: React.FC<CheckoutAddressFormProps> = ({
  formState,
  setFormState,
  addressesCount,
  onSubmit,
  onCancel,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {addressesCount === 0 ? (
        <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
          Sổ địa chỉ của bạn đang trống. Vui lòng nhập thông tin nhận hàng bên dưới để tiến hành đặt
          hàng.
        </p>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold mb-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={13} /> Quay lại sổ địa chỉ
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Họ và tên người nhận *
          </label>
          <input
            type="text"
            required
            value={formState.recipientName}
            onChange={(e) => setFormState((prev) => ({ ...prev, recipientName: e.target.value }))}
            placeholder="Nguyễn Văn A"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Số điện thoại liên hệ *
          </label>
          <input
            type="tel"
            required
            value={formState.phone}
            onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="0912345678"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Tỉnh / Thành phố *
          </label>
          <input
            type="text"
            required
            value={formState.city}
            onChange={(e) => setFormState((prev) => ({ ...prev, city: e.target.value }))}
            placeholder="TP. Hồ Chí Minh"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Quận / Huyện *</label>
          <input
            type="text"
            required
            value={formState.district}
            onChange={(e) => setFormState((prev) => ({ ...prev, district: e.target.value }))}
            placeholder="Quận 1"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Phường / Xã *</label>
          <input
            type="text"
            required
            value={formState.ward}
            onChange={(e) => setFormState((prev) => ({ ...prev, ward: e.target.value }))}
            placeholder="Bến Nghé"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          Địa chỉ chi tiết (Số nhà, tên đường) *
        </label>
        <input
          type="text"
          required
          value={formState.street}
          onChange={(e) => setFormState((prev) => ({ ...prev, street: e.target.value }))}
          placeholder="123 Đường Lê Lợi"
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {addressesCount > 0 && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy bỏ
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
        >
          <Check size={14} />
          <span>Lưu và sử dụng địa chỉ này</span>
        </button>
      </div>
    </form>
  );
};

export default CheckoutAddressForm;
