import { Role } from '@nexus/types';

/**
 * Builds the existing frontend auction route for every backend entry point.
 * @param auctionId Persistent auction identifier.
 * @returns Relative destination understood by the current application router.
 */
export function auctionTargetUrl(auctionId: string): string {
  return `/auction/${encodeURIComponent(auctionId)}`;
}

/**
 * Builds the destination auction route tailored to the specific user role.
 * Sellers are directed to their dedicated seller view, support staff to their support queue,
 * and buyers/guests to the public bidding page.
 *
 * @param auctionId Persistent auction identifier.
 * @param role Authenticated role of the user.
 * @param isSellerActive Whether the user has an active seller shop profile.
 * @returns Relative destination URL.
 */
export function auctionTargetUrlForRole(
  auctionId: string,
  role?: Role | string,
  isSellerActive?: boolean,
): string {
  if (role === Role.SELLER || isSellerActive) {
    return `/seller/auctions/${encodeURIComponent(auctionId)}`;
  }
  if (role === Role.SUPPORT_STAFF) {
    return `/staff/auction-support?auctionId=${encodeURIComponent(auctionId)}`;
  }
  return `/auction/${encodeURIComponent(auctionId)}`;
}

/**
 * Recognizes relative auction destinations when a banner is edited using a previous API response.
 * @param value Candidate relative route.
 * @returns Whether the route contains one UUID auction identifier and no other destination.
 */
export function isAuctionTargetUrl(value: string): boolean {
  return /^\/auction\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value);
}
