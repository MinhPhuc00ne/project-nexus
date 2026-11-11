export type AdminReportStatus = 'PENDING' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED';

export interface AdminReport {
  id: string;
  shopId: string;
  productId: string | null;
  reporterId: string | null;
  shopName?: string | null;
  productTitle?: string | null;
  productName?: string | null;
  reporterName?: string | null;
  shop?: { id: string; storeName: string; fullName: string } | null;
  product?: { id: string; title: string; status: string } | null;
  reporter?: { id: string; fullName: string; email: string } | null;
  title: string;
  description: string;
  evidenceUrls: unknown;
  status: AdminReportStatus;
  resolutionNotes: string | null;
  handledByAdminId: string | null;
  handledAt: string | null;
  createdAt: string;
  penaltyLevel: string | null;
}

export interface AdminReportPage {
  items: AdminReport[];
  total: number;
  page: number;
  limit: number;
}

export interface ReviewAdminReport {
  status: Exclude<AdminReportStatus, 'PENDING'>;
  reason: string;
}
