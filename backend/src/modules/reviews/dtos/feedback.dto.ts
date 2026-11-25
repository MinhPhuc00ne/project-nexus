import { z } from 'zod';
import { httpUrl, mediaUrlList, nullAsAbsent } from '../../../core/validation/query-schemas';

const reviewFields = {
  rating: z.coerce.number().int().min(1).max(5).meta({ example: 5 }),
  comment: nullAsAbsent(z.string().max(2000)),
  mediaUrls: mediaUrlList(6)
    .describe('Image or video URLs attached to product review feedback')
    .meta({ example: ['https://res.cloudinary.com/demo/image/upload/v1/review-1.jpg'] }),
};

export const ReviewSchema = z.object(reviewFields).strict();

export type ReviewInput = z.infer<typeof ReviewSchema>;

const sellerReplyReviewFields = {
  reply: z
    .string()
    .trim()
    .min(2)
    .max(2000)
    .describe('Seller reply content for a product review')
    .meta({ example: 'Cảm ơn bạn đã ủng hộ shop! Shop sẽ đóng gói kỹ hơn ở đơn sau ạ.' }),
  mediaUrls: mediaUrlList(6).describe('Optional image or video URLs attached to the reply'),
};

export const SellerReplyReviewSchema = z.object(sellerReplyReviewFields).strict();

export type SellerReplyReviewInput = z.infer<typeof SellerReplyReviewSchema>;

const createReviewReplyFields = {
  content: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .describe('Reply message content between buyer and seller')
    .meta({ example: 'Cảm ơn bạn đã phản hồi, shop xin hỗ trợ đổi trả ngay ạ.' }),
  mediaUrls: mediaUrlList(6).describe('Image or video URLs attached to this reply'),
};

export const CreateReviewReplySchema = z.object(createReviewReplyFields).strict();

export type CreateReviewReplyInput = z.infer<typeof CreateReviewReplySchema>;

const adminModerateReviewVisibilityFields = {
  isHidden: z
    .boolean()
    .describe('true = ẩn đánh giá/phản hồi tiêu cực vi phạm, false = bỏ ẩn')
    .meta({ example: true }),
  reason: nullAsAbsent(
    z
      .string()
      .max(1000)
      .meta({ example: 'Nội dung chứa từ ngữ xúc phạm hoặc tiêu cực không phù hợp.' }),
  ),
  pointsToDeduct: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(0)
      .describe('Số điểm uy tín muốn trừ của tác giả khi ẩn (mặc định 0 nếu không trừ)')
      .meta({ example: 10 }),
  ),
  targetType: nullAsAbsent(z.enum(['PRODUCT', 'SHOP']).meta({ example: 'PRODUCT' })),
};

export const AdminModerateReviewVisibilitySchema = z
  .object(adminModerateReviewVisibilityFields)
  .strict();

export type AdminModerateReviewVisibilityInput = z.infer<
  typeof AdminModerateReviewVisibilitySchema
>;

const reportFields = {
  title: z.string().trim().min(5).max(150).meta({ example: 'Sản phẩm không đúng mô tả' }),
  description: z
    .string()
    .trim()
    .min(10)
    .max(5000)
    .meta({ example: 'Nội dung mô tả chi tiết vi phạm cần kiểm tra.' }),
  evidenceUrls: nullAsAbsent(z.array(httpUrl).max(10)),
};

export const ReportSchema = z.object(reportFields).strict();

export type ReportInput = z.infer<typeof ReportSchema>;

const feedbackPageFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  rating: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .describe('Lọc theo số sao đánh giá (1 - 5); bỏ trống để lấy tất cả đánh giá')
      .meta({ example: 5 }),
  ),
  sortBy: z
    .enum(['newest', 'oldest'])
    .describe('Sắp xếp bình luận mới nhất (newest) hoặc cũ nhất (oldest)')
    .default('newest'),
};

export const FeedbackPageSchema = z.object(feedbackPageFields).strict();

export type FeedbackPageInput = z.infer<typeof FeedbackPageSchema>;

const adminDeleteReviewFields = {
  reason: z
    .string()
    .min(5)
    .max(1000)
    .meta({ example: 'Bình luận dùng ngôn từ thô tục, xúc phạm người bán' }),
  pointsToDeduct: z
    .number()
    .int()
    .min(1)
    .describe('Số điểm uy tín muốn trừ của người đánh giá')
    .meta({ example: 10 }),
};

export const AdminDeleteReviewSchema = z.object(adminDeleteReviewFields).strict();

export type AdminDeleteReviewInput = z.infer<typeof AdminDeleteReviewSchema>;

const queryAdminReviewsFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: nullAsAbsent(z.string()),
  search: nullAsAbsent(z.string().describe('Từ khóa tìm kiếm theo nội dung bình luận')),
  rating: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .describe('Lọc theo số sao đánh giá (1 - 5); bỏ trống để lấy tất cả'),
  ),
  sortBy: z
    .enum(['newest', 'oldest'])
    .describe('Sắp xếp bình luận mới nhất (newest) hoặc cũ nhất (oldest)')
    .default('newest'),
};

export const QueryAdminReviewsSchema = z.object(queryAdminReviewsFields).strict();

export type QueryAdminReviewsInput = z.infer<typeof QueryAdminReviewsSchema>;
