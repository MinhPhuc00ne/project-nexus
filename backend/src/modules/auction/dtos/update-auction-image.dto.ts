import { z } from 'zod';
import { httpUrl } from '../../../core/validation/query-schemas';

/** Updates only the session image using the URL returned by the media upload API. */
const updateAuctionImageFields = {
  imageUrl: httpUrl.describe('HTTP(S) image URL returned by POST /media/upload'),
};

export const UpdateAuctionImageSchema = z.object(updateAuctionImageFields).strict();

export type UpdateAuctionImageInput = z.infer<typeof UpdateAuctionImageSchema>;
