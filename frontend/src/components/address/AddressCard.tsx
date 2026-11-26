import { MapPin, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UserAddress } from '@/features/account/services/address';

interface AddressCardProps {
  addr: UserAddress;
  onEdit: (addr: UserAddress) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export default function AddressCard({
  addr,
  onEdit,
  onSetDefault,
  onDelete,
  deletingId,
}: AddressCardProps) {
  const { t } = useTranslation('common');
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition bg-white ${
        addr.isDefault
          ? 'border-blue-300 ring-2 ring-blue-100 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold text-ink text-sm">{addr.recipientName}</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-600 font-medium">{addr.phone}</span>
            {addr.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                <MapPin size={11} /> {t('address.defaultBadge')}
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

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => onEdit(addr)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <Edit2 size={13} />
            <span>{t('address.edit')}</span>
          </button>

          {!addr.isDefault && (
            <>
              <button
                type="button"
                onClick={() => onSetDefault(addr.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 text-xs font-semibold transition"
              >
                {t('address.setDefault')}
              </button>

              <button
                type="button"
                onClick={() => onDelete(addr.id)}
                disabled={deletingId === addr.id}
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-400 text-xs transition disabled:opacity-50"
                title={t('address.deleteTitle')}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
