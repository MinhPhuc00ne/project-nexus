import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ClipboardList, MessageCircle, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge, Button, EmptyState, Panel } from '../../components/adminDashboard/shared/AdminUI';
import { useToast } from '../../components/ToastNotification';
import {
  auditAdminChatConversation,
  cancelSellerAutoReply,
  createSystemAutoReply,
  getAdminAutoReplyHistory,
  listAdminAutoReplies,
  listAdminChatConversations,
} from '../../services/adminChat';
import type {
  AdminAutoReply,
  AdminAutoReplyHistory,
  AdminAutoReplyPage,
  AdminAutoReplyScope,
  AdminAutoReplyStatus,
  AdminAutoReplyTrigger,
  AdminChatAuditPage,
  AdminChatConversation,
  AdminChatConversationPage,
} from '../../types/admin-chat.types';

const triggerLabels: Record<AdminAutoReplyTrigger, string> = {
  WELCOME: 'Lời chào đầu tiên',
  OFFLINE: 'Ngoài giờ',
  KEYWORD: 'Từ khóa',
  DEFAULT: 'Mặc định',
};
const time = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—';
const errorText = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
      <span>
        Trang {page} / {Math.max(totalPages, 1)}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Trước
        </Button>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}

function Overlay({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            Đóng
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function AutoReplyPanel() {
  const toast = useToast();
  const [scope, setScope] = useState<'' | AdminAutoReplyScope>('');
  const [status, setStatus] = useState<'' | AdminAutoReplyStatus>('');
  const [shopId, setShopId] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<AdminAutoReplyPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggerType, setTriggerType] = useState<AdminAutoReplyTrigger>('WELCOME');
  const [name, setName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AdminAutoReply | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [history, setHistory] = useState<AdminAutoReplyHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void listAdminAutoReplies(
      {
        page,
        limit: 10,
        scope: scope || undefined,
        status: status || undefined,
        shopId: shopId.trim() || undefined,
      },
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult(data);
          if (page > Math.max(1, data.pagination.totalPages))
            setPage(Math.max(1, data.pagination.totalPages));
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(errorText(cause, 'Không tải được danh sách tin nhắn tự động.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, scope, status, shopId, revision]);

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (!content.trim() || (triggerType === 'KEYWORD' && !keyword.trim())) return;
    setSaving(true);
    setActionError('');
    try {
      await createSystemAutoReply({
        name: name.trim() || undefined,
        triggerType,
        keyword: triggerType === 'KEYWORD' ? keyword.trim() : undefined,
        content: content.trim(),
        isActive,
      });
      setName('');
      setKeyword('');
      setContent('');
      setTriggerType('WELCOME');
      setIsActive(true);
      setPage(1);
      setRevision((value) => value + 1);
      toast.success('Đã tạo tin nhắn tự động hệ thống.');
    } catch (cause) {
      setActionError(errorText(cause, 'Không tạo được tin nhắn tự động.'));
    } finally {
      setSaving(false);
    }
  }

  async function submitCancel(event: FormEvent) {
    event.preventDefault();
    if (!cancelTarget || cancelReason.trim().length < 1 || saving) return;
    setSaving(true);
    setActionError('');
    try {
      await cancelSellerAutoReply(cancelTarget.id, cancelReason.trim());
      setCancelTarget(null);
      setCancelReason('');
      setRevision((value) => value + 1);
      toast.success('Đã khóa tin nhắn tự động của shop.');
    } catch (cause) {
      setActionError(errorText(cause, 'Không khóa được tin nhắn tự động.'));
    } finally {
      setSaving(false);
    }
  }

  async function showHistory(reply: AdminAutoReply) {
    setHistoryLoading(true);
    setActionError('');
    try {
      const response = await getAdminAutoReplyHistory(reply.id);
      setHistory(response.data);
    } catch (cause) {
      setActionError(errorText(cause, 'Không tải được lịch sử xử lý.'));
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Tạo tin nhắn tự động hệ thống"
        subtitle="Cấu hình lời chào và phản hồi tự động cho hội thoại hỗ trợ của sàn."
        icon={<Plus size={18} />}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void submitCreate(event)}>
          <label className="grid gap-1.5 text-xs font-medium text-slate-600">
            Tên cấu hình
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="Tin nhắn chào mừng CSKH"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-600">
            Kiểu kích hoạt
            <select
              value={triggerType}
              onChange={(event) => setTriggerType(event.target.value as AdminAutoReplyTrigger)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              {Object.entries(triggerLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {triggerType === 'KEYWORD' && (
            <label className="grid gap-1.5 text-xs font-medium text-slate-600 md:col-span-2">
              Từ khóa
              <input
                required
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                maxLength={100}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              />
            </label>
          )}
          <label className="grid gap-1.5 text-xs font-medium text-slate-600 md:col-span-2">
            Nội dung phản hồi
            <textarea
              required
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={1000}
              rows={3}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Nhập nội dung tin nhắn tự động"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />{' '}
            Kích hoạt ngay
          </label>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving || !content.trim() || (triggerType === 'KEYWORD' && !keyword.trim())}
            >
              <Plus size={14} /> Tạo cấu hình
            </Button>
          </div>
          {actionError && !cancelTarget && !history && (
            <p role="alert" className="text-xs text-rose-700 md:col-span-2">
              {actionError}
            </p>
          )}
        </form>
      </Panel>

      <Panel
        title="Tin nhắn tự động toàn sàn"
        subtitle="Theo dõi cấu hình của hệ thống và seller; có thể khóa tin nhắn vi phạm và xem lịch sử."
        icon={<MessageCircle size={18} />}
        action={
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw size={14} /> Làm mới
          </Button>
        }
      >
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <select
            aria-label="Lọc phạm vi"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value as '' | AdminAutoReplyScope);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs"
          >
            <option value="">Tất cả phạm vi</option>
            <option value="SYSTEM">Hệ thống</option>
            <option value="SHOP">Shop</option>
          </select>
          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as '' | AdminAutoReplyStatus);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="CANCELLED_BY_ADMIN">Đã khóa</option>
          </select>
          <input
            aria-label="Lọc theo mã shop"
            value={shopId}
            onChange={(event) => {
              setShopId(event.target.value);
              setPage(1);
            }}
            placeholder="Mã shop (tùy chọn)"
            className="h-10 rounded-lg border border-slate-200 px-3 text-xs"
          />
        </div>
        {loading ? (
          <p role="status" className="py-10 text-center text-sm text-slate-500">
            Đang tải cấu hình…
          </p>
        ) : error ? (
          <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            {error}
            <div className="mt-3">
              <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
                Thử lại
              </Button>
            </div>
          </div>
        ) : !result?.items.length ? (
          <EmptyState text="Chưa có tin nhắn tự động phù hợp." />
        ) : (
          <>
            <div className="space-y-3">
              {result.items.map((reply) => (
                <article key={reply.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {reply.name || 'Tin nhắn tự động'}
                        </h3>
                        <Badge tone={reply.scope === 'SYSTEM' ? 'blue' : 'amber'}>
                          {reply.scope === 'SYSTEM' ? 'Hệ thống' : 'Shop'}
                        </Badge>
                        <Badge tone={reply.status === 'ACTIVE' ? 'green' : 'red'}>
                          {reply.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {triggerLabels[reply.triggerType]}
                        {reply.keyword ? ` · ${reply.keyword}` : ''} · Tạo {time(reply.createdAt)}
                      </p>
                      {reply.shop && (
                        <p className="mt-1 break-all text-xs text-slate-500">
                          Shop: {reply.shop.fullName} · {reply.shop.email} · {reply.shop.id}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {reply.status === 'CANCELLED_BY_ADMIN' && (
                        <Button
                          variant="secondary"
                          disabled={historyLoading}
                          onClick={() => void showHistory(reply)}
                        >
                          <ClipboardList size={14} /> Lịch sử
                        </Button>
                      )}
                      {reply.scope === 'SHOP' && reply.status === 'ACTIVE' && (
                        <Button
                          variant="danger"
                          onClick={() => {
                            setCancelTarget(reply);
                            setActionError('');
                          }}
                        >
                          <ShieldAlert size={14} /> Khóa
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    {reply.content}
                  </p>
                </article>
              ))}
            </div>
            <Pager
              page={result.pagination.page}
              totalPages={result.pagination.totalPages}
              onChange={setPage}
            />
          </>
        )}
      </Panel>
      {cancelTarget && (
        <Overlay
          title="Khóa tin nhắn tự động của shop"
          onClose={() => {
            setCancelTarget(null);
            setActionError('');
          }}
        >
          <p className="mb-3 text-sm text-slate-600">
            {cancelTarget.name || 'Tin nhắn tự động'} ·{' '}
            {cancelTarget.shop?.fullName || cancelTarget.shopId}
          </p>
          <form onSubmit={(event) => void submitCancel(event)}>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              Lý do khóa
              <textarea
                autoFocus
                required
                maxLength={500}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={3}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            {actionError && (
              <p role="alert" className="mt-2 text-xs text-rose-700">
                {actionError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCancelTarget(null)}>
                Hủy
              </Button>
              <Button type="submit" variant="danger" disabled={saving || !cancelReason.trim()}>
                {saving ? 'Đang lưu…' : 'Xác nhận khóa'}
              </Button>
            </div>
          </form>
        </Overlay>
      )}
      {history && (
        <Overlay title="Lịch sử tin nhắn tự động" onClose={() => setHistory(null)}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Trạng thái</dt>
              <dd className="mt-1 font-medium">
                {history.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa bởi quản trị viên'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Thời điểm khóa</dt>
              <dd className="mt-1 font-medium">{time(history.cancelledAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Người xử lý</dt>
              <dd className="mt-1 font-medium">
                {history.cancelledBy?.fullName || '—'}{' '}
                {history.cancelledBy?.email ? `(${history.cancelledBy.email})` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Shop</dt>
              <dd className="mt-1 font-medium">{history.shop?.fullName || 'Hệ thống'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Lý do</dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {history.cancelReason || 'Không có lý do được ghi nhận.'}
              </dd>
            </div>
          </dl>
        </Overlay>
      )}
    </div>
  );
}

function ConversationAuditPanel() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<AdminChatConversationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminChatConversation | null>(null);
  const [audit, setAudit] = useState<AdminChatAuditPage | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void listAdminChatConversations({ page, limit: 10, type: type || undefined }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(errorText(cause, 'Không tải được danh sách hội thoại.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, type, revision]);

  async function openAudit(conversation: AdminChatConversation) {
    setSelected(conversation);
    setAudit(null);
    setAuditError('');
    setAuditLoading(true);
    try {
      const response = await auditAdminChatConversation(conversation.id, { limit: 50 });
      setAudit(response.data);
    } catch (cause) {
      setAuditError(errorText(cause, 'Không tải được nhật ký hội thoại.'));
    } finally {
      setAuditLoading(false);
    }
  }

  const participantNames = (conversation: AdminChatConversation) =>
    [conversation.participant1?.fullName, conversation.participant2?.fullName]
      .filter(Boolean)
      .join(' · ') ||
    conversation.title ||
    'Hội thoại';
  return (
    <Panel
      title="Audit hội thoại"
      subtitle="Xem nội dung tin nhắn và danh tính tài khoản staff đã gửi trong hội thoại."
      icon={<ClipboardList size={18} />}
      action={
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={14} /> Làm mới
        </Button>
      }
    >
      <div className="mb-4 flex justify-end">
        <select
          aria-label="Lọc loại hội thoại"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:max-w-xs"
        >
          <option value="">Tất cả hội thoại</option>
          <option value="STAFF_BUYER">Staff – Buyer</option>
          <option value="STAFF_SELLER">Staff – Seller</option>
          <option value="SUPPORT_TICKET">Yêu cầu hỗ trợ</option>
          <option value="BUYER_SELLER">Buyer – Seller</option>
        </select>
      </div>
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Đang tải hội thoại…
        </p>
      ) : error ? (
        <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          <div className="mt-3">
            <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
              Thử lại
            </Button>
          </div>
        </div>
      ) : !result?.items.length ? (
        <EmptyState text="Không tìm thấy hội thoại." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Người tham gia</th>
                  <th className="px-3 py-2 font-semibold">Loại</th>
                  <th className="px-3 py-2 font-semibold">Cập nhật</th>
                  <th className="px-3 py-2 font-semibold">Tin nhắn gần nhất</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((conversation) => (
                  <tr key={conversation.id}>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-800">
                        {participantNames(conversation)}
                      </p>
                      <p className="mt-1 break-all text-[10px] text-slate-400">{conversation.id}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone="gray">{conversation.type}</Badge>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{time(conversation.updatedAt)}</td>
                    <td className="max-w-64 truncate px-3 py-3 text-slate-500">
                      {conversation.lastMessage || 'Chưa có tin nhắn'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button variant="secondary" onClick={() => void openAudit(conversation)}>
                        Xem audit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            onChange={setPage}
          />
        </>
      )}
      {selected && (
        <Overlay title="Audit hội thoại" onClose={() => setSelected(null)}>
          <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">{participantNames(selected)}</p>
            <p className="mt-1 break-all">Mã hội thoại: {selected.id}</p>
          </div>
          {auditLoading ? (
            <p role="status" className="py-8 text-center text-sm text-slate-500">
              Đang tải nhật ký…
            </p>
          ) : auditError ? (
            <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {auditError}
              <div className="mt-3">
                <Button variant="secondary" onClick={() => void openAudit(selected)}>
                  Thử lại
                </Button>
              </div>
            </div>
          ) : !audit?.messages.length ? (
            <EmptyState text="Hội thoại chưa có tin nhắn." />
          ) : (
            <div className="max-h-[55dvh] space-y-3 overflow-y-auto">
              {[...audit.messages].reverse().map((message) => (
                <article key={message.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-800">
                        {message.sender?.fullName || 'Tài khoản'}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        {message.sender?.role || '—'}
                        {message.sender?.email ? ` · ${message.sender.email}` : ''}
                      </span>
                    </div>
                    <time className="text-[10px] text-slate-400">{time(message.createdAt)}</time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {message.body}
                  </p>
                  {message.attachments?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {message.attachments.map((url) => (
                        <li key={url}>
                          <a
                            className="break-all text-xs text-primary underline"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </Overlay>
      )}
    </Panel>
  );
}

export default function AdminChatPage() {
  const [tab, setTab] = useState<'replies' | 'audit'>('replies');
  return (
    <main className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Chat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Quản lý auto-reply hệ thống, kiểm duyệt phản hồi của shop và audit hội thoại hỗ trợ.
        </p>
      </header>
      <div role="tablist" aria-label="Quản lý chat" className="flex flex-wrap gap-2">
        <button
          role="tab"
          aria-selected={tab === 'replies'}
          onClick={() => setTab('replies')}
          className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${tab === 'replies' ? 'bg-primary text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
        >
          Tin nhắn tự động
        </button>
        <button
          role="tab"
          aria-selected={tab === 'audit'}
          onClick={() => setTab('audit')}
          className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${tab === 'audit' ? 'bg-primary text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
        >
          Audit hội thoại
        </button>
      </div>
      {tab === 'replies' ? <AutoReplyPanel /> : <ConversationAuditPanel />}
    </main>
  );
}
