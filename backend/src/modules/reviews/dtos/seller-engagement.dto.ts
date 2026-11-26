import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { DisputeStatus } from '@prisma/client';

const querySellerReviewsFields = {
  rating: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .describe('Lọc theo số sao đánh giá (1 - 5)')
      .meta({ example: 5 }),
  ),
  sortBy: z
    .enum(['newest', 'oldest'])
    .describe('Sắp xếp bình luận mới nhất (newest) hoặc cũ nhất (oldest)')
    .default('newest'),
  page: z.coerce.number().int().min(1).describe('Số trang (bắt đầu từ 1)').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .describe('Số lượng đánh giá mỗi trang (1 - 100)')
    .default(10),
};

export const QuerySellerReviewsSchema = z.object(querySellerReviewsFields).strict();

export type QuerySellerReviewsInput = z.infer<typeof QuerySellerReviewsSchema>;

const querySellerDisputesFields = {
  status: nullAsAbsent(z.enum(DisputeStatus).describe('Lọc theo trạng thái khiếu nại')),
  page: z.coerce.number().int().min(1).describe('Số trang (bắt đầu từ 1)').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .describe('Số lượng khiếu nại mỗi trang (1 - 100)')
    .default(10),
};

export const QuerySellerDisputesSchema = z.object(querySellerDisputesFields).strict();

export type QuerySellerDisputesInput = z.infer<typeof QuerySellerDisputesSchema>;

const respondDisputeFields = {
  responseNotes: z
    .string()
    .trim()
    .min(1)
    .describe('Nội dung phản hồi / giải trình từ phía người bán')
    .meta({
      example: 'Tôi đã đóng gói đúng hàng và gửi qua GHN, bưu kiện có dán tem niêm phong đầy đủ.',
    }),
  evidenceUrls: nullAsAbsent(
    z
      .array(z.string())
      .describe('Danh sách URL hình ảnh / video bằng chứng đối chất của người bán')
      .meta({ example: ['https://storage.nexus.vn/evidence/pack_proof_1.jpg'] }),
  ),
};

export const RespondDisputeSchema = z.object(respondDisputeFields).strict();

export type RespondDisputeInput = z.infer<typeof RespondDisputeSchema>;
