import { z } from 'zod';

const rejectSellerRequestFields = {
  rejectionReason: z
    .string()
    .trim()
    .min(1)
    .describe('Reason for rejecting the seller upgrade request')
    .meta({ example: 'Identity document name does not match the registered account name.' }),
};

export const RejectSellerRequestSchema = z.object(rejectSellerRequestFields).strict();

export type RejectSellerRequestInput = z.infer<typeof RejectSellerRequestSchema>;
