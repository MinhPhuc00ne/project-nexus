import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuctionStatus } from '@nexus/contracts';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getAdminSettings,
  getAdminOverviewAnalytics,
  listUsers,
} from '@/features/admin/services/admin';
import { getAdminAuctionsApi } from '@/features/auction/services/auction.service';
import { getAdminNotificationSummary } from '@/features/notifications/services/notifications';
import { apiRequest } from '../../../services/api';
import type { AdminNotificationSummary } from '@/features/notifications/types/notification.types';
import type { AdminOverviewAnalytics } from '@/features/admin/types/admin-analytics.types';
import type { SystemSettings } from '@/features/admin/types/admin-settings.types';
import type { GhnDiagnostic } from '@/features/orders/types/order.types';
import type { AdminUserRole } from '@/features/account/types/user.types';

const roles: AdminUserRole[] = ['BUYER', 'SELLER', 'SUPPORT_STAFF', 'ADMIN'];
interface OverviewData {
  queues?: AdminNotificationSummary;
  analytics?: AdminOverviewAnalytics;
  settings?: SystemSettings;
  ghn?: GhnDiagnostic;
  live?: number;
  users?: { total: number; roles: Record<AdminUserRole, number> };
}

export default function useOverviewData() {
  const { t } = useTranslation('admin');
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
            `${label}: ${cause instanceof Error ? cause.message : t('overview.loadErrFallback')}`,
          ]);
      }
    }
    void Promise.allSettled([
      load(t('overview.sources.queues'), 'queues', getAdminNotificationSummary()),
      load(
        t('overview.sources.analytics'),
        'analytics',
        getAdminOverviewAnalytics(controller.signal),
      ),
      load(t('overview.sources.settings'), 'settings', getAdminSettings(controller.signal)),
      load(
        t('overview.sources.ghn'),
        'ghn',
        apiRequest<GhnDiagnostic>('/fulfillment/shipping/diagnostic'),
      ),
      load(
        t('overview.sources.live'),
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
        t('overview.sources.users'),
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
