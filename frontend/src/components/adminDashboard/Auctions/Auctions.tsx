import { useEffect, useState } from 'react';
import { Film, Gavel, LockKeyhole, Play, Plus, RefreshCw, Square } from 'lucide-react';
import { AuctionStatus } from '@nexus/types';
import { useAuth } from '../../../contexts/AuthContext';
import {
  adminStartAuctionApi,
  adminLockConsignmentApi,
  endAuctionApi,
  getAdminAuctionItemsApi,
  getAdminAuctionsApi,
  resolveAuctionImageUrl,
  type AdminAuctionListResponse,
  type AdminAuctionEntity,
  type AuctionConsignmentItem,
} from '../../../services/auction.service';
import { useToast } from '../../ToastNotification';
import Popup from '../../Popup';
import { AuctionShowcaseHUD } from '../../auction/showcase/AuctionShowcaseHUD';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import CreateAuctionDialog from './CreateAuctionDialog';
import AuctionItemsDialog from './AuctionItemsDialog';

const statuses = [
  ['SCHEDULED', 'Đã lên lịch'],
  ['ACTIVE', 'Đang diễn ra'],
  ['EXTENDED', 'Đang gia hạn'],
  ['ENDED', 'Đã kết thúc'],
  ['FAILED', 'Không thành công'],
  ['CANCELLED', 'Đã hủy'],
  ['DRAFT', 'Bản nháp'],
] as const;

