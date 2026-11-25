import { LoaderCircle, MapPin, RefreshCw, UserRound, Wallet } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserById } from '../../../services/admin';
import type { AdminUserDetail, AdminUserRole } from '../../../types/user.types';
import { getIntlLocale } from '../../../i18n/config';
import Popup from '../../Popup';
import { Badge, Button } from '../shared/AdminUI';
import ShopDetail from '../Stores/ShopDetail';
import UserShopSummary from './UserShopSummary';

const roleLabels: Record<AdminUserRole, string> = {
  BUYER: 'Buyer',
  SELLER: 'Seller',
  SUPPORT_STAFF: 'Staff',
  ADMIN: 'Admin',
};

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale);
}

function formatMoney(value: number, currency: string, locale: string) {
  return `${value.toLocaleString(locale)} ${currency}`;
}

function DetailField({
  label,
  children,
  emptyLabel,
}: {
  label: string;
  children: ReactNode;
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">
        {children === null || children === undefined || children === '' ? emptyLabel : children}
      </dd>
    </div>
  );
}

export default function UserAccountDetail({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const emptyValue = t('users.detail.emptyValue');
  const { token } = useAuth();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [viewingShopId, setViewingShopId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setUser(null);
    void getUserById(userId, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) setUser(detail);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : t('users.detail.loadErr'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, token, revision, t]);

  if (viewingShopId === userId && user?.role === 'SELLER') {
    return <ShopDetail shopId={userId} onClose={() => setViewingShopId(null)} />;
  }

  return (
    <Popup
      isOpen
      onClose={onClose}
      title={t('users.detail.title')}
      size="lg"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('users.detail.close')}
        </Button>
      }
    >
      {loading && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"
        >
          <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
          {t('users.detail.loading')}
        </div>
      )}
      {!loading && error && (
        <div role="alert" className="space-y-4 rounded-xl bg-rose-50 p-5 text-sm text-rose-700">
          <p>{error}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw size={15} aria-hidden="true" /> {t('users.detail.retry')}
          </Button>
        </div>
      )}
      {!loading && !error && user && (
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-xl bg-slate-50 p-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-primary">
              {(user.fullName || user.email).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-lg font-bold text-slate-900">
                {user.fullName || user.email}
              </h3>
              <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{roleLabels[user.role]}</Badge>
                <Badge tone={user.isLocked ? 'red' : 'green'}>
                  {user.isLocked ? t('users.detail.lockedBadge') : t('users.detail.activeBadge')}
                </Badge>
                <Badge tone={user.isVerified ? 'green' : 'amber'}>
                  {user.isVerified ? t('users.detail.verified') : t('users.detail.unverified')}
                </Badge>
              </div>
            </div>
          </div>

          <section aria-label={t('users.detail.infoTitle')}>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <UserRound size={17} aria-hidden="true" /> {t('users.detail.infoTitle')}
            </h3>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField label={t('users.detail.idLabel')} emptyLabel={emptyValue}>
                {user.id}
              </DetailField>
              <DetailField label={t('users.detail.phoneLabel')} emptyLabel={emptyValue}>
                {user.phoneNumber}
              </DetailField>
              <DetailField label={t('users.detail.personalEmailLabel')} emptyLabel={emptyValue}>
                {user.personalEmail}
              </DetailField>
              <DetailField label={t('users.detail.workEmailLabel')} emptyLabel={emptyValue}>
                {user.platformEmail}
              </DetailField>
              <DetailField label={t('users.detail.reputationLabel')} emptyLabel={emptyValue}>
                {user.reputationScore}
              </DetailField>
              <DetailField label={t('users.detail.trustLevelLabel')} emptyLabel={emptyValue}>
                {user.trustLevel}
              </DetailField>
              <DetailField label={t('users.detail.sellerModeLabel')} emptyLabel={emptyValue}>
                {user.isSellerActive ? t('users.detail.sellerOn') : t('users.detail.sellerOff')}
              </DetailField>
              <DetailField label={t('users.detail.createdAtLabel')} emptyLabel={emptyValue}>
                {formatDate(user.createdAt, locale)}
              </DetailField>
              <DetailField label={t('users.detail.updatedAtLabel')} emptyLabel={emptyValue}>
                {formatDate(user.updatedAt, locale)}
              </DetailField>
            </dl>
          </section>

          <section
            aria-label={t('users.detail.walletTitle')}
            className="border-t border-slate-100 pt-5"
          >
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Wallet size={17} aria-hidden="true" /> {t('users.detail.walletTitle')}
            </h3>
            {user.wallet ? (
              <dl className="grid gap-4 rounded-xl bg-blue-50/60 p-4 sm:grid-cols-2">
                <DetailField label={t('users.detail.balanceLabel')} emptyLabel={emptyValue}>
                  {formatMoney(user.wallet.balance, user.wallet.currency, locale)}
                </DetailField>
                <DetailField label={t('users.detail.lockedBalanceLabel')} emptyLabel={emptyValue}>
                  {formatMoney(user.wallet.lockedBalance, user.wallet.currency, locale)}
                </DetailField>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">{t('users.detail.noWallet')}</p>
            )}
          </section>

          <section
            aria-label={t('users.detail.activityTitle')}
            className="border-t border-slate-100 pt-5"
          >
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              {t('users.detail.activityTitle')}
            </h3>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  [t('users.detail.statProducts'), user.stats.products],
                  [t('users.detail.statOrdersBuyer'), user.stats.ordersAsBuyer],
                  [t('users.detail.statOrdersSeller'), user.stats.ordersAsSeller],
                  [t('users.detail.statAuctions'), user.stats.auctions],
                  [t('users.detail.statDisputes'), user.stats.disputesOpened],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 p-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 text-xl font-bold text-primary">
                    {value.toLocaleString(locale)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {user.role === 'SELLER' && (
            <UserShopSummary userId={user.id} onView={() => setViewingShopId(user.id)} />
          )}

          <section
            aria-label={t('users.detail.addressesTitle', { count: user.addresses.length })}
            className="border-t border-slate-100 pt-5"
          >
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin size={17} aria-hidden="true" />{' '}
              {t('users.detail.addressesTitle', { count: user.addresses.length })}
            </h3>
            {user.addresses.length ? (
              <ul className="space-y-3">
                {user.addresses.map((address, index) => (
                  <li key={address.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {t('users.detail.addressIndex', { index: index + 1 })}
                      </span>
                      {address.isDefault && (
                        <Badge tone="green">{t('users.detail.defaultBadge')}</Badge>
                      )}
                    </div>
                    <p className="mt-2 break-words text-slate-600">
                      {t('users.detail.recipientLabel', { name: address.recipientName })}
                    </p>
                    <p className="mt-1 text-slate-500">{address.phone}</p>
                    <p className="mt-2 break-words text-slate-600">
                      {[
                        address.street,
                        address.ward,
                        address.district,
                        address.city,
                        address.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{t('users.detail.noAddresses')}</p>
            )}
          </section>
        </div>
      )}
    </Popup>
  );
}
