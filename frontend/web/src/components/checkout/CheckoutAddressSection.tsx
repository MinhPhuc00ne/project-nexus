import React, { useState, type FormEvent } from 'react';
import { MapPin, Edit2, Check } from 'lucide-react';
import type { UserAddress } from '../../services/address';
import type { ShippingAddressInput } from '../../services/orders';

interface CheckoutAddressSectionProps {
  addresses: UserAddress[];
  selectedAddressId: string;
  onSelectAddressId: (id: string) => void;
  currentAddress: ShippingAddressInput;
  onSaveNewAddress: (addr: ShippingAddressInput) => Promise<void>;
  showToast: (msg: string) => void;
}

export const CheckoutAddressSection: React.FC<CheckoutAddressSectionProps> = ({
  addresses,
  selectedAddressId,
  onSelectAddressId,
  currentAddress,
  onSaveNewAddress,
  showToast,
}) => {
  const [isEditing, setIsEditing] = useState(addresses.length === 0);
  const [formState, setFormState] = useState<ShippingAddressInput>({
    recipientName: currentAddress.recipientName || '',
    phone: currentAddress.phone || '',
    city: currentAddress.city || 'TP. Hồ Chí Minh',
    district: currentAddress.district || '',
    ward: currentAddress.ward || '',
    street: currentAddress.street || '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formState.recipientName.trim() || !formState.phone.trim() || !formState.street.trim()) {
      showToast('Vui lòng điền đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
      return;
    }
    await onSaveNewAddress(formState);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="text-[#f24e1e]" size={18} />
          <span>Địa chỉ nhận hàng (GHN Express)</span>
        </h2>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
          >
            <Edit2 size={13} />
            <span>{addresses.length > 0 ? 'Thay đổi địa chỉ' : 'Nhập địa chỉ'}</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Họ và tên người nhận *
              </label>
              <input
                type="text"
                required
                value={formState.recipientName}
                onChange={(e) => setFormState({ ...formState, recipientName: e.target.value })}
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
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
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
                onChange={(e) => setFormState({ ...formState, city: e.target.value })}
                placeholder="TP. Hồ Chí Minh"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Quận / Huyện *
              </label>
              <input
                type="text"
                required
                value={formState.district}
                onChange={(e) => setFormState({ ...formState, district: e.target.value })}
                placeholder="Quận 1"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Phường / Xã *
              </label>
              <input
                type="text"
                required
                value={formState.ward}
                onChange={(e) => setFormState({ ...formState, ward: e.target.value })}
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
              onChange={(e) => setFormState({ ...formState, street: e.target.value })}
              placeholder="123 Đường Lê Lợi"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Lưu và sử dụng địa chỉ này</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {addresses.length > 0 && (
            <div className="space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    selectedAddressId === a.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="shippingAddress"
                    checked={selectedAddressId === a.id}
                    onChange={() => onSelectAddressId(a.id)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">
                      {a.recipientName} • {a.phone}
                    </span>
                    {a.isDefault && (
                      <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                        Mặc định
                      </span>
                    )}
                    <p className="text-slate-600 mt-0.5">
                      {[a.street, a.ward, a.district, a.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {addresses.length === 0 && (
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900">
                {currentAddress.recipientName || 'Chưa có thông tin người nhận'} •{' '}
                {currentAddress.phone}
              </p>
              <p>
                {[
                  currentAddress.street,
                  currentAddress.ward,
                  currentAddress.district,
                  currentAddress.city,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CheckoutAddressSection;
