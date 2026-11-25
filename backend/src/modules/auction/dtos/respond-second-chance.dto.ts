import { z } from 'zod';

/**
 * Data transfer object for a second-chance bidder to confirm or decline an auction purchase invitation.
 */
const respondSecondChanceFields = {
  accept: z
    .boolean()
    .describe('True to accept the purchase offer, false to decline')
    .meta({ example: true }),
};

export const RespondSecondChanceSchema = z.object(respondSecondChanceFields).strict();

export type RespondSecondChanceInput = z.infer<typeof RespondSecondChanceSchema>;
