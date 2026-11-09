import {
  Bell as BellOutlined,
  Check as CheckOutlined,
  RefreshCw as ReloadOutlined,
} from 'lucide-react';
import useAdminNotifications from './useAdminNotifications';
import { Link } from 'react-router-dom';

export default function AdminNotifications({
  userId,
  isOpen,
  onToggle,
}: {
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const state = useAdminNotifications(userId, isOpen);
  const busy = state.loading || Boolean(state.pending);
  return (
    <>
      <button
        type="button"
        className="relative grid place-items-center rounded-lg border-0 bg-transparent p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
        aria-label={`Thông báo quản trị${state.unreadCount !== null ? `, ${state.unreadCount} chưa đọc` : ''}`}
        aria-expanded={isOpen}
        aria-controls="admin-notifications"
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
          id="admin-notifications"
          aria-label="Thông báo quản trị"
          aria-busy={busy}
          className="absolute right-0 top-[calc(100%+16px)] z-[60] w-[360px] max-w-[calc(100vw-28px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <strong className="text-sm">Thông báo quản trị</strong>
            <button
              type="button"
              aria-label="Làm mới thông báo"
              onClick={state.refresh}
              disabled={busy}
              className="rounded p-1 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              <ReloadOutlined />
            </button>
          </div>
          <p className="border-b border-slate-100 px-4 py-3 text-xs leading-6 text-slate-500">
            Thông báo gửi đến tài khoản quản trị hiện tại, tự cập nhật mỗi 30 giây.
          </p>
          {state.error && (
            <div role="alert" className="m-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              <p>{state.error}</p>
              <button
                type="button"
                onClick={state.refresh}
                disabled={busy}
                className="mt-2 font-semibold underline"
              >
                Thử lại
              </button>
            </div>
          )}
          {state.loading && (
            <p role="status" className="p-5 text-center text-xs text-slate-500">
              Đang tải thông báo…
            </p>
          )}
          {!state.loading && state.data && (
            <>
              <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs text-slate-500">
                <span>{state.data.total} thông báo</span>
                <button
                  type="button"
                  onClick={() => void state.markRead()}
                  disabled={busy || !state.unreadCount}
                  className="text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
                >
                  Đọc tất cả
                </button>
              </div>
              {state.data.items.length === 0 ? (
                <p className="p-5 text-center text-xs text-slate-500">Chưa có thông báo.</p>
              ) : (
                <ul className="m-0 max-h-[360px] list-none overflow-y-auto p-0">
                  {state.data.items.map((item) => (
                    <li
                      key={item.id}
                      className={`border-t border-slate-100 p-4 ${item.isRead ? 'bg-white' : 'bg-blue-50/70'}`}
                    >
                      <div className="flex items-start gap-2">
                        {!item.isRead && (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
                            aria-label="Chưa đọc"
                          />
                        )}
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="break-words text-xs font-semibold text-slate-800">
                            {item.title}
                          </p>
                          <p className="whitespace-pre-wrap break-words text-xs text-slate-600">
                            {item.content}
                          </p>
                          <time
                            dateTime={item.createdAt}
                            className="block text-[10px] text-slate-400"
                          >
                            {new Date(item.createdAt).toLocaleString('vi-VN')}
                          </time>
                          {item.targetUrl?.startsWith('/') && !item.targetUrl.startsWith('//') && (
                            <Link
                              to={item.targetUrl}
                              onClick={() => {
                                if (!item.isRead) void state.markRead(item.id);
                                onToggle();
                              }}
                              className="block text-xs font-medium text-blue-600 hover:underline"
                            >
                              Xem chi tiết
                            </Link>
                          )}
                          {!item.isRead && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void state.markRead(item.id)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
                            >
                              <CheckOutlined /> Đánh dấu đã đọc
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {state.data.totalPages > 1 && (
                <nav
                  aria-label="Phân trang thông báo"
                  className="flex items-center justify-between border-t border-slate-100 p-3 text-xs"
                >
                  <button
                    type="button"
                    disabled={busy || state.page <= 1}
                    onClick={() => state.changePage(state.page - 1)}
                    className="text-blue-600 disabled:text-slate-400"
                  >
                    Trước
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
                    Sau
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
