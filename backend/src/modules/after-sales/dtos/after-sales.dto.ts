import { AfterSalesStatus, RefundStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * What every after-sales request carries: why, and what proves it.
 *
 * These were classes, and the three requests that add a field to them did so by
 * `extends`, which `class-validator` understood but TypeScript's declared types
 * and the OpenAPI output each understood differently. Here the shared fields are
 * a plain object spread into each schema, so what a request accepts is visible
 * in one place without a class hierarchy.
 */
const afterSalesRequestFields = {
  /** Why the buyer or seller is asking. Trimmed, because a reason of spaces is no reason. */
  reason: z.string().trim().min(1).max(2000),

  /** Explicit consent to refund an external payment into the NEXUS wallet instead. */
  refundToWallet: z.boolean().optional(),

  /**
   * Photographs or documents backing the request.
   *
   * Only https, and at most ten: these are rendered to staff and to the other
   * party, so a plaintext URL would be a mixed-content warning at best and a
   * way to point moderators at an attacker's host at worst.
   */
  evidenceUrls: z
    .array(z.url({ protocol: /^https$/ }))
    .max(10)
    .optional(),
};

export const AfterSalesRequestSchema = z.object(afterSalesRequestFields).strict();

/** A seller's or staff decision on a return request. */
export const ReviewReturnSchema = z
  .object({
    ...afterSalesRequestFields,
    decision: z.enum(['APPROVE', 'REJECT']),
  })
  .strict();

/** A cancellation, optionally saying who caused it. */
export const CancelOrderSchema = z
  .object({
    ...afterSalesRequestFields,
    reasonCode: z.enum(['BUYER_REQUEST', 'STOCKOUT', 'SELLER_FAULT', 'OTHER']).optional(),
  })
  .strict();

/** The waybill for a separate buyer-to-seller return shipment. */
export const ReturnWaybillSchema = z
  .object({
    waybillCode: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .describe('GHN waybill for a separate buyer-to-seller return shipment'),
  })
  .strict();

/** Taking a return back into stock, or not. */
export const ReceiveReturnSchema = z
  .object({
    ...afterSalesRequestFields,
    restock: z
      .boolean()
      .describe('Only true if all returned items passed inspection and can be sold again'),
  })
  .strict();

/**
 * Closing a refund with the reference that proves the money moved.
 *
 * The reference is required and trimmed: cancelling a payment link is not a
 * refund, so a blank or whitespace reference must not close one.
 */
export const CompleteRefundSchema = z
  .object({
    externalReference: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe(
        'Verified bank/provider refund reference; cancelling a payment link is not a refund',
      ),
  })
  .strict();

/** Page and size for the after-sales lists, with the defaults the DTO carried. */
const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const AfterSalesPageSchema = z.object(pageFields).strict();

export const QueryAfterSalesSchema = z
  .object({
    ...pageFields,
    status: z.enum(AfterSalesStatus).optional(),
  })
  .strict();

export const QueryRefundsSchema = z
  .object({
    ...pageFields,
    status: z.enum(RefundStatus).default(RefundStatus.PENDING),
  })
  .strict();

export type AfterSalesRequestInput = z.infer<typeof AfterSalesRequestSchema>;
export type ReviewReturnInput = z.infer<typeof ReviewReturnSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
export type ReturnWaybillInput = z.infer<typeof ReturnWaybillSchema>;
export type ReceiveReturnInput = z.infer<typeof ReceiveReturnSchema>;
export type CompleteRefundInput = z.infer<typeof CompleteRefundSchema>;
export type AfterSalesPageInput = z.infer<typeof AfterSalesPageSchema>;
export type QueryAfterSalesInput = z.infer<typeof QueryAfterSalesSchema>;
export type QueryRefundsInput = z.infer<typeof QueryRefundsSchema>;
