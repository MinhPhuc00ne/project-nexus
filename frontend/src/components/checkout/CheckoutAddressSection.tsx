import React, { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Edit2, Plus } from 'lucide-react';
import type { UserAddress } from '@/features/account/services/address';
import type { ShippingAddressInput } from '@/features/orders/services/orders';
import CheckoutAddressForm from './CheckoutAddressForm';

interface CheckoutAddressSectionProps {
  addresses: UserAddress[];
  selectedAddressId: string;
  onSelectAddressId: (id: string) => void;
  currentAddress: ShippingAddressInput;
  onSaveNewAddress: (addr: ShippingAddressInput) => Promise<void>;
  showToast: (msg: string, variant?: 'success' | 'error') => void;
}

export const CheckoutAddressSection: React.FC<CheckoutAddressSectionProps> = ({
  addresses,
  selectedAddressId,
  onSelectAddressId,
  currentAddress,
  onSaveNewAddress,
  showToast,
}) => {
  const { t } = useTranslation('commerce');
  const [mode, setMode] = useState<'VIEW' | 'SELECT' | 'NEW'>(
    addresses.length > 0 ? 'VIEW' : 'NEW',
  );

  const [formState, setFormState] = useState<ShippingAddressInput>({
    recipientName: currentAddress.recipientName || '',
    phone: currentAddress.phone || '',
    city: currentAddress.city || 'TP. Hồ Chí Minh',
    district: currentAddress.district || '',
    ward: currentAddress.ward || '',
    street: currentAddress.street || '',
  });

  useEffect(() => {
    if (addresses.length > 0) {
      if (mode === 'NEW' && !formState.recipientName) {
        setMode('VIEW');
      }
    } else {
      setMode('NEW');
    }
  }, [addresses.length]);

  const activeAddress = addresses.find((a) => a.id === selectedAddressId);
  const displayAddress = activeAddress
    ? {
        recipientName: activeAddress.recipientName,
        phone: activeAddress.phone,
        city: activeAddress.city,
        district: activeAddress.district || '',
        ward: activeAddress.ward || '',
        street: activeAddress.street,
        isDefault: activeAddress.isDefault,
      }
    : {
        recipientName: currentAddress.recipientName,
        phone: currentAddress.phone,
        city: currentAddress.city,
        district: currentAddress.district || '',
        ward: currentAddress.ward || '',
        street: currentAddress.street,
        isDefault: false,
      };

  const formattedAddress = [
    displayAddress.street,
    displayAddress.ward,
    displayAddress.district,
    displayAddress.city,
  ]
    .filter(Boolean)
    .join(', ');

  const handleSubmitNew = async (e: FormEvent) => {
    e.preventDefault();
    if (!formState.recipientName.trim() || !formState.phone.trim() || !formState.street.trim()) {
      showToast(t('checkout.missingAddressFields'), 'error');
      return;
    }
    await onSaveNewAddress(formState);
    setMode('VIEW');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="text-[var(--color-primary)]" size={18} />
          <span>{t('checkout.ghnAddressTitle')}</span>
        </h2>

        {mode === 'VIEW' && (
          <button
            type="button"
            onClick={() => setMode('SELECT')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer"
          >
            <Edit2 size={13} />
            <span>{t('checkout.change')}</span>
          </button>
        )}

        {mode === 'SELECT' && (
          <button
            type="button"
            onClick={() => setMode('VIEW')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            {t('checkout.close')}
          </button>
        )}
      </div>

      {mode === 'VIEW' && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-sm">
              {displayAddress.recipientName || t('checkout.noRecipientName')}
            </span>
            <span className="text-slate-500">•</span>
            <span className="font-semibold text-slate-700">{displayAddress.phone}</span>
            {displayAddress.isDefault && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                {t('checkout.defaultBadge')}
              </span>
            )}
          </div>
          <p className="text-slate-600 leading-relaxed">
            {formattedAddress || t('checkout.noStreetDetails')}
          </p>
        </div>
      )}

      {mode === 'SELECT' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-600">
            {t('checkout.selectFromAddressBook')}
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  selectedAddressId === a.id
                    ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                <input
                  type="radio"
                  name="shippingAddressChoice"
                  checked={selectedAddressId === a.id}
                  onChange={() => {
                    onSelectAddressId(a.id);
                    setMode('VIEW');
                  }}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{a.recipientName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">{a.phone}</span>
                    {a.isDefault && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                        {t('checkout.defaultBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 mt-1">
                    {[a.street, a.ward, a.district, a.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setFormState({
                  recipientName: '',
                  phone: '',
                  city: 'TP. Hồ Chí Minh',
                  district: '',
                  ward: '',
                  street: '',
                });
                setMode('NEW');
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>{t('checkout.addNewAddress')}</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('VIEW')}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              {t('checkout.done')}
            </button>
          </div>
        </div>
      )}

      {mode === 'NEW' && (
        <CheckoutAddressForm
          formState={formState}
          setFormState={setFormState}
          addressesCount={addresses.length}
          onSubmit={handleSubmitNew}
          onCancel={() => setMode('SELECT')}
        />
      )}
    </div>
  );
};

export default CheckoutAddressSection;
