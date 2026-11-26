import { type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import Popup from '../Popup';
import type { UserAddress } from '@/features/account/services/address';
import AdministrativeAddressSelect from './AdministrativeAddressSelect';

export interface AddressFormData {
  recipientName: string;
  phone: string;
  city: string;
  district: string;
  ward: string;
  street: string;
  isDefault: boolean;
}

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAddress: UserAddress | null;
  form: AddressFormData;
  setForm: (form: AddressFormData) => void;
  formError: string;
  saving: boolean;
  onSubmit: (e: FormEvent) => void;
}

export default function AddressFormModal({
  isOpen,
  onClose,
  editingAddress,
  form,
  setForm,
  formError,
  saving,
  onSubmit,
}: AddressFormModalProps) {
  const { t } = useTranslation('common');
  return (
    <Popup
      isOpen={isOpen}
      onClose={onClose}
      title={editingAddress ? t('address.modalEditTitle') : t('address.modalAddTitle')}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        {formError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('address.recipientNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              placeholder={t('address.recipientNamePlaceholder')}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('address.phoneLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t('address.phonePlaceholder')}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>
        </div>

        <AdministrativeAddressSelect
          city={form.city}
          district={form.district}
          ward={form.ward}
          onChange={({ city, district, ward }) => setForm({ ...form, city, district, ward })}
        />

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {t('address.streetLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            placeholder={t('address.streetPlaceholder')}
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
              {t('address.setDefaultCheckbox')}
            </span>
          </label>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            {t('address.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving
              ? t('address.saving')
              : editingAddress
                ? t('address.saveChanges')
                : t('address.addAddress')}
          </button>
        </div>
      </form>
    </Popup>
  );
}
