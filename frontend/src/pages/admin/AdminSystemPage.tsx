import { Activity, Database, RefreshCw, Server, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SystemHealthBreakdown,
  SystemRuntimeCard,
} from '../../components/adminDashboard/System/SystemCards';
import { Badge, Button, Panel } from '../../components/adminDashboard/shared/AdminUI';
import { useSystemHealth } from '../../features/health/api';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${Math.floor(seconds % 60)}s`;
}

export default function AdminSystemPage() {
  const { t } = useTranslation('admin');
  const { data: health, isLoading, isError, refetch, isFetching } = useSystemHealth();

  const statusTone =
    health?.status === 'ok' ? 'green' : health?.status === 'degraded' ? 'amber' : 'red';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">/api/v1/health</span>
          {health && <Badge tone={statusTone}>{health.status.toUpperCase()}</Badge>}
        </div>
        <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          {t('common.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      {isError && (
        <Panel title={t('system.wsEngine')} icon={<Server size={18} />}>
          <p className="text-sm text-rose-600">
            {t('system.errorLoadingHealth', {
              defaultValue: 'Unable to reach /api/v1/health.',
            })}
          </p>
        </Panel>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'PostgreSQL',
            value: isLoading
              ? '...'
              : health
                ? `${health.db.status.toUpperCase()} (${health.db.latencyMs ?? '-'} ms)`
                : '-',
            icon: Database,
          },
          {
            label: 'Redis',
            value: isLoading
              ? '...'
              : health
                ? `${health.redis.status.toUpperCase()} (${health.redis.latencyMs ?? '-'} ms)`
                : '-',
            icon: Server,
          },
          {
            label: t('system.wsEngine'),
            value: isLoading ? '...' : health ? `${health.sockets.connectedClients} clients` : '-',
            icon: Wifi,
          },
          {
            label: t('system.uptime'),
            value: isLoading ? '...' : health ? formatUptime(health.uptimeSeconds) : '-',
            icon: Activity,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Panel key={label} title={label} icon={<Icon size={18} />}>
            <p className="text-xl font-bold text-primary">{value}</p>
          </Panel>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SystemHealthBreakdown health={health} />
        <SystemRuntimeCard health={health} />
      </div>
    </div>
  );
}