export default function AdminAuctionsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AdminAuctionListResponse | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<AdminAuctionEntity | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [lockingAuction, setLockingAuction] = useState<AdminAuctionEntity | null>(null);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState('');
  const [showcaseState, setShowcaseState] = useState<{
    auctionId: string;
    title: string;
    description?: string;
    items: AuctionConsignmentItem[];
    playbackMode: 'live' | 'admin-replay';
  } | null>(null);

  async function openShowcaseForAuction(item: AdminAuctionEntity) {
    try {
      const itemsRes = await getAdminAuctionItemsApi(item.id);
      const approvedItems: AuctionConsignmentItem[] = itemsRes.items
        .filter((lot) => lot.status === 'APPROVED')
        .sort((a, b) => (a.lotNumber ?? 999) - (b.lotNumber ?? 999))
        .map((lot) => ({
          id: lot.id,
          title: lot.title,
          description: lot.description,
          images: lot.images,
          threeModelKey: lot.threeModelKey,
          appraisalCertificateNumber: lot.appraisalCertificateNumber,
          appraisalAgency: lot.appraisalAgency,
          certificateImages: lot.certificateImages,
          certificateIssueDate: lot.certificateIssueDate,
          status: lot.status,
          lotNumber: lot.lotNumber,
          startingPrice: lot.startingPrice
            ? Number(lot.startingPrice)
            : Number(lot.proposedStartingPrice),
          proposedStartingPrice: Number(lot.proposedStartingPrice),
          reservePrice: lot.reservePrice
            ? Number(lot.reservePrice)
            : lot.proposedReservePrice
              ? Number(lot.proposedReservePrice)
              : null,
          proposedReservePrice: lot.proposedReservePrice ? Number(lot.proposedReservePrice) : null,
          bidIncrement: lot.bidIncrement
            ? Number(lot.bidIncrement)
            : Number(lot.proposedBidIncrement),
          proposedBidIncrement: Number(lot.proposedBidIncrement),
          seller: lot.seller,
        }));

      const legacyProductFallback: AuctionConsignmentItem[] =
        approvedItems.length === 0 && item.product
          ? [
              {
                id: item.product.id,
                title: item.product.title,
                description: item.description,
                images: item.imageUrl ? [item.imageUrl] : [],
                threeModelKey: item.product.threeModelKey,
                lotNumber: 1,
                startingPrice: Number(item.startingPrice ?? 0),
                bidIncrement: 0,
                seller: item.seller ?? undefined,
              },
            ]
          : approvedItems;

      setShowcaseState({
        auctionId: item.id,
        title: item.title,
        description: item.description,
        items: legacyProductFallback,
        playbackMode: 'admin-replay',
      });
    } catch {
      setShowcaseState({
        auctionId: item.id,
        title: item.title,
        description: item.description,
        items: [],
        playbackMode: 'admin-replay',
      });
    }
  }

  async function handleLockConsignment() {
    if (!lockingAuction || locking || startingId) return;
    setLocking(true);
    setLockError('');
    try {
      const updated = await adminLockConsignmentApi(lockingAuction.id);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((row) =>
                row.id === updated.id ? { ...row, ...updated } : row,
              ),
            }
          : current,
      );
      setLockingAuction(null);
      toast.success('Đã chốt ký gửi phiên đấu giá.');
    } catch (cause: unknown) {
      setLockError(cause instanceof Error ? cause.message : 'Không thể chốt ký gửi.');
    } finally {
      setLocking(false);
    }
  }

  async function handleStartAuction(item: AdminAuctionEntity) {
    if (startingId) return;
    setStartingId(item.id);
    try {
      const started = await adminStartAuctionApi(item.id);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((row) =>
                row.id === item.id ? { ...row, status: AuctionStatus.ACTIVE } : row,
              ),
            }
          : current,
      );
      toast.success(`Đã mở phiên "${item.title}" & phát sóng video giới thiệu trực tiếp!`);
      setShowcaseState({
        auctionId: started.id,
        title: started.title,
        description: started.description,
        items: started.items ?? [],
        playbackMode: 'live',
      });
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : 'Không thể bắt đầu phiên đấu giá.');
    } finally {
      setStartingId(null);
    }
  }

  async function handleEndAuction(id: string) {
    if (startingId) return;
    setStartingId(id);
    try {
      await endAuctionApi(id);
      toast.success('Đã kết thúc phiên đấu giá.');
      setRevision((value) => value + 1);
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : 'Không thể kết thúc phiên đấu giá.');
    } finally {
      setStartingId(null);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    void getAdminAuctionsApi({
      page,
      limit: 10,
      search: keyword,
      status: (status || undefined) as AuctionStatus | undefined,
    })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Không thể tải phiên đấu giá.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, page, keyword, status, revision]);

  return (
    <Panel
      title="Quản lí đấu giá"
      subtitle="Tạo phiên, thiết lập thời gian và điều kiện uy tín cho người tham gia."
      icon={<Gavel size={19} />}
      action={
        <Button onClick={() => setCreating(true)}>
          <Plus size={15} />
          Tạo phiên đấu giá
        </Button>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-full sm:max-w-sm">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên phiên đấu giá..."
          />
        </div>
        <select
          aria-label="Trạng thái phiên đấu giá"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
        >
          <option value="">Tất cả trạng thái</option>
          {statuses.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={14} />
          Làm mới
        </Button>
      </div>
      {loading && (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Đang tải phiên đấu giá…
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </Button>
        </div>
      )}
      {!loading &&
        data &&
        (data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-blue-50 text-slate-500">
                  <tr>
                    {[
                      'Phiên đấu giá',
                      'Bắt đầu',
                      'Kết thúc',
                      'Điểm uy tín tối thiểu',
                      'Lượt trả giá',
                      'Trạng thái',
                      'Sản phẩm',
                      'Thao tác',
                    ].map((label) => (
                      <th key={label} className="p-4 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td className="max-w-72 p-4">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            aria-label={`Xem video 3D phiên ${item.title}`}
                            title="Xem video 3D"
                            onClick={() => void openShowcaseForAuction(item)}
                            className="group relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-blue-50 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            {item.imageUrl ? (
                              <img
                                src={resolveAuctionImageUrl(item.imageUrl)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Gavel size={20} aria-hidden="true" />
                            )}
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                              <Film size={22} aria-hidden="true" />
                            </span>
                          </button>
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-slate-500">
                              Người tạo:{' '}
                              {item.createdByAdmin?.fullName || item.seller?.fullName || '—'}
                            </p>
                          </div>
                        </div>
                        {item.product && (
                          <div className="mt-3 space-y-1 rounded-lg bg-blue-50 p-3">
                            <p className="font-medium text-slate-800">
                              Sản phẩm: {item.product.title}
                            </p>
                            <p className="text-slate-500">Seller: {item.seller?.fullName || '—'}</p>
                            <p className="text-primary">
                              Khởi điểm: {Number(item.startingPrice).toLocaleString('vi-VN')} ₫
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-4">
                        {new Date(item.startTime).toLocaleString('vi-VN')}
                      </td>
                      <td className="whitespace-nowrap p-4">
                        {new Date(item.endTime).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4">
                        <p>Buyer: {item.minBuyerReputation}</p>
                        <p className="mt-1">Seller: {item.minSellerReputation}</p>
                      </td>
                      <td className="p-4">{item.totalBidsCount}</td>
                      <td className="w-px whitespace-nowrap p-4 align-middle [&>span]:w-max [&>span]:leading-none">
                        <Badge
                          tone={
                            item.status === 'ACTIVE' || item.status === 'EXTENDED'
                              ? 'green'
                              : 'blue'
                          }
                        >
                          {statuses.find(([value]) => value === item.status)?.[1] || item.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button variant="secondary" onClick={() => setSelectedAuction(item)}>
                          Xem sản phẩm ({item._count?.items ?? 0})
                        </Button>
                      </td>
                      <td className="p-4">
                        <div className="flex w-32 flex-col items-stretch gap-2 [&>button]:whitespace-nowrap">
                          {['DRAFT', 'SCHEDULED'].includes(item.status) ? (
                            <>
                              {!item.isConsignmentLocked && (
                                <Button
                                  variant="secondary"
                                  disabled={!!startingId || locking}
                                  onClick={() => {
                                    setLockError('');
                                    setLockingAuction(item);
                                  }}
                                >
                                  <LockKeyhole size={14} />
                                  Chốt ký gửi
                                </Button>
                              )}
                              <Button
                                disabled={!!startingId || locking || !item.isConsignmentLocked}
                                title={
                                  !item.isConsignmentLocked
                                    ? 'Chốt ký gửi trước khi bắt đầu phiên'
                                    : undefined
                                }
                                onClick={() => void handleStartAuction(item)}
                              >
                                <Play size={14} />
                                {startingId === item.id ? 'Đang mở…' : 'Bắt đầu'}
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="secondary"
                              disabled={
                                !['ACTIVE', 'EXTENDED'].includes(item.status) ||
                                startingId === item.id
                              }
                              onClick={() => void handleEndAuction(item.id)}
                            >
                              <Square size={14} />
                              {['ACTIVE', 'EXTENDED'].includes(item.status)
                                ? 'Kết thúc'
                                : 'Đã đóng'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                {data.pagination.total} phiên · Trang {data.pagination.page}/
                {Math.max(1, data.pagination.totalPages)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Trước
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState text="Chưa có phiên đấu giá phù hợp." />
        ))}
      <Popup
        isOpen={!!lockingAuction}
        title="Xác nhận chốt ký gửi"
        onClose={() => {
          if (!locking) setLockingAuction(null);
        }}
        closeOnOverlay={!locking}
        closeOnEsc={!locking}
        showCloseButton={!locking}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={locking} onClick={() => setLockingAuction(null)}>
              Hủy
            </Button>
            <Button disabled={locking || !!startingId} onClick={() => void handleLockConsignment()}>
              {locking ? 'Đang chốt…' : 'Xác nhận chốt ký gửi'}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Bạn muốn chốt ký gửi phiên <strong>{lockingAuction?.title}</strong>? Sau khi chốt, seller
          sẽ không thể gửi thêm sản phẩm vào phiên. Phiên chỉ bắt đầu khi bạn bấm “Bắt đầu”.
        </p>
        {lockError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {lockError}
          </p>
        )}
      </Popup>
      {creating && (
        <CreateAuctionDialog
          key={token}
          onClose={() => setCreating(false)}
          onCreated={(auction) => {
            setCreating(false);
            setSelectedAuction(auction);
            setStatus('');
            setSearch('');
            setKeyword('');
            setPage(1);
            setRevision((value) => value + 1);
          }}
        />
      )}
      {selectedAuction && (
        <AuctionItemsDialog
          key={`${token}:${selectedAuction.id}`}
          auction={selectedAuction}
          onClose={() => setSelectedAuction(null)}
          onChanged={() => setRevision((value) => value + 1)}
        />
      )}
      {showcaseState && (
        <AuctionShowcaseHUD
          auctionTitle={showcaseState.title}
          auctionDescription={showcaseState.description}
          items={showcaseState.items}
          playbackMode={showcaseState.playbackMode}
          onComplete={() => {
            setShowcaseState(null);
            setRevision((value) => value + 1);
          }}
          onCancel={
            showcaseState.playbackMode === 'admin-replay' ? () => setShowcaseState(null) : undefined
          }
        />
      )}
    </Panel>
  );
}
