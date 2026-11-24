import {
  Bell as BellOutlined,
  Check as CheckOutlined,
  RefreshCw as ReloadOutlined,
  Flame as FlameOutlined,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardChrome } from '../dashboard/dashboardChrome';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n/config';
import useSellerNotifications from './useSellerNotifications';

export default function SellerNotifications({
  userId,
  isOpen,
  onToggle,
}: {
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { t, i18n } = useTranslation('seller');
  const navigate = useNavigate();
  const state = useSellerNotifications(userId, isOpen);
  const busy = state.loading || Boolean(state.pending);

  const openNotification = (
    notificationId: string,
    targetUrl?: string | null,
    type?: string,
    title?: string,
    content?: string,
    auctionId?: string | null,
  ): void => {
    void state.markRead(notificationId);
    const sellerAuctionPath = targetUrl?.match(/^\/auction\/([^/?#]+)/);
    const resolvedUrl = sellerAuctionPath ? `/seller/auctions/${sellerAuctionPath[1]}` : targetUrl;
    const notificationText = `${title ?? ''} ${content ?? ''}`.toLocaleLowerCase('vi-VN');
    const isReviewNotification =
      type?.toUpperCase().includes('REVIEW') || notificationText.includes('đánh giá');
    const isTrendingNotification =
      notificationText.includes('xu hướng') || notificationText.includes('trending');

    let destination = '/seller/auctions';
    if (resolvedUrl?.startsWith('/seller/')) {
      destination =
        isTrendingNotification && !resolvedUrl.includes('tab=')
          ? '/seller/products?tab=trending'
          : resolvedUrl;
    } else if (isTrendingNotification) {
      destination = '/seller/products?tab=trending';
    } else if (type?.toUpperCase().includes('DISPUTE')) {
      destination = '/seller/disputes';
    } else if (isReviewNotification) {
      destination = '/seller/reviews';
    } else if (auctionId) {
      destination = `/seller/auctions/${encodeURIComponent(auctionId)}`;
    }

    navigate(destination);
  };

  return (
    <>
      <button
        type="button"
        className={dashboardChrome.notificationButton}
        aria-label={
          state.unreadCount !== null
            ? t('notifications.bellAriaUnread', { count: state.unreadCount })
            : t('notifications.bellAria')
        }
        aria-expanded={isOpen}
        aria-controls="seller-notifications"
        onClick={onToggle}
      >
        <BellOutlined className="text-[19px]" aria-hidden="true" />
        {state.unreadCount !== null && state.unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-center text-[9px] leading-4 text-white">
            {state.unreadCount > 99 ? '99+' : state.unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <section
          id="seller-notifications"
          aria-label={t('notifications.panelTitle')}
          aria-busy={busy}
          className="absolute right-0 top-[calc(100%+16px)] z-[60] w-[360px] max-w-[calc(100vw-28px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <strong className="text-sm">{t('notifications.panelTitle')}</strong>
            <button
              type="button"
              aria-label={t('notifications.refreshAria')}
              onClick={state.refresh}
              disabled={busy}
              className="rounded p-1 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              <ReloadOutlined />
            </button>
          </div>
          {state.error && (
            <div role="alert" className="m-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              <p>{state.error}</p>
              <button
                type="button"
                onClick={state.refresh}
                disabled={busy}
                className="mt-2 font-semibold underline"
              >
                {t('notifications.retry')}
              </button>
            </div>
          )}
          {state.loading && (
            <p role="status" className="p-5 text-center text-xs text-slate-500">
              {t('notifications.loading')}
            </p>
          )}
          {!state.loading && state.data && (
            <>
              <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs text-slate-500">
                <span>{t('notifications.totalCount', { count: state.data.total })}</span>
                <button
                  type="button"
                  onClick={() => void state.markRead()}
                  disabled={busy || !state.unreadCount}
                  className="text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                >
                  {t('notifications.markAllRead')}
                </button>
              </div>
              {state.data.items.length === 0 ? (
                <p className="p-5 text-center text-xs text-slate-500">{t('notifications.empty')}</p>
              ) : (
                <ul className="m-0 max-h-[360px] list-none overflow-y-auto p-0">
                  {state.data.items.map((item) => {
                    const itemText = `${item.title} ${item.content}`.toLowerCase();
                    const isTrendingItem =
                      itemText.includes('xu hướng') || itemText.includes('trending');

                    return (
                      <li
                        key={item.id}
                        className={`border-t border-slate-100 p-4 ${item.isRead ? 'bg-white' : 'bg-blue-50/70'}`}
                      >
                        <div className="flex items-start gap-2">
                          {!item.isRead && (
                            <span
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
                              aria-label={t('notifications.unreadDotAria')}
                            />
                          )}
                          <div className="min-w-0 flex-1 space-y-2">
                            {isTrendingItem ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 rounded bg-orange-50 border border-orange-200 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                                  <FlameOutlined
                                    size={10}
                                    className="text-orange-500 fill-orange-500"
                                  />{' '}
                                  {t('notifications.trendingBadge')}
                                </span>
                                <p className="break-words text-xs font-semibold text-slate-800">
                                  {item.title}
                                </p>
                              </div>
                            ) : (
                              <p className="break-words text-xs font-semibold text-slate-800">
                                {item.title}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words text-xs text-slate-600">
                              {item.content}
                            </p>
                            <time
                              dateTime={item.createdAt}
                              className="block text-[10px] text-slate-400"
                            >
                              {new Date(item.createdAt).toLocaleString(
                                getIntlLocale(i18n.language),
                              )}
                            </time>
                            {(item.targetUrl ||
                              item.auctionId ||
                              item.type.toUpperCase().includes('DISPUTE') ||
                              item.type?.toUpperCase().includes('REVIEW') ||
                              isTrendingItem ||
                              `${item.title} ${item.content}`
                                .toLocaleLowerCase('vi-VN')
                                .includes('đánh giá')) && (
                              <button
                                type="button"
                                onClick={() =>
                                  openNotification(
                                    item.id,
                                    item.targetUrl,
                                    item.type,
                                    item.title,
                                    item.content,
                                    item.auctionId,
                                  )
                                }
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                              >
                                {isTrendingItem && t('notifications.viewTrending')}
                                {!isTrendingItem &&
                                  item.type.toUpperCase().includes('DISPUTE') &&
                                  t('notifications.viewDispute')}
                                {!isTrendingItem &&
                                  !item.type.toUpperCase().includes('DISPUTE') &&
                                  t('notifications.openContent')}
                              </button>
                            )}
                            {!item.isRead && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void state.markRead(item.id)}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
                              >
                                <CheckOutlined /> {t('notifications.markRead')}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {state.data.totalPages > 1 && (
                <nav
                  aria-label={t('notifications.paginationAria')}
                  className="flex items-center justify-between border-t border-slate-100 p-3 text-xs"
                >
                  <button
                    type="button"
                    disabled={busy || state.page <= 1}
                    onClick={() => state.changePage(state.page - 1)}
                    className="text-blue-600 disabled:text-slate-400"
                  >
                    {t('notifications.prev')}
                  </button>
                  <span>
                    {state.page} / {state.data.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={busy || state.page >= state.data.totalPages}
                    onClick={() => state.changePage(state.page + 1)}
                    className="text-blue-600 disabled:text-slate-400"
                  >
                    {t('notifications.next')}
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
