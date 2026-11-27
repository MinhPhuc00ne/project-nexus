import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WS_AUCTION_EVENTS, type WsTimerSyncPayload } from '@nexus/contracts';
import { useAuth } from '../../../contexts/AuthContext';
import { canEndAuctionLot } from '@/features/admin/types/admin-auction-operations.types';
import { adminNotificationIsConnected, subscribeAdminAuctionUpdates } from './adminAuctionRealtime';
import {
  adminEndAuctionLotApi,
  createAuctionSocket,
  getAdminAuctionLotsApi,
  type AdminAuctionLotsResponse,
} from '@/features/auction/services/auction.service';

export function useAdminAuctionLots(auctionId: string) {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const [data, setData] = useState<AdminAuctionLotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [operationsRevision, setOperationsRevision] = useState(0);
  const [notificationConnected, setNotificationConnected] = useState(adminNotificationIsConnected);
  const [connected, setConnected] = useState(false);
  const [realtimeError, setRealtimeError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const busy = useRef(false);
  const session = useRef({ auctionId, token, active: false });

  useEffect(() => {
    const current = { auctionId, token, active: true };
    session.current = current;
    setData(null);
    setActionError('');
    setNotice('');
    setPendingId(null);
    setConnected(false);
    setRealtimeError('');
    return () => {
      current.active = false;
    };
  }, [auctionId, token]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void getAdminAuctionLotsApi(auctionId)
      .then((result) => {
        if (!active) return;
        if (!Array.isArray(result.lots)) throw new Error(t('auctions.lotsPage.invalidDataError'));
        setData(result);
        const serverTime = new Date(result.serverTime ?? '').getTime();
        setClockOffset(Number.isFinite(serverTime) ? serverTime - Date.now() : 0);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : t('auctions.lotsPage.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auctionId, token, revision, t]);

  useEffect(() => {
    if (!token) return;
    const connection = createAuctionSocket();
    const socket = connection.socket;
    let active = true;
    let joined = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshOperations = false;
    const refresh = (event: { auctionId: string }, operations = false) => {
      if (event.auctionId !== auctionId) return;
      refreshOperations ||= operations;
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        if (active) {
          setRevision((value) => value + 1);
          if (refreshOperations) setOperationsRevision((value) => value + 1);
        }
        refreshOperations = false;
      }, 400);
    };
    const onOperationUpdate = (event: { auctionId: string }) => refresh(event, true);
    const onConnect = () => {
      joined = false;
      setRealtimeError('');
      connection.joinRoom(auctionId);
      refresh({ auctionId }, true);
    };
    const onJoined = (event: { auctionId: string }) => {
      if (event.auctionId === auctionId) {
        joined = true;
        setConnected(true);
      }
    };
    const onDisconnect = () => {
      joined = false;
      setConnected(false);
    };
    const onSocketError = (event: { message?: string }) => {
      onDisconnect();
      setRealtimeError(event.message || t('auctions.lotsPage.realtimeError'));
    };
    const onTimer = (event: WsTimerSyncPayload) => {
      if (event.auctionId !== auctionId) return;
      const clock = event.lotTimers?.find((timer) => timer.remainingSeconds > 0);
      if (clock) {
        const time = new Date(clock.endTime).getTime() - clock.remainingSeconds * 1000;
        if (Number.isFinite(time)) setClockOffset(time - Date.now());
      }
      setData((current) =>
        current
          ? {
              ...current,
              status: event.status,
              endTime: event.endTime,
              lots: current.lots.map((lot) => {
                const timer = event.lotTimers?.find((item) => item.auctionItemId === lot.id);
                return timer
                  ? {
                      ...lot,
                      lotStatus: timer.status,
                      endTime: timer.endTime,
                      isExtended: timer.isExtended,
                    }
                  : lot;
              }),
            }
          : current,
      );
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    socket.on(WS_AUCTION_EVENTS.SERVER.ROOM_JOINED, onJoined);
    socket.on(WS_AUCTION_EVENTS.SERVER.ERROR, onSocketError);
    socket.on(WS_AUCTION_EVENTS.SERVER.BID_PLACED, refresh);
    socket.on(WS_AUCTION_EVENTS.SERVER.TIME_EXTENDED, refresh);
    socket.on(WS_AUCTION_EVENTS.SERVER.AUCTION_STARTED, refresh);
    socket.on(WS_AUCTION_EVENTS.SERVER.LOT_ENDED, onOperationUpdate);
    socket.on(WS_AUCTION_EVENTS.SERVER.AUCTION_ENDED, onOperationUpdate);
    socket.on(WS_AUCTION_EVENTS.SERVER.TIMER_SYNC, onTimer);
    if (socket.connected) onConnect();
    setNotificationConnected(adminNotificationIsConnected());
    const unsubscribeNotifications = subscribeAdminAuctionUpdates((event) => {
      if (event.kind === 'connection') {
        setNotificationConnected(event.connected);
        if (event.connected) onOperationUpdate({ auctionId });
      } else onOperationUpdate(event);
    });
    const onFocus = () => {
      if (document.visibilityState === 'visible') onOperationUpdate({ auctionId });
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    // Keep the page usable while the realtime connection is unavailable.
    const fallback = setInterval(() => {
      if (!joined) refresh({ auctionId });
    }, 15_000);
    return () => {
      active = false;
      clearInterval(fallback);
      clearTimeout(refreshTimer);
      unsubscribeNotifications();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      socket.removeAllListeners();
      connection.disconnect();
    };
  }, [auctionId, token]);

  async function endLot(itemId: string): Promise<boolean> {
    if (busy.current || !session.current.active) return false;
    const lot = data?.lots.find((item) => item.id === itemId);
    if (!lot || !canEndAuctionLot(lot)) {
      setActionError(t('auctions.lotsPage.invalidLotActionError'));
      return false;
    }
    const current = session.current;
    busy.current = true;
    setPendingId(itemId);
    setActionError('');
    setNotice('');
    try {
      await adminEndAuctionLotApi(auctionId, itemId);
      if (!current.active) return false;
      setNotice(t('auctions.lotsPage.endLotNotice'));
      setRevision((value) => value + 1);
      setOperationsRevision((value) => value + 1);
      return true;
    } catch (cause) {
      if (current.active) {
        setActionError(
          `${cause instanceof Error ? cause.message : t('auctions.lotsPage.endLotError')} ${t('auctions.lotsPage.retryRefreshSuffix')}`,
        );
        setRevision((value) => value + 1);
        setOperationsRevision((value) => value + 1);
      }
      return false;
    } finally {
      busy.current = false;
      if (current.active) setPendingId(null);
    }
  }

  return {
    data,
    loading,
    error,
    actionError,
    notice,
    connected,
    realtimeError,
    refreshKey: operationsRevision,
    operationsConnected: connected && notificationConnected,
    pendingId,
    clockOffset,
    endLot,
    refresh: () => {
      setRevision((value) => value + 1);
      setOperationsRevision((value) => value + 1);
    },
  };
}
