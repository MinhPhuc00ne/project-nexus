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
    .meta({
      example: 'Thank you for supporting our shop! We will pack even more carefully next time.',
    }),
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
    .meta({ example: 'Thank you for your feedback, we will assist with an exchange right away.' }),
  mediaUrls: mediaUrlList(6).describe('Image or video URLs attached to this reply'),
};

export const CreateReviewReplySchema = z.object(createReviewReplyFields).strict();

export type CreateReviewReplyInput = z.infer<typeof CreateReviewReplySchema>;

const adminModerateReviewVisibilityFields = {
  isHidden: z
    .boolean()
    .describe('true = hide violating negative review/reply, false = unhide')
    .meta({ example: true }),
  reason: nullAsAbsent(
    z.string().max(1000).meta({ example: 'Content contains offensive or inappropriate language.' }),
  ),
  pointsToDeduct: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(0)
      .describe('Reputation points to deduct from the author when hiding (defaults to 0)')
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
  title: z.string().trim().min(5).max(150).meta({ example: 'Product does not match description' }),
  description: z
    .string()
    .trim()
    .min(10)
    .max(5000)
    .meta({ example: 'Detailed description of the policy violation to investigate.' }),
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
      .describe('Filter by star rating (1 - 5); omit to return all reviews')
      .meta({ example: 5 }),
  ),
  sortBy: z
    .enum(['newest', 'oldest'])
    .describe('Sort reviews by newest or oldest')
    .default('newest'),
};

export const FeedbackPageSchema = z.object(feedbackPageFields).strict();

export type FeedbackPageInput = z.infer<typeof FeedbackPageSchema>;

const adminDeleteReviewFields = {
  reason: z
    .string()
    .min(5)
    .max(1000)
    .meta({ example: 'Review contains profanity or harassment toward the seller' }),
  pointsToDeduct: z
    .number()
    .int()
    .min(1)
    .describe('Reputation points to deduct from the reviewer')
    .meta({ example: 10 }),
};

export const AdminDeleteReviewSchema = z.object(adminDeleteReviewFields).strict();

export type AdminDeleteReviewInput = z.infer<typeof AdminDeleteReviewSchema>;

const queryAdminReviewsFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: nullAsAbsent(z.string()),
  search: nullAsAbsent(z.string().describe('Search keyword in review comments')),
  rating: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .describe('Filter by star rating (1 - 5); omit to return all'),
  ),
  sortBy: z
    .enum(['newest', 'oldest'])
    .describe('Sort reviews by newest or oldest')
    .default('newest'),
};

export const QueryAdminReviewsSchema = z.object(queryAdminReviewsFields).strict();

export type QueryAdminReviewsInput = z.infer<typeof QueryAdminReviewsSchema>;
