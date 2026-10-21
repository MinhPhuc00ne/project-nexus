import { useEffect, useState, type FormEvent } from 'react';
import { MapPin, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Home, Check } from 'lucide-react';
import Popup from '../../components/Popup';
import {
  getAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  type UserAddress,
  type CreateAddressDto,
} from '../../services/address';

interface AddressFormData {
  recipientName: string;
  phone: string;
  city: string;
  district: string;
  ward: string;
  street: string;
  isDefault: boolean;
}

const initialForm: AddressFormData = {
  recipientName: '',
  phone: '',
  city: 'TP. Hồ Chí Minh',
  district: '',
  ward: '',
  street: '',
  isDefault: false,
};

export default function BuyerAddressesPage() {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [form, setForm] = useState<AddressFormData>(initialForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải sổ địa chỉ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAddresses();
  }, []);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setForm({
      ...initialForm,
      isDefault: addresses.length === 0,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (addr: UserAddress) => {
    setEditingAddress(addr);
    setForm({
      recipientName: addr.recipientName,
      phone: addr.phone,
      city: addr.city,
      district: addr.district || '',
      ward: addr.ward || '',
      street: addr.street,
      isDefault: addr.isDefault,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !form.recipientName.trim() ||
      !form.phone.trim() ||
      !form.street.trim() ||
      !form.city.trim()
    ) {
      setFormError('Vui lòng điền đầy đủ họ tên, số điện thoại, tỉnh/thành phố và địa chỉ cụ thể.');
      return;
    }

    if (!/^\+?[0-9]{9,15}$/.test(form.phone.trim())) {
      setFormError('Số điện thoại không hợp lệ (cần từ 9 - 15 chữ số).');
      return;
    }

    setSaving(true);
    setFormError('');

    const dto: CreateAddressDto = {
      recipientName: form.recipientName.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      ward: form.ward.trim(),
      street: form.street.trim(),
      isDefault: form.isDefault,
    };

    try {
      if (editingAddress) {
        const updated = await updateAddress(editingAddress.id, dto);
        setAddresses((prev) =>
          prev.map((a) => {
            if (a.id === updated.id) return updated;
            if (updated.isDefault) return { ...a, isDefault: false };
            return a;
          }),
        );
        showToast('Đã cập nhật địa chỉ thành công!');
      } else {
        const created = await createAddress(dto);
        setAddresses((prev) => {
          if (created.isDefault) {
            return [created, ...prev.map((a) => ({ ...a, isDefault: false }))];
          }
          return [created, ...prev];
        });
        showToast('Đã thêm địa chỉ nhận hàng mới thành công!');
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Thao tác thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id);
      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          isDefault: addr.id === id,
        })),
      );
      showToast('Đã đặt làm địa chỉ nhận hàng mặc định!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể đặt mặc định.');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((addr) => addr.id !== id));
      showToast('Đã xóa địa chỉ nhận hàng.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa địa chỉ.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="text-blue-600" size={22} />
            Sổ địa chỉ nhận hàng
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý danh sách địa chỉ giao hàng của bạn để thanh toán và đặt hàng nhanh chóng.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchAddresses()}
            className="font-bold underline hover:no-underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs">Đang tải sổ địa chỉ…</p>
        </div>
      ) : addresses.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center my-4">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Home size={28} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            Bạn chưa có địa chỉ nhận hàng nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
            Thêm địa chỉ nhận hàng ngay bây giờ để tiết kiệm thời gian khi mua sắm và chốt đơn đấu
            giá.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Thêm địa chỉ ngay</span>
          </button>
        </div>
      ) : (
        /* Address List */
        <div className="space-y-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`rounded-2xl border p-5 transition-all ${
                addr.isDefault
                  ? 'border-blue-300 bg-blue-50/20 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">{addr.recipientName}</span>
                    <span className="text-xs text-slate-400">|</span>
                    <span className="text-xs font-semibold text-slate-600">{addr.phone}</span>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                        <Check size={11} /> Mặc định
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {addr.street}
                    {addr.ward ? `, ${addr.ward}` : ''}
                    {addr.district ? `, ${addr.district}` : ''}
                    {addr.city ? `, ${addr.city}` : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(addr)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                  >
                    <Edit2 size={13} />
                    <span>Sửa</span>
                  </button>

                  {!addr.isDefault && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleSetDefault(addr.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 text-xs font-semibold transition"
                      >
                        Thiết lập mặc định
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(addr.id)}
                        disabled={deletingId === addr.id}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-400 text-xs transition disabled:opacity-50"
                        title="Xóa địa chỉ"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Address */}
      <Popup
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddress ? 'Cập nhật địa chỉ nhận hàng' : 'Thêm địa chỉ nhận hàng mới'}
        size="md"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-2">
          {formError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Họ và tên người nhận <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Ví dụ: 0912345678"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tỉnh / Thành phố <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="TP. Hồ Chí Minh"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quận / Huyện</label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder="Quận Bình Thạnh"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phường / Xã</label>
              <input
                type="text"
                value={form.ward}
                onChange={(e) => setForm({ ...form, ward: e.target.value })}
                placeholder="Phường 22"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              placeholder="Ví dụ: Tòa Landmark 81, 720A Điện Biên Phủ"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded accent-blue-600 focus:ring-blue-400 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700">
                Đặt làm địa chỉ nhận hàng mặc định
              </span>
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? 'Đang lưu…' : editingAddress ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
            </button>
          </div>
        </form>
      </Popup>
    </div>
  );
}
