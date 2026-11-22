import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';
import { resolveAuctionImageUrl, type AdminAuctionEntity } from '../../../services/auction.service';
import { getStoredToken } from '../../../services/auth';
import { useToast } from '../../ToastNotification';
import { auctionBannerReason, promoteAuctionBanner } from './auctionBannerPromotion';

export default function PromoteAuctionDialog({
  auction,
  onClose,
  onPromoted,
}: {
  auction: AdminAuctionEntity;
  onClose: () => void;
  onPromoted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const active = useRef(false);
  const toast = useToast();
  const reason = auctionBannerReason(auction);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function confirm() {
    if (lock.current || reason) return;
    lock.current = true;
    setSaving(true);
    setError('');
    const token = getStoredToken();
    try {
      const result = await promoteAuctionBanner(auction);
      if (active.current && token === getStoredToken()) {
        toast.success(
          result.created
            ? 'Đã đưa phiên đấu giá lên banner theo lịch hiển thị.'
            : 'Phiên đấu giá đã có banner.',
        );
        onPromoted();
      }
    } catch (cause) {
      if (active.current && token === getStoredToken())
        setError(cause instanceof Error ? cause.message : 'Không thể đưa phiên lên banner.');
    } finally {
      lock.current = false;
      if (active.current) setSaving(false);
    }
  }
  return (
    <Popup
      isOpen
      title="Đưa phiên đấu giá lên banner"
      onClose={() => {
        if (!lock.current) onClose();
      }}
      closeOnOverlay={!saving}
      closeOnEsc={!saving}
      showCloseButton={!saving}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Hủy
          </Button>
          <Button disabled={saving || !!reason} onClick={() => void confirm()}>
            {saving ? 'Đang đưa lên…' : 'Xác nhận đưa lên banner'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-600">
        {auction.imageUrl && (
          <img
            src={resolveAuctionImageUrl(auction.imageUrl)}
            alt={auction.title}
            className="max-h-48 w-full rounded-lg bg-slate-50 object-contain"
          />
        )}
        <p>
          Bạn muốn đưa phiên <strong className="text-slate-900">{auction.title}</strong> lên banner
          trang chủ?
        </p>
        <p>Banner sử dụng tên và ảnh của phiên. Người xem bấm banner sẽ mở đúng phiên đấu giá.</p>
        <dl className="space-y-2 rounded-lg bg-blue-50 p-3">
          <div>
            <dt className="font-medium">Bắt đầu hiển thị</dt>
            <dd>
              {new Date(auction.consignmentDeadline || auction.startTime).toLocaleString('vi-VN')}
            </dd>
          </div>
          <div>
            <dt className="font-medium">Kết thúc hiển thị</dt>
            <dd>{new Date(auction.endTime).toLocaleString('vi-VN')}</dd>
          </div>
        </dl>
        <Link
          to="/admin/banners"
          className="inline-block text-blue-600 hover:underline"
          onClick={(event) => {
            if (lock.current) event.preventDefault();
          }}
        >
          Quản lý banner
        </Link>
        {(error || reason) && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
            {error || reason}
          </p>
        )}
      </div>
    </Popup>
  );
}
