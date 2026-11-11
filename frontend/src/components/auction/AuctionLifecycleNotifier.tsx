import { useEffect, useRef } from 'react';
import { AuctionStatus, Role } from '@nexus/types';
import { useAuth } from '../../contexts/AuthContext';
import { createAuctionSocket, getAuctionsApi } from '../../services/auction.service';
import { useToast } from '../ToastNotification';

/**
 * Shows real-time auction lifecycle alerts for the signed-in account.
 * The server broadcasts `auction:started` to connected clients; subscribing to
 * the auction room afterwards also lets the current viewer receive `auction:ended`.
 */
export default function AuctionLifecycleNotifier() {
  const { user, token } = useAuth();
  const toast = useToast();
  const handledStarts = useRef(new Set<string>());
  const joinedAuctions = useRef(new Set<string>());

  useEffect(() => {
    if (!token || !user) return;

    const connection = createAuctionSocket();
    const role = user.role;
    let active = true;

    const joinAuctionRoom = (auctionId: string): void => {
      if (!auctionId || joinedAuctions.current.has(auctionId)) return;
      joinedAuctions.current.add(auctionId);
      connection.joinRoom(auctionId);
    };

    // A user can open the app after Admin has already started an auction.
    // Join all active rooms immediately so the later `auction:ended` event is not missed.
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
      .catch(() => {
        // Live alerts remain available for auctions started after the current connection.
      });

    connection.onAuctionStarted((event) => {
      if (handledStarts.current.has(event.auctionId)) return;
      handledStarts.current.add(event.auctionId);
      joinAuctionRoom(event.auctionId);

      if (role === Role.ADMIN) {
        toast.success(`Phiên đấu giá “${event.title}” đã bắt đầu.`);
      } else if (role === Role.SUPPORT_STAFF) {
        toast.success(`Phiên “${event.title}” đã bắt đầu. Hãy theo dõi hỗ trợ phiên.`);
      } else if (role === Role.SELLER || user.isSellerActive) {
        toast.success(
          `Phiên “${event.title}” đang diễn ra. Bạn có thể theo dõi trong Seller Center.`,
        );
      } else {
        toast.success(
          `Phiên đấu giá “${event.title}” đang diễn ra. Hãy vào phòng đấu giá để đặt giá.`,
        );
      }
    });

    connection.socket.on(
      'auction:ended',
      (event: { auctionId: string; winningBidderId?: string | null }) => {
        if (!joinedAuctions.current.has(event.auctionId)) return;
        joinedAuctions.current.delete(event.auctionId);
        connection.leaveRoom(event.auctionId);

        if (event.winningBidderId === user.id) {
          toast.success('Phiên đấu giá đã kết thúc. Chúc mừng, bạn là người chiến thắng!');
        } else if (role === Role.SELLER || user.isSellerActive) {
          toast.success('Phiên đấu giá đã kết thúc. Kiểm tra kết quả trong Seller Center.');
        } else {
          toast.success('Phiên đấu giá bạn đang theo dõi đã kết thúc.');
        }
      },
    );

    return () => {
      active = false;
      joinedAuctions.current.forEach((auctionId) => connection.leaveRoom(auctionId));
      joinedAuctions.current.clear();
      connection.disconnect();
    };
  }, [token, toast, user]);

  return null;
}
