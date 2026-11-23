import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuctionStatus, Role } from '@nexus/types';
import { Gavel, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createAuctionSocket, getAuctionsApi } from '../../services/auction.service';
import { useToast } from '../ToastNotification';

/**
 * Payload representing an active live auction floating alert banner.
 */
interface AuctionLiveAlert {
  auctionId: string;
  title: string;
}

/**
 * Shows real-time auction lifecycle alerts for the current session.
 * The server broadcasts `auction:started` to connected clients; subscribing to
 * the auction room afterwards also lets the current viewer receive `auction:ended`.
 *
 * @returns Floating live auction alert banner or null when inactive.
 */
export default function AuctionLifecycleNotifier(): React.ReactElement | null {
  const { t } = useTranslation('auction');
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeAlert, setActiveAlert] = useState<AuctionLiveAlert | null>(null);
  const handledStarts = useRef(new Set<string>());
  const joinedAuctions = useRef(new Set<string>());
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
    setActiveAlert((curr) =>
      curr && location.pathname.includes(`/auction/${curr.auctionId}`) ? null : curr,
    );
  }, [location.pathname]);

  useEffect(() => {
    const connection = createAuctionSocket();
    const role = user?.role;
    let active = true;

    const joinAuctionRoom = (auctionId: string): void => {
      if (!auctionId || joinedAuctions.current.has(auctionId)) return;
      joinedAuctions.current.add(auctionId);
      connection.joinRoom(auctionId);
    };

    void Promise.all([
      getAuctionsApi({ status: AuctionStatus.ACTIVE, page: 1, limit: 100 }),
      getAuctionsApi({ status: AuctionStatus.EXTENDED, page: 1, limit: 100 }),
    ])
      .then((responses) => {
        if (!active) return;
        responses
          .flatMap((response) => response.items)
          .forEach((auction) => joinAuctionRoom(auction.id));
      })
      .catch(() => undefined);

    connection.onAuctionStarted((event) => {
      if (handledStarts.current.has(event.auctionId)) return;
      handledStarts.current.add(event.auctionId);
      joinAuctionRoom(event.auctionId);

      const isCurrentAuctionPage = pathnameRef.current.includes(`/auction/${event.auctionId}`);
      if (!isCurrentAuctionPage) {
        setActiveAlert({ auctionId: event.auctionId, title: event.title });
        setTimeout(() => {
          setActiveAlert((curr) => (curr?.auctionId === event.auctionId ? null : curr));
        }, 12000);
      }

      if (role === Role.ADMIN) {
        toast.success(t('notifier.adminStarted', { title: event.title }), {
          targetUrl: `/admin/auctions`,
          actionLabel: t('notifier.adminAction'),
        });
      } else if (role === Role.SUPPORT_STAFF) {
        toast.success(t('notifier.staffStarted', { title: event.title }), {
          targetUrl: `/staff/auction-support`,
          actionLabel: t('notifier.staffAction'),
        });
      } else if (role === Role.SELLER || user?.isSellerActive) {
        toast.success(t('notifier.sellerStarted', { title: event.title }), {
          targetUrl: `/seller/auctions/${event.auctionId}`,
          actionLabel: t('notifier.sellerAction'),
        });
      } else {
        toast.success(t('notifier.buyerStarted', { title: event.title }), {
          targetUrl: `/auction/${event.auctionId}`,
          actionLabel: t('notifier.buyerAction'),
        });
      }
    });

    connection.socket.on(
      'auction:ended',
      (event: { auctionId: string; winningBidderId?: string | null }) => {
        if (!joinedAuctions.current.has(event.auctionId)) return;
        joinedAuctions.current.delete(event.auctionId);
        connection.leaveRoom(event.auctionId);

        setActiveAlert((curr) => (curr?.auctionId === event.auctionId ? null : curr));

        if (user && event.winningBidderId === user.id) {
          toast.success(t('notifier.endedWinner'), {
            targetUrl: `/auction/${event.auctionId}`,
            actionLabel: t('notifier.viewDetails'),
          });
        } else if (role === Role.SELLER || user?.isSellerActive) {
          toast.success(t('notifier.endedSeller'), {
            targetUrl: `/seller/auctions/${event.auctionId}`,
            actionLabel: t('notifier.viewResults'),
          });
        } else {
          toast.success(t('notifier.endedViewer'), {
            targetUrl: `/auction/${event.auctionId}`,
            actionLabel: t('notifier.viewResults'),
          });
        }
      },
    );

    return () => {
      active = false;
      joinedAuctions.current.forEach((auctionId) => connection.leaveRoom(auctionId));
      joinedAuctions.current.clear();
      connection.disconnect();
    };
  }, [toast, user, t]);

  if (!activeAlert) return null;

  return (
    <aside
      aria-label={t('notifier.bannerAria')}
      className="fixed bottom-6 right-6 z-[2600] flex w-[calc(100vw-2rem)] max-w-md items-center gap-3.5 rounded-2xl border border-amber-400/50 bg-slate-950/95 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-md animate-fade-in"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-md">
        <Gavel size={22} className="text-slate-950" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
            {t('notifier.liveBadge')}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs font-bold text-slate-100" title={activeAlert.title}>
          {activeAlert.title}
        </p>
        <p className="text-[11px] text-slate-400">{t('notifier.bannerDesc')}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            navigate(`/auction/${activeAlert.auctionId}`);
            setActiveAlert(null);
          }}
          className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-3 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:from-amber-400 hover:to-amber-300 cursor-pointer"
        >
          <span>{t('notifier.enterRoom')}</span>
          <ArrowRight size={13} />
        </button>

        <button
          type="button"
          onClick={() => setActiveAlert(null)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
          title={t('notifier.dismissTitle')}
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  );
}
