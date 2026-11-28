import type { HealthCheck } from '@nexus/contracts';
import { Server, ScrollText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Panel } from '../shared/AdminUI';

function probeTone(status?: 'ok' | 'degraded' | 'down'): 'green' | 'amber' | 'red' {
  if (status === 'ok') return 'green';
  if (status === 'degraded') return 'amber';
  return 'red';
}

export function SystemHealthBreakdown({ health }: { health?: HealthCheck }) {
  const { t } = useTranslation('admin');
  return (
    <Panel
      title={t('system.logistics.title')}
      subtitle={health ? `Updated ${new Date(health.timestamp).toLocaleTimeString()}` : undefined}
      icon={<Server size={19} />}
    >
      <div className="space-y-3 rounded-lg bg-slate-50 p-3 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">PostgreSQL</span>
          <Badge tone={probeTone(health?.db.status)}>
            {health?.db.status ?? 'unknown'}
            {health?.db.latencyMs !== undefined ? ` · ${health.db.latencyMs}ms` : ''}
          </Badge>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Redis</span>
          <Badge tone={probeTone(health?.redis.status)}>
            {health?.redis.status ?? 'unknown'}
            {health?.redis.latencyMs !== undefined ? ` · ${health.redis.latencyMs}ms` : ''}
          </Badge>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Socket.IO</span>
          <Badge tone={health ? 'green' : 'gray'}>
            {health ? `${health.sockets.connectedClients} clients` : 'unknown'}
          </Badge>
        </div>
      </div>
    </Panel>
  );
}

export function SystemRuntimeCard({ health }: { health?: HealthCheck }) {
  const { t } = useTranslation('admin');
  return (
    <Panel
      title={t('system.events.title')}
      subtitle={health ? `Updated ${new Date(health.timestamp).toLocaleTimeString()}` : undefined}
      icon={<ScrollText size={19} />}
    >
      <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">{t('system.uptime')}</span>
          <Badge tone={health ? 'green' : 'gray'}>
            {health ? `${Math.floor(health.uptimeSeconds)}s` : 'unknown'}
          </Badge>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">{t('system.overallStatus')}</span>
          <Badge tone={probeTone(health?.status)}>{health?.status ?? 'unknown'}</Badge>
        </div>
      </div>
    </Panel>
  );
}
