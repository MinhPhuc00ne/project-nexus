import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { MapPin, RefreshCw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../ToastNotification';
import {
  getSellerPickupPoint,
  saveSellerPickupPoint,
  type SellerPickupPoint,
} from '@/features/shipping/services/sellerPickup';
import { Panel, SellerButton } from './SellerUI';

const emptyPoint: SellerPickupPoint = {
  name: '',
  phone: '',
  city: '',
  district: '',
  ward: '',
  street: '',
};

/**
 * Panel component allowing sellers to inspect and configure their synchronized GHN pickup point.
 *
 * @returns Rendered pickup point configuration panel.
 */
export default function SellerPickupPointPanel(): ReactElement {
  const { t } = useTranslation('seller');
  const toast = useToast();
  const [point, setPoint] = useState<SellerPickupPoint>(emptyPoint);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setPoint((await getSellerPickupPoint()) ?? emptyPoint);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('shipping.pickup.loadErr'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const update = (key: keyof SellerPickupPoint, value: string): void =>
    setPoint((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSellerPickupPoint(point);
      setPoint(saved);
      toast.success(t('shipping.pickup.saveSuccess'));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t('shipping.pickup.saveErr');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Panel title={t('shipping.pickup.title')} subtitle={t('shipping.pickup.subtitle')}>
      {loading ? (
        <p className="text-sm text-slate-500">{t('shipping.pickup.loading')}</p>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
            <MapPin className="mr-1 inline size-4" />
            {point.status
              ? t('shipping.pickup.syncStatus', { status: point.status })
              : t('shipping.pickup.notSynced')}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                ['name', t('shipping.pickup.name')],
                ['phone', t('shipping.pickup.phone')],
                ['street', t('shipping.pickup.street')],
                ['city', t('shipping.pickup.city')],
                ['district', t('shipping.pickup.district')],
                ['ward', t('shipping.pickup.ward')],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm font-medium text-slate-700">
                {label}
                <input
                  required
                  value={point[key] ?? ''}
                  onChange={(event) => update(key, event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <SellerButton type="button" secondary disabled={saving} onClick={() => void load()}>
              <RefreshCw />
              {t('shipping.pickup.reload')}
            </SellerButton>
            <SellerButton type="submit" disabled={saving}>
              <Save />
              {saving ? t('shipping.pickup.saving') : t('shipping.pickup.save')}
            </SellerButton>
          </div>
        </form>
      )}
    </Panel>
  );
}
