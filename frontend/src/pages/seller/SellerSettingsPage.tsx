import { useState, type ReactElement } from 'react';
import { Bell as BellOutlined } from 'lucide-react';
import {
  MapPin as EnvironmentOutlined,
  RefreshCw as ReloadOutlined,
  ShieldCheck as SafetyCertificateOutlined,
  Store as ShopOutlined,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getSellerShopProfile } from '../../services/shops';
import useProductResource from '../../components/productDetail/useProductResource';
import { useSellerSession } from '../../components/seller/SellerSession';
import { useSellerWorkspace } from '../../components/seller/SellerWorkspace';
import {
  Badge,
  PageHeading,
  Panel,
  SellerButton,
  SellerLink,
} from '../../components/seller/SellerUI';
import SellerResourceState from '../../components/seller/SellerResourceState';
import SellerShopEditor from '../../components/seller/SellerShopEditor';
import SellerNotificationPreferences from '../../components/seller/SellerNotificationPreferences';

type SettingsTab = 'store' | 'shipping' | 'notifications' | 'account';
const tabs = [
  { key: 'store', labelKey: 'settings.tabs.store', icon: ShopOutlined },
  { key: 'shipping', labelKey: 'settings.tabs.shipping', icon: EnvironmentOutlined },
  { key: 'notifications', labelKey: 'settings.tabs.notifications', icon: BellOutlined },
  { key: 'account', labelKey: 'settings.tabs.account', icon: SafetyCertificateOutlined },
] as const;

export default function SellerSettingsPage(): ReactElement {
  const user = useSellerSession();
  const { token } = useAuth();
  return <SettingsWorkspace key={`${user.id}:${token}`} />;
}

function SettingsWorkspace(): ReactElement {
  const { t } = useTranslation('seller');
  const user = useSellerSession();
  const { refreshProfile } = useAuth();
  const { refreshShop } = useSellerWorkspace();
  const [tab, setTab] = useState<SettingsTab>('store');
  const profile = useProductResource(getSellerShopProfile);
  function saved(): void {
    profile.retry();
    refreshShop();
    void refreshProfile();
  }
  const activeTab = tabs.find((item) => item.key === tab);
  return (
    <div className="space-y-5">
      <PageHeading
        title={t('settings.pageTitle')}
        description={t('settings.pageDesc')}
        actions={
          <SellerButton secondary disabled={profile.loading} onClick={profile.retry}>
            <ReloadOutlined /> {t('settings.refresh')}
          </SellerButton>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav
          aria-label={t('settings.navAria')}
          className="grid grid-cols-2 gap-1 rounded-xl border border-blue-100 bg-white p-2 sm:grid-cols-4 lg:flex lg:flex-col lg:p-3"
        >
          {tabs.map(({ key, labelKey, icon: Icon }) => (
            <button
              key={key}
              aria-current={tab === key ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-3 text-left text-xs font-medium transition ${tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}
              onClick={() => setTab(key)}
            >
              <Icon className="text-base" />
              {t(labelKey)}
            </button>
          ))}
        </nav>
        <Panel
          title={activeTab ? t(activeTab.labelKey) : undefined}
          subtitle={
            tab === 'notifications'
              ? t('settings.subtitles.notifications')
              : tab === 'account'
                ? t('settings.subtitles.account')
                : t('settings.subtitles.default')
          }
        >
          {tab === 'notifications' ? (
            <SellerNotificationPreferences />
          ) : tab === 'account' ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {user.avatarUrl ? (
                    <img className="size-full object-cover" src={user.avatarUrl} alt="" />
                  ) : (
                    user.fullName.charAt(0)
                  )}
                </span>
                <div className="min-w-0">
                  <strong className="block text-sm">{user.fullName}</strong>
                  <p className="mt-1 break-all text-xs text-slate-500">{user.email}</p>
                  <p className="mt-1 text-[11px] text-blue-600 font-medium">
                    Ảnh đại diện tài khoản cá nhân (tách biệt hoàn toàn với Logo gian hàng)
                  </p>
                </div>
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="mb-2 text-xs text-slate-500">
                    {t('settings.account.phoneLabel')}
                  </dt>
                  <dd className="m-0">{user.phoneNumber || t('settings.account.notUpdated')}</dd>
                </div>
                <div>
                  <dt className="mb-2 text-xs text-slate-500">
                    {t('settings.account.verifiedLabel')}
                  </dt>
                  <dd className="m-0">
                    <Badge tone={user.isVerified ? 'green' : 'amber'}>
                      {user.isVerified
                        ? t('settings.account.verified')
                        : t('settings.account.unverified')}
                    </Badge>
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-6 text-slate-500">{t('settings.account.hint')}</p>
              <SellerLink to="/seller/profile">{t('settings.account.openProfile')}</SellerLink>
            </div>
          ) : (
            <SellerResourceState
              loading={profile.loading}
              error={profile.error}
              retry={profile.retry}
            >
              {profile.data && (
                <SellerShopEditor
                  key={`${profile.data.id}:${profile.data.updatedAt}:${tab}`}
                  profile={profile.data}
                  section={tab}
                  onSaved={saved}
                />
              )}
            </SellerResourceState>
          )}
        </Panel>
      </div>
    </div>
  );
}
