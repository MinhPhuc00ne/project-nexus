import { useEffect, useState, type FormEvent } from 'react';
import { MapPin, Plus, AlertCircle, Home, CheckCircle2 } from 'lucide-react';
import AddressFormModal, { type AddressFormData } from '../../components/address/AddressFormModal';
import AddressCard from '../../components/address/AddressCard';
import {
  getAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  type UserAddress,
  type CreateAddressDto,
} from '../../services/address';

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
            <AddressCard
              key={addr.id}
              addr={addr}
              onEdit={handleOpenEdit}
              onSetDefault={(id) => void handleSetDefault(id)}
              onDelete={(id) => void handleDelete(id)}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}

      {/* Modal Add / Edit Address */}
      <AddressFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingAddress={editingAddress}
        form={form}
        setForm={setForm}
        formError={formError}
        saving={saving}
        onSubmit={(e) => void handleSubmit(e)}
      />
    </div>
  );
}
