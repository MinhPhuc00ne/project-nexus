import { useState, type ReactElement } from 'react';
import { Bell as BellOutlined } from 'lucide-react';
import {
  MapPin as EnvironmentOutlined,
  RefreshCw as ReloadOutlined,
  ShieldCheck as SafetyCertificateOutlined,
  Store as ShopOutlined,
} from 'lucide-react';
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
  { key: 'store', label: 'Hồ sơ gian hàng', icon: ShopOutlined },
  { key: 'shipping', label: 'Địa chỉ shop', icon: EnvironmentOutlined },
  { key: 'notifications', label: 'Thông báo', icon: BellOutlined },
  { key: 'account', label: 'Tài khoản & bảo mật', icon: SafetyCertificateOutlined },
] as const;

export default function SellerSettingsPage(): ReactElement {
  const user = useSellerSession();
  const { token } = useAuth();
  return <SettingsWorkspace key={`${user.id}:${token}`} />;
}

function SettingsWorkspace(): ReactElement {
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
  return (
    <div className="space-y-5">
      <PageHeading
        title="Cài đặt Shop"
        description="Thông tin rõ ràng, gian hàng chuyên nghiệp, kết nối khách hàng."
        actions={
          <SellerButton secondary disabled={profile.loading} onClick={profile.retry}>
            <ReloadOutlined /> Làm mới thông tin shop
          </SellerButton>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav
          aria-label="Cài đặt gian hàng"
          className="grid grid-cols-2 gap-1 rounded-xl border border-blue-100 bg-white p-2 sm:grid-cols-4 lg:flex lg:flex-col lg:p-3"
        >
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              aria-current={tab === key ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-3 text-left text-xs font-medium transition ${tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}
              onClick={() => setTab(key)}
            >
              <Icon className="text-base" />
              {label}
            </button>
          ))}
        </nav>
        <Panel
          title={tabs.find((item) => item.key === tab)?.label}
          subtitle={
            tab === 'notifications'
              ? 'Quản lý các kênh nhận thông báo của tài khoản'
              : tab === 'account'
                ? 'Thông tin tài khoản và bảo mật đăng nhập'
                : 'Thông tin được lưu và đồng bộ lên hệ thống'
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
                </div>
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="mb-2 text-xs text-slate-500">Số điện thoại cá nhân</dt>
                  <dd className="m-0">{user.phoneNumber || 'Chưa cập nhật'}</dd>
                </div>
                <div>
                  <dt className="mb-2 text-xs text-slate-500">Trạng thái xác thực</dt>
                  <dd className="m-0">
                    <Badge tone={user.isVerified ? 'green' : 'amber'}>
                      {user.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                    </Badge>
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-6 text-slate-500">
                Cập nhật ảnh đại diện, thông tin cá nhân và đổi mật khẩu trong Hồ sơ cá nhân.
              </p>
              <SellerLink to="/seller/profile">Mở hồ sơ cá nhân</SellerLink>
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
