import { Gavel, Plus, RefreshCw } from 'lucide-react';
import Popup from '../../Popup';
import { AuctionShowcaseHUD } from '../../auction/showcase/AuctionShowcaseHUD';
import { Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import CreateAuctionDialog from './CreateAuctionDialog';
import AuctionItemsDialog from './AuctionItemsDialog';
import { useAdminAuctions } from './useAdminAuctions';
import AuctionRow from './AuctionRow';
import { statuses } from './auctionStatuses';

export default function AdminAuctionsPage() {
  const {
    token,
    data,
    status,
    setStatus,
    search,
    setSearch,
    setKeyword,
    page,
    setPage,
    setRevision,
    loading,
    error,
    creating,
    setCreating,
    selectedAuction,
    setSelectedAuction,
    startingId,
    lockingAuction,
    setLockingAuction,
    locking,
    lockError,
    setLockError,
    showcaseState,
    setShowcaseState,
    openShowcaseForAuction,
    handleLockConsignment,
    handleStartAuction,
    handleEndAuction,
  } = useAdminAuctions();
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
                    <AuctionRow
                      key={item.id}
                      item={item}
                      setSelectedAuction={setSelectedAuction}
                      startingId={startingId}
                      setLockingAuction={setLockingAuction}
                      locking={locking}
                      setLockError={setLockError}
                      openShowcaseForAuction={openShowcaseForAuction}
                      handleStartAuction={handleStartAuction}
                      handleEndAuction={handleEndAuction}
                    />
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
