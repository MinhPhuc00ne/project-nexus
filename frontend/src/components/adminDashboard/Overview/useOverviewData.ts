import { useEffect, useState } from 'react';
import { AuctionStatus } from '@nexus/types';
import { useAuth } from '../../../contexts/AuthContext';
import { getAdminSettings, getAdminWallet, listUsers } from '../../../services/admin';
import { getAdminAuctionsApi } from '../../../services/auction.service';
import { getAdminNotificationSummary } from '../../../services/notifications';
import { apiRequest } from '../../../services/api';
import type { AdminNotificationSummary } from '../../../types/notification.types';
import type { AdminWalletSummary } from '../../../types/admin-wallet.types';
import type { SystemSettings } from '../../../types/admin-settings.types';
import type { GhnDiagnostic } from '../../../types/order.types';
import type { AdminUserRole } from '../../../types/user.types';

const roles: AdminUserRole[] = ['BUYER', 'SELLER', 'SUPPORT_STAFF', 'ADMIN'];
interface OverviewData {
  queues?: AdminNotificationSummary;
  wallet?: AdminWalletSummary;
  settings?: SystemSettings;
  ghn?: GhnDiagnostic;
  live?: number;
  users?: { total: number; roles: Record<AdminUserRole, number> };
}

export default function useOverviewData() {
  const { token } = useAuth();
  const [data, setData] = useState<OverviewData>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setData({});
    setErrors([]);
    async function load<K extends keyof OverviewData>(
      label: string,
      key: K,
      request: Promise<OverviewData[K]>,
    ) {
      try {
        const value = await request;
        if (active) setData((current) => ({ ...current, [key]: value }));
      } catch (cause) {
        if (active)
          setErrors((current) => [
            ...current,
            `${label}: ${cause instanceof Error ? cause.message : 'Không tải được dữ liệu.'}`,
          ]);
      }
    }
    void Promise.allSettled([
      load('Yêu cầu chờ xử lý', 'queues', getAdminNotificationSummary()),
      load('Ví nền tảng', 'wallet', getAdminWallet(controller.signal)),
      load('Cấu hình', 'settings', getAdminSettings(controller.signal)),
      load('Kết nối GHN', 'ghn', apiRequest<GhnDiagnostic>('/fulfillment/shipping/diagnostic')),
      load(
        'Phiên đang diễn ra',
        'live',
        Promise.all([
          getAdminAuctionsApi({ page: 1, limit: 1, status: AuctionStatus.ACTIVE }),
          getAdminAuctionsApi({ page: 1, limit: 1, status: AuctionStatus.EXTENDED }),
        ]).then(
          ([activeAuctions, extended]) =>
            activeAuctions.pagination.total + extended.pagination.total,
        ),
      ),
      load(
        'Người dùng',
        'users',
        Promise.all([
          listUsers({ page: 1, limit: 1 }, controller.signal),
          ...roles.map((role) => listUsers({ page: 1, limit: 1, role }, controller.signal)),
        ]).then(([all, ...byRole]) => ({
          total: all.total,
          roles: Object.fromEntries(roles.map((role, i) => [role, byRole[i].total])) as Record<
            AdminUserRole,
            number
          >,
        })),
      ),
    ]).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [token, revision]);
  return { data, loading, errors, refresh: () => setRevision((value) => value + 1) };
}
