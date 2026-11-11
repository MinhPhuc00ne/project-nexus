import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getAdminShopById } from '../../../services/admin';
import type { AdminShopDetail } from '../../../types/admin.types';
import { Badge, Button } from '../shared/AdminUI';

const statusLabels = {
  ACTIVE: 'Đang mở bán',
  SUSPENDED: 'Đang đình chỉ',
  INACTIVE: 'Ngừng hoạt động',
};

export default function UserShopSummary({
  userId,
  onView,
}: {
  userId: string;
  onView: () => void;
}) {
  const { token } = useAuth();
  const [shop, setShop] = useState<AdminShopDetail['shop'] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setShop(null);
    setError('');
    void getAdminShopById(userId, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) setShop(detail.shop);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Không thể tải thông tin cửa hàng.');
        }
      });
    return () => controller.abort();
  }, [userId, token, revision]);

  return (
    <section aria-label="Cửa hàng" className="border-t border-slate-100 pt-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
        <Store size={17} aria-hidden="true" /> Cửa hàng
      </h3>
      {error ? (
        <div role="alert" className="space-y-3 text-sm text-red-600">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </Button>
        </div>
      ) : shop ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <div className="min-w-0 space-y-2">
            <p className="break-words text-sm font-semibold text-slate-900">{shop.storeName}</p>
            <Badge
              tone={
                shop.status.currentStatus === 'ACTIVE'
                  ? 'green'
                  : shop.status.currentStatus === 'SUSPENDED'
                    ? 'red'
                    : 'gray'
              }
            >
              {statusLabels[shop.status.currentStatus]}
            </Badge>
          </div>
          <Button variant="secondary" onClick={onView}>
            Xem chi tiết cửa hàng
          </Button>
        </div>
      ) : (
        <p role="status" className="text-sm text-slate-500">
          Đang tải thông tin cửa hàng…
        </p>
      )}
    </section>
  );
}
