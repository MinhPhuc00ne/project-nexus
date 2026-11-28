import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

/**
 * Data transfer object used by Support Staff to attach a pre-review or live support note on a lot.
 */
const staffAuctionNoteFields = {
  staffNote: nullAsAbsent(
    z
      .string()
      .max(2000)
      .describe('Support staff inspection or live room support note')
      .meta({ example: 'Verified GIA appraisal certificate against actual lot photos.' }),
  ),
};

export const StaffAuctionNoteSchema = z.object(staffAuctionNoteFields).strict();

export type StaffAuctionNoteInput = z.infer<typeof StaffAuctionNoteSchema>;
