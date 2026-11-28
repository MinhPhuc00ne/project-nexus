import i18n from '@/i18n';
import { apiRequest } from '@/services/api';

export type ReportTargetType = 'PRODUCT' | 'SHOP';

export interface CreateReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  targetName: string;
  reason: string;
  description: string;
  evidenceUrls?: string[];
}

export interface SubmittedReport {
  id?: string;
  message?: string;
}

export const PRODUCT_REPORT_REASONS = [
  'Counterfeit / Not authentic',
  'Misleading description or specifications',
  'Abnormal pricing or suspected fraud',
  'Offensive or copyright-infringing images',
  'Prohibited product category',
  'Other reason',
];

export const SHOP_REPORT_REASONS = [
  'Suspected scam / Off-platform bank transfer request',
  'Unprofessional service or offensive language',
  'Repeatedly ships wrong items / No warranty support',
  'Impersonating a brand or authorized store',
  'Spam messages or unauthorized advertising',
  'Other reason',
];

export async function uploadReportEvidence(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const uploaded = await apiRequest<{ url: string }>('/media/upload', {
    method: 'POST',
    body: formData,
    isFormData: true,
    requireAuth: true,
  });
  if (!uploaded?.url) throw new Error(i18n.t('errors:services.invalidEvidenceUrl'));
  return uploaded.url;
}

export async function submitReportApi(payload: CreateReportPayload): Promise<SubmittedReport> {
  const reason = payload.reason.trim();
  const description = payload.description.trim();
  if (!reason) throw new Error(i18n.t('errors:services.reportReasonRequired'));
  if (description.length < 10) {
    throw new Error(i18n.t('errors:services.reportDescriptionMin'));
  }

  const endpoint =
    payload.targetType === 'PRODUCT'
      ? `/catalog/products/${encodeURIComponent(payload.targetId)}/reports`
      : `/catalog/shops/${encodeURIComponent(payload.targetId)}/reports`;

  return apiRequest<SubmittedReport>(endpoint, {
    method: 'POST',
    body: {
      title: reason,
      description,
      ...(payload.evidenceUrls?.length ? { evidenceUrls: payload.evidenceUrls } : {}),
    },
    requireAuth: true,
  });
}
