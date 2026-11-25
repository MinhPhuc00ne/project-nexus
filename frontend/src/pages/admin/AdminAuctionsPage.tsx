import { useState } from 'react';
import DeleteAuctionDialog from '../../components/adminDashboard/Auctions/DeleteAuctionDialog';
import PromoteAuctionDialog from '../../components/adminDashboard/Auctions/PromoteAuctionDialog';
import useAuctionBanners from '../../components/adminDashboard/Auctions/useAuctionBanners';
import type { AdminAuctionEntity } from '../../services/auction.service';
import { Gavel, Plus, RefreshCw } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import Popup from '../../components/Popup';
import { AuctionShowcaseHUD } from '../../components/auction/showcase/AuctionShowcaseHUD';
import {
  Button,
  EmptyState,
  Panel,
  SearchInput,
} from '../../components/adminDashboard/shared/AdminUI';
import CreateAuctionDialog from '../../components/adminDashboard/Auctions/CreateAuctionDialog';
import AuctionItemsDialog from '../../components/adminDashboard/Auctions/AuctionItemsDialog';
import { useAdminAuctions } from '../../components/adminDashboard/Auctions/useAdminAuctions';
import AuctionRow from '../../components/adminDashboard/Auctions/AuctionRow';
import { AUCTION_STATUS_KEYS } from '../../components/adminDashboard/Auctions/auctionStatuses';

const COLUMN_KEYS = [
  'session',
  'start',
  'end',
  'minReputation',
  'bids',
  'status',
  'products',
  'actions',
] as const;

export default function AdminAuctionsPage() {
  const { t } = useTranslation('admin');
  const [promotingAuction, setPromotingAuction] = useState<AdminAuctionEntity | null>(null);
  const {
    now,
    lockDisabledReason,
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
    revision,
    loading,
    error,
    creating,
    setCreating,
    selectedAuction,
    setSelectedAuction,
    editingAuction,
    setEditingAuction,
    deletingAuction,
    setDeletingAuction,
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
  } = useAdminAuctions();
  const banners = useAuctionBanners(token, revision);
  return (
    <Panel
      title={t('auctions.page.title')}
      subtitle={t('auctions.page.subtitle')}
      icon={<Gavel size={19} />}
      action={
        <Button onClick={() => setCreating(true)}>
          <Plus size={15} />
          {t('auctions.page.createBtn')}
        </Button>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-full sm:max-w-sm">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('auctions.page.searchPlaceholder')}
          />
        </div>
        <select
          aria-label={t('auctions.page.statusAria')}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
        >
          <option value="">{t('auctions.page.allStatuses')}</option>
          {AUCTION_STATUS_KEYS.map((value) => (
            <option key={value} value={value}>
              {t(`auctions.statuses.${value}`)}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={14} />
          {t('auctions.common.refresh')}
        </Button>
      </div>
      {loading && (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          {t('auctions.page.loading')}
        </p>
      )}
      {banners.error && (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          {t('management.bannerCheckWarning', { error: banners.error })}
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            {t('auctions.common.retry')}
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
                    {COLUMN_KEYS.map((key) => (
                      <th key={key} className="p-4 font-semibold">
                        {t(`auctions.page.columns.${key}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((item) => (
                    <AuctionRow
                      now={now}
                      key={item.id}
                      item={item}
                      setSelectedAuction={setSelectedAuction}
                      startingId={startingId}
                      setLockingAuction={setLockingAuction}
                      locking={locking}
                      setLockError={setLockError}
                      openShowcaseForAuction={openShowcaseForAuction}
                      handleStartAuction={handleStartAuction}
                      onEdit={setEditingAuction}
                      onDelete={setDeletingAuction}
                      onPromote={setPromotingAuction}
                      banners={banners}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                {t('auctions.page.pagination', {
                  total: data.pagination.total,
                  page: data.pagination.page,
                  totalPages: Math.max(1, data.pagination.totalPages),
                })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  {t('auctions.page.prev')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  {t('auctions.page.next')}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState text={t('auctions.page.empty')} />
        ))}
      <Popup
        isOpen={!!lockingAuction}
        title={t('auctions.page.lockModalTitle')}
        onClose={() => {
          if (!locking) setLockingAuction(null);
        }}
        closeOnOverlay={!locking}
        closeOnEsc={!locking}
        showCloseButton={!locking}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={locking} onClick={() => setLockingAuction(null)}>
              {t('auctions.common.cancel')}
            </Button>
            <Button
              disabled={locking || !!startingId || !!lockDisabledReason}
              onClick={() => void handleLockConsignment()}
            >
              {locking ? t('auctions.page.lockingBtn') : t('auctions.page.lockConfirmBtn')}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          <Trans
            i18nKey="auctions.page.lockModalBody"
            ns="admin"
            values={{ title: lockingAuction?.title ?? '' }}
            components={{ strong: <strong /> }}
          />
        </p>
        {(lockError || lockDisabledReason) && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {lockError || lockDisabledReason}
          </p>
        )}
      </Popup>
      {promotingAuction && (
        <PromoteAuctionDialog
          key={`${token}:${promotingAuction.id}`}
          auction={promotingAuction}
          onClose={() => setPromotingAuction(null)}
          onPromoted={() => {
            setPromotingAuction(null);
            setRevision((value) => value + 1);
          }}
        />
      )}
      {editingAuction && (
        <CreateAuctionDialog
          key={`edit:${token}:${editingAuction.id}`}
          auction={editingAuction}
          onClose={() => setEditingAuction(null)}
          onCreated={() => {
            setEditingAuction(null);
            setRevision((value) => value + 1);
          }}
        />
      )}
      {deletingAuction && (
        <DeleteAuctionDialog
          key={`delete:${token}:${deletingAuction.id}`}
          auction={deletingAuction}
          onClose={() => setDeletingAuction(null)}
          onDeleted={() => {
            setDeletingAuction(null);
            if (data?.items.length === 1 && page > 1) setPage((value) => value - 1);
            else setRevision((value) => value + 1);
          }}
        />
      )}
      {creating && (
        <CreateAuctionDialog
          key={`${token}:create`}
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
