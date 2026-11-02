import { apiRequest } from './api';
import { getSellerResource } from './sellerResources';
import type { SellerDisputesPage, SellerDisputeStatus } from '../types/seller-dispute.types';

export function getSellerDisputes(
  page: number,
  status: SellerDisputeStatus | '',
): Promise<SellerDisputesPage> {
  const query = new URLSearchParams({ page: String(page), limit: '10' });
  if (status) query.set('status', status);
  return getSellerResource(`/seller/disputes?${query}`);
}
export async function respondSellerDispute(
  id: string,
  responseNotes: string,
  evidenceUrls: string[],
): Promise<{ success: boolean; message: string }> {
  if (!responseNotes.trim()) throw new Error('Vui lòng nhập nội dung giải trình.');
  const result = await apiRequest<{ success: boolean; message: string }>(
    `/seller/disputes/${encodeURIComponent(id)}/respond`,
    {
      method: 'POST',
      body: { responseNotes: responseNotes.trim(), evidenceUrls },
      requireAuth: true,
    },
  );
  if (!result.success) throw new Error(result.message || 'Chưa gửi được giải trình.');
  return result;
}
export function safeEvidenceUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((url): url is string => {
    if (typeof url !== 'string') return false;
    try {
      return ['http:', 'https:'].includes(new URL(url).protocol);
    } catch {
      return false;
    }
  });
}
export async function uploadDisputeEvidence(file: File): Promise<string> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    !/\.(jpe?g|png|webp)$/i.test(file.name)
  )
    throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
  if (!file.size || file.size > 25 * 1024 * 1024)
    throw new Error('Ảnh phải có dung lượng từ 1 byte đến 25 MB.');
  const body = new FormData();
  body.append('file', file);
  const result = await apiRequest<{ url: string }>('/media/upload', {
    method: 'POST',
    body,
    isFormData: true,
    requireAuth: true,
  });
  const url = safeEvidenceUrls([result.url])[0];
  if (!url) throw new Error('Máy chủ chưa trả về đường dẫn ảnh hợp lệ.');
  return url;
}
