/**
 * Builds the existing frontend auction route for every backend entry point.
 * @param auctionId Persistent auction identifier.
 * @returns Relative destination understood by the current application router.
 */
export function auctionTargetUrl(auctionId: string): string {
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
