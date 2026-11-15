type AuctionRealtimeUpdate =
  { kind: 'connection'; connected: boolean } | { kind: 'auction'; auctionId: string };

const listeners = new Set<(event: AuctionRealtimeUpdate) => void>();
let notificationConnected = false;

export function adminNotificationIsConnected() {
  return notificationConnected;
}

export function setAdminNotificationConnection(connected: boolean) {
  if (notificationConnected === connected) return;
  notificationConnected = connected;
  listeners.forEach((listener) => listener({ kind: 'connection', connected }));
}

export function publishAdminAuctionNotification(payload: {
  auctionId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const auctionId = payload.auctionId ?? payload.metadata?.auctionId;
  if (typeof auctionId !== 'string' || !auctionId) return;
  listeners.forEach((listener) => listener({ kind: 'auction', auctionId }));
}

export function subscribeAdminAuctionUpdates(listener: (event: AuctionRealtimeUpdate) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
