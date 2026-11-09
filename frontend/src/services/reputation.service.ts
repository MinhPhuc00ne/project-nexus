import { apiRequest } from './api';

export type ReputationTrustLevel = 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'STANDARD' | 'POOR';

export interface ReputationSummary {
  userId: string;
  score: number;
  trustLevel: ReputationTrustLevel;
  isSuspended: boolean;
  canSell: boolean;
  isVerifiedShop: boolean;
}

export interface ReputationLogItem {
  id: string;
  userId: string;
  deltaPoints: number;
  balanceAfter: number;
  reason: string;
  penaltyType: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface ReputationLogsResponse {
  items: ReputationLogItem[];
  total: number;
  page: number;
  limit: number;
}

export async function getReputationSummaryApi(): Promise<ReputationSummary> {
  return apiRequest<ReputationSummary>('/users/reputation/summary', { requireAuth: true });
}

export async function getReputationLogsApi(page = 1, limit = 20): Promise<ReputationLogsResponse> {
  return apiRequest<ReputationLogsResponse>(
    `/users/reputation/logs?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`,
    { requireAuth: true },
  );
}
