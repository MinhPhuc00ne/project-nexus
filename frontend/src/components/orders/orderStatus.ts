import { OrderStatus } from '@nexus/types';

/**
 * How an order's state is named, and where the two vocabularies meet.
 *
 * The backend's terminal state for a delivered-and-accepted order is
 * `CONFIRMED`. The buyer's orders page shows a tab called "Completed" and uses
 * `COMPLETED` as its key, translating `CONFIRMED` into it on the way in — a
 * reasonable choice for a label, but it left a word in the code that no API
 * response ever carries.
 *
 * The buyer dashboard then filtered raw API orders with `status !== 'COMPLETED'`
 * to count what was still in progress. That is never false, so a buyer with
 * nothing outstanding was told every order they had ever placed was still
 * active.
 *
 * These helpers keep the two vocabularies apart: `isOrderFinished` asks about
 * what the API sent, `toOrderTab` translates for display.
 */

/** Backend states in which an order needs nothing further from anyone. */
const FINISHED_STATUSES: readonly string[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
];

/**
 * Whether an order is over, as the API describes it.
 *
 * @param status - The status exactly as the API sent it.
 * @returns True when the order is settled, cancelled or refunded.
 */
export function isOrderFinished(status: string | null | undefined): boolean {
  return status ? FINISHED_STATUSES.includes(status) : false;
}

/**
 * Whether an order is still moving and may need the buyer's attention.
 *
 * @param status - The status exactly as the API sent it.
 * @returns True for anything from awaiting payment to delivered.
 */
export function isOrderActive(status: string | null | undefined): boolean {
  return !isOrderFinished(status);
}

/**
 * Translates an API status into the orders page's tab vocabulary.
 *
 * @param status - The status exactly as the API sent it.
 * @returns The tab key that status belongs under.
 */
export function toOrderTab(status: string | null | undefined): string {
  if (status === OrderStatus.CONFIRMED) return 'COMPLETED';
  return status ?? OrderStatus.PENDING_PAYMENT;
}
