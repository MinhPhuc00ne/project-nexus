import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Store } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getAdminShopById } from '@/features/admin/services/admin';
import type { AdminShopDetail } from '../../../types/admin.types';
import { Badge, Button } from '../shared/AdminUI';

export default function UserShopSummary({
  userId,
  onView,
}: {
  userId: string;
  onView: () => void;
}) {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const [shop, setShop] = useState<AdminShopDetail['shop'] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setShop(null);
    setError('');
    void getAdminShopById(userId, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) setShop(detail.shop);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : t('users.shopSummary.loadErr'));
        }
      });
    return () => controller.abort();
  }, [userId, token, revision, t]);

  return (
    <section aria-label={t('users.shopSummary.title')} className="border-t border-slate-100 pt-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
        <Store size={17} aria-hidden="true" /> {t('users.shopSummary.title')}
      </h3>
      {error ? (
        <div role="alert" className="space-y-3 text-sm text-red-600">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            {t('users.shopSummary.retry')}
          </Button>
        </div>
      ) : shop ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <div className="min-w-0 space-y-2">
            <p className="break-words text-sm font-semibold text-slate-900">{shop.storeName}</p>
            <Badge
              tone={
                shop.status.currentStatus === 'ACTIVE'
                  ? 'green'
                  : shop.status.currentStatus === 'SUSPENDED'
                    ? 'red'
                    : 'gray'
              }
            >
              {t(`users.shopSummary.statuses.${shop.status.currentStatus}`)}
            </Badge>
          </div>
          <Button variant="secondary" onClick={onView}>
            {t('users.shopSummary.viewShop')}
          </Button>
        </div>
      ) : (
        <p role="status" className="text-sm text-slate-500">
          {t('users.shopSummary.loading')}
        </p>
      )}
    </section>
  );
}
