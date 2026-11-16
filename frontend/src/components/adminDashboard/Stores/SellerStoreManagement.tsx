import { useEffect, useRef, useState, type FormEvent } from 'react';
import { RefreshCw, Store } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { listAdminShops, updateAdminShopStatus, warnAdminShop } from '../../../services/admin';
import type { AdminShop, PaginatedResult, QueryAdminShopsParams } from '../../../types/admin.types';
import Popup from '../../Popup';
import { useToast } from '../../ToastNotification';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import ShopDetail from './ShopDetail';

export default function SellerStoreManagement() {
  const { token } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<QueryAdminShopsParams>({ page: 1, limit: 10 });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<PaginatedResult<AdminShop> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [target, setTarget] = useState<AdminShop | null>(null);
  const [warningTarget, setWarningTarget] = useState<AdminShop | null>(null);
  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      const value = search.trim() || undefined;
      setQuery((current) =>
        current.search === value ? current : { ...current, search: value, page: 1 },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    void listAdminShops(query, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, value.totalPages);
        if ((query.page ?? 1) > lastPage) {
          setQuery((current) => ({ ...current, page: lastPage }));
          return;
        }
        setResult(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách cửa hàng.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, revision, token]);

  return (
    <Panel
      title="Quản lý cửa hàng"
      subtitle="Xem danh sách cửa hàng, đình chỉ hoặc khôi phục hoạt động bán hàng"
      icon={<Store size={19} />}
      action={
        <Button variant="secondary" disabled={loading} onClick={refresh}>
          <RefreshCw size={14} aria-hidden="true" /> Làm mới
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm tên shop, tên chủ shop, email hoặc số điện thoại…"
          />
        </div>
        <select
          aria-label="Lọc trạng thái bán hàng"
          value={query.status ?? ''}
          onChange={(event) =>
            setQuery((current) => ({
              ...current,
              page: 1,
              status: (event.target.value || undefined) as AdminShop['status'] | undefined,
            }))
          }
          className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang mở bán</option>
          <option value="SUSPENDED">Đang ngừng bán</option>
        </select>
      </div>
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Đang tải cửa hàng…
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={refresh}>
            Thử lại
          </Button>
        </div>
      ) : (
        result && (
          <>
            {result.items.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="bg-blue-50 text-slate-500">
                    <tr>
                      {[
                        'Cửa hàng',
                        'Chủ shop',
                        'Địa chỉ',
                        'Sản phẩm',
                        'Trạng thái',
                        'Thao tác',
                      ].map((title) => (
                        <th key={title} scope="col" className="p-3 font-semibold">
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.items.map((shop) => (
                      <tr key={shop.id} className="align-top hover:bg-slate-50/70">
                        <td className="max-w-60 break-words p-3">
                          <p className="font-semibold">{shop.storeName}</p>
                          <p className="mt-1 break-all text-[10px] text-slate-400">{shop.id}</p>
                        </td>
                        <td className="max-w-56 break-words p-3">
                          <p>{shop.sellerFullName}</p>
                          <p className="mt-1 break-all text-slate-500">{shop.sellerEmail}</p>
                          <p className="mt-1 text-slate-500">
                            {shop.sellerPhone || 'Chưa có số điện thoại'}
                          </p>
                        </td>
                        <td className="max-w-60 break-words p-3">
                          {shop.address
                            ? shop.address.formattedAddress ||
                              [
                                shop.address.street,
                                shop.address.ward,
                                shop.address.district,
                                shop.address.city,
                              ]
                                .filter(Boolean)
                                .join(', ')
                            : 'Chưa có địa chỉ'}
                        </td>
                        <td className="p-3">{shop.totalProducts}</td>
                        <td className="p-3">
                          <Badge tone={shop.isSellerActive ? 'green' : 'red'}>
                            {shop.isSellerActive ? 'Đang mở bán' : 'Đang ngừng bán'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => setDetailId(shop.id)}>
                              Xem chi tiết
                            </Button>
                            <Button variant="danger" onClick={() => setWarningTarget(shop)}>
                              Cảnh báo
                            </Button>
                            <Button
                              variant={shop.isSellerActive ? 'danger' : 'primary'}
                              onClick={() => setTarget(shop)}
                            >
                              {shop.isSellerActive ? 'Đình chỉ' : 'Khôi phục'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="Không có cửa hàng phù hợp với bộ lọc." />
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                {result.total} cửa hàng · Trang {result.page}/{Math.max(1, result.totalPages)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={result.page <= 1}
                  onClick={() => setQuery((current) => ({ ...current, page: result.page - 1 }))}
                >
                  Trước
                </Button>
                <Button
                  variant="secondary"
                  disabled={result.page >= result.totalPages}
                  onClick={() => setQuery((current) => ({ ...current, page: result.page + 1 }))}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        )
      )}
      {detailId && (
        <ShopDetail
          key={detailId}
          shopId={detailId}
          onClose={() => setDetailId(null)}
          onMutation={refresh}
        />
      )}
      {target && (
        <ShopStatusDialog
          key={target.id}
          shop={target}
          onClose={() => setTarget(null)}
          onSuccess={(message) => {
            setTarget(null);
            toast.success(message);
            refresh();
          }}
        />
      )}
      {warningTarget && (
        <ShopWarningDialog
          key={warningTarget.id}
          shop={warningTarget}
          onClose={() => setWarningTarget(null)}
          onSuccess={(message) => {
            setWarningTarget(null);
            toast.success(message);
            refresh();
          }}
        />
      )}
    </Panel>
  );
}

function ShopWarningDialog({
  shop,
  onClose,
  onSuccess,
}: {
  shop: AdminShop;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [penaltyPoints, setPenaltyPoints] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  const close = () => {
    if (!inFlight.current) onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do cảnh báo.');
      return;
    }

    const points = penaltyPoints.trim() ? Number(penaltyPoints) : 0;
    if (!Number.isInteger(points) || points < 0) {
      setError('Điểm phạt phải là số nguyên không âm.');
      return;
    }

    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const result = await warnAdminShop(shop.id, {
        reason: reason.trim(),
        ...(points > 0 ? { penaltyPoints: points } : {}),
      });
      onSuccess(result.message);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể gửi cảnh báo shop.';
      setError(message);
      toast.error(message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <Popup
      isOpen
      title="Cảnh báo shop"
      onClose={close}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="break-words text-sm text-slate-600">
          Gửi cảnh báo cho <strong>{shop.storeName}</strong>?
        </p>
        <label className="block text-sm font-medium">
          Lý do cảnh báo
          <textarea
            autoFocus
            required
            maxLength={1000}
            rows={4}
            value={reason}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
            placeholder="Nêu rõ hành vi vi phạm và yêu cầu shop khắc phục"
          />
        </label>
        <label className="block text-sm font-medium">
          Điểm uy tín cần trừ (không bắt buộc)
          <input
            type="number"
            min={0}
            step={1}
            value={penaltyPoints}
            disabled={pending}
            onChange={(event) => setPenaltyPoints(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
            placeholder="0"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={pending}>
            Hủy
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? 'Đang gửi…' : 'Xác nhận cảnh báo'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}

function ShopStatusDialog({
  shop,
  onClose,
  onSuccess,
}: {
  shop: AdminShop;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const suspending = shop.isSellerActive;
  const title = suspending ? 'Đình chỉ bán hàng' : 'Khôi phục bán hàng';
  const close = () => {
    if (!inFlight.current) onClose();
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (suspending && !reason.trim()) {
      setError('Vui lòng nhập lý do đình chỉ.');
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const result = await updateAdminShopStatus(shop.id, {
        isSellerActive: !suspending,
        reason: reason.trim() || undefined,
      });
      onSuccess(result.message);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Không thể cập nhật trạng thái cửa hàng.';
      setError(message);
      toast.error(message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return (
    <Popup isOpen title={title} onClose={close} closeOnEsc={!pending} closeOnOverlay={!pending}>
      <form onSubmit={submit} className="space-y-4">
        <p className="break-words text-sm text-slate-600">
          {title} cho <strong>{shop.storeName}</strong>?
        </p>
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-slate-600">
          {suspending
            ? 'Sản phẩm đang hoạt động của shop sẽ bị ẩn. Tài khoản cá nhân vẫn có thể mua hàng.'
            : 'Shop sẽ được mở bán trở lại. Các sản phẩm đã bị ẩn cần được kích hoạt lại riêng.'}
        </p>
        <label className="block text-sm font-medium">
          {suspending ? 'Lý do đình chỉ' : 'Ghi chú (không bắt buộc)'}
          <textarea
            autoFocus
            required={suspending}
            maxLength={500}
            rows={3}
            value={reason}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={pending}>
            Hủy
          </Button>
          <Button type="submit" variant={suspending ? 'danger' : 'primary'} disabled={pending}>
            {pending ? 'Đang xử lý…' : 'Xác nhận'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
