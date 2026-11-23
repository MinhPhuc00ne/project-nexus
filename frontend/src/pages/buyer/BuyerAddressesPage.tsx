import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus, AlertCircle, Home } from 'lucide-react';
import { useToast } from '../../components/ToastNotification';
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
  const { t } = useTranslation('buyer');
  const toast = useToast();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [form, setForm] = useState<AddressFormData>(initialForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('addresses.loadError'));
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
      setFormError(t('addresses.requiredFieldsError'));
      return;
    }

    if (!/^\+?[0-9]{9,15}$/.test(form.phone.trim())) {
      setFormError(t('addresses.invalidPhoneError'));
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
        toast.success(t('addresses.updatedToast'));
      } else {
        const created = await createAddress(dto);
        setAddresses((prev) => {
          if (created.isDefault) {
            return [created, ...prev.map((a) => ({ ...a, isDefault: false }))];
          }
          return [created, ...prev];
        });
        toast.success(t('addresses.addedToast'));
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t('addresses.actionFailed'));
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
      toast.success(t('addresses.setDefaultToast'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('addresses.setDefaultError'));
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((addr) => addr.id !== id));
      toast.success(t('addresses.deletedToast'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('addresses.deleteError'));
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
            {t('addresses.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500">{t('addresses.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          <span>{t('addresses.addNew')}</span>
        </button>
      </div>

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
            {t('addresses.retry')}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs">{t('addresses.loading')}</p>
        </div>
      ) : addresses.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center my-4">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Home size={28} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">{t('addresses.emptyTitle')}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
            {t('addresses.emptyDesc')}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('addresses.addNow')}</span>
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
