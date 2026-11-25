import i18n from '../i18n';
import { apiRequest } from './api';

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
  'Sản phẩm giả mạo / Không chính hãng',
  'Thông tin mô tả hoặc thông số sai sự thật',
  'Giá bán bất thường hoặc có dấu hiệu gian lận',
  'Hình ảnh phản cảm hoặc vi phạm bản quyền',
  'Sản phẩm thuộc danh mục cấm kinh doanh',
  'Lý do khác',
];

export const SHOP_REPORT_REASONS = [
  'Gian hàng có dấu hiệu lừa đảo / Yêu cầu chuyển khoản ngoài sàn',
  'Thái độ phục vụ thiếu chuẩn mực / Ngôn từ xúc phạm',
  'Giao hàng sai sản phẩm nhiều lần / Không hỗ trợ bảo hành',
  'Mạo danh thương hiệu hoặc cửa hàng ủy quyền',
  'Spam tin nhắn hoặc quảng cáo trái phép',
  'Lý do khác',
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
