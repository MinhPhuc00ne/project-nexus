import { useQuery } from '@tanstack/react-query';
import type { HealthCheck } from '@nexus/contracts';
import { request } from '@/services/api';

export const healthQueryKey = ['system', 'health'] as const;

export function fetchSystemHealth(): Promise<HealthCheck> {
  return request<HealthCheck>({ url: '/health', method: 'GET' });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: fetchSystemHealth,
    refetchInterval: 30_000,
  });
}
