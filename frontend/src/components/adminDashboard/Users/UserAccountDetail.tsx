import { LoaderCircle, MapPin, RefreshCw, UserRound, Wallet } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserById } from '../../../services/admin';
import type { AdminUserDetail, AdminUserRole } from '../../../types/user.types';
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

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString('vi-VN')} ${currency}`;
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">
        {children === null || children === undefined || children === '' ? 'Chưa có' : children}
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
          setError(cause instanceof Error ? cause.message : 'Không thể tải chi tiết tài khoản.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, token, revision]);

  if (viewingShopId === userId && user?.role === 'SELLER') {
    return <ShopDetail shopId={userId} onClose={() => setViewingShopId(null)} />;
  }

  return (
    <Popup
      isOpen
      onClose={onClose}
      title="Chi tiết tài khoản"
      size="lg"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      {loading && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"
        >
          <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
          Đang tải thông tin tài khoản…
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
            <RefreshCw size={15} aria-hidden="true" /> Thử lại
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
                  {user.isLocked ? 'Đã khóa' : 'Hoạt động'}
                </Badge>
                <Badge tone={user.isVerified ? 'green' : 'amber'}>
                  {user.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                </Badge>
              </div>
            </div>
          </div>

          <section aria-label="Thông tin tài khoản">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <UserRound size={17} aria-hidden="true" /> Thông tin tài khoản
            </h3>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField label="Mã tài khoản">{user.id}</DetailField>
              <DetailField label="Số điện thoại">{user.phoneNumber}</DetailField>
              <DetailField label="Email cá nhân">{user.personalEmail}</DetailField>
              <DetailField label="Email công tác">{user.platformEmail}</DetailField>
              <DetailField label="Điểm uy tín">{user.reputationScore}</DetailField>
              <DetailField label="Mức độ tín nhiệm">{user.trustLevel}</DetailField>
              <DetailField label="Chế độ bán hàng">
                {user.isSellerActive ? 'Đang bật' : 'Đang tắt'}
              </DetailField>
              <DetailField label="Ngày tạo">{formatDate(user.createdAt)}</DetailField>
              <DetailField label="Cập nhật lần cuối">{formatDate(user.updatedAt)}</DetailField>
            </dl>
          </section>

          <section aria-label="Ví tiền" className="border-t border-slate-100 pt-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Wallet size={17} aria-hidden="true" /> Ví tiền
            </h3>
            {user.wallet ? (
              <dl className="grid gap-4 rounded-xl bg-blue-50/60 p-4 sm:grid-cols-2">
                <DetailField label="Số dư">
                  {formatMoney(user.wallet.balance, user.wallet.currency)}
                </DetailField>
                <DetailField label="Số dư bị khóa">
                  {formatMoney(user.wallet.lockedBalance, user.wallet.currency)}
                </DetailField>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Tài khoản chưa có ví.</p>
            )}
          </section>

          <section aria-label="Thống kê hoạt động" className="border-t border-slate-100 pt-5">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Thống kê hoạt động</h3>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  ['Sản phẩm', user.stats.products],
                  ['Đơn mua', user.stats.ordersAsBuyer],
                  ['Đơn bán', user.stats.ordersAsSeller],
                  ['Phiên đấu giá', user.stats.auctions],
                  ['Tranh chấp đã mở', user.stats.disputesOpened],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 p-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 text-xl font-bold text-primary">
                    {value.toLocaleString('vi-VN')}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {user.role === 'SELLER' && (
            <UserShopSummary userId={user.id} onView={() => setViewingShopId(user.id)} />
          )}

          <section aria-label="Sổ địa chỉ" className="border-t border-slate-100 pt-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin size={17} aria-hidden="true" /> Sổ địa chỉ ({user.addresses.length})
            </h3>
            {user.addresses.length ? (
              <ul className="space-y-3">
                {user.addresses.map((address, index) => (
                  <li key={address.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Địa chỉ {index + 1}</span>
                      {address.isDefault && <Badge tone="green">Mặc định</Badge>}
                    </div>
                    <p className="mt-2 break-words text-slate-600">
                      Người nhận / liên hệ: {address.recipientName}
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
              <p className="text-sm text-slate-500">Tài khoản chưa có địa chỉ.</p>
            )}
          </section>
        </div>
      )}
    </Popup>
  );
}
