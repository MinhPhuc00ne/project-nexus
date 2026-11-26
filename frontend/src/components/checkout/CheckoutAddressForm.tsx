import React, { type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check } from 'lucide-react';
import type { ShippingAddressInput } from '@/features/orders/services/orders';
import AdministrativeAddressSelect from '../address/AdministrativeAddressSelect';

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
  const { t } = useTranslation('commerce');
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {addressesCount === 0 ? (
        <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
          {t('checkout.emptyAddressBook')}
        </p>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold mb-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={13} /> {t('checkout.backToAddressBook')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            {t('checkout.recipientNameLabel')}
          </label>
          <input
            type="text"
            required
            value={formState.recipientName}
            onChange={(e) => setFormState((prev) => ({ ...prev, recipientName: e.target.value }))}
            placeholder={t('checkout.recipientNamePlaceholder')}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            {t('checkout.phoneLabel')}
          </label>
          <input
            type="tel"
            required
            value={formState.phone}
            onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder={t('checkout.phonePlaceholder')}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
          />
        </div>
      </div>

      <AdministrativeAddressSelect
        city={formState.city}
        district={formState.district}
        ward={formState.ward}
        size="sm"
        onChange={({ city, district, ward }) =>
          setFormState((prev) => ({ ...prev, city, district, ward }))
        }
      />

      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
          {t('checkout.streetLabel')}
        </label>
        <input
          type="text"
          required
          value={formState.street}
          onChange={(e) => setFormState((prev) => ({ ...prev, street: e.target.value }))}
          placeholder={t('checkout.streetPlaceholder')}
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
            {t('checkout.cancelAction')}
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
        >
          <Check size={14} />
          <span>{t('checkout.saveAndUseAddress')}</span>
        </button>
      </div>
    </form>
  );
};

export default CheckoutAddressForm;
