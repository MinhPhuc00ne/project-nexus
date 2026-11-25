import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, MessageCircle, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge, Button, EmptyState, Panel } from '../../components/adminDashboard/shared/AdminUI';
import { useToast } from '../../components/ToastNotification';
import { getIntlLocale } from '../../i18n/config';
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

const TRIGGER_KEYS: AdminAutoReplyTrigger[] = ['WELCOME', 'OFFLINE', 'KEYWORD', 'DEFAULT'];

const formatDateTime = (value: string | null | undefined, language: string) =>
  value
    ? new Intl.DateTimeFormat(getIntlLocale(language), {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
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
  const { t } = useTranslation('admin');
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
      <span>{t('chat.pager.pageOf', { page, total: Math.max(totalPages, 1) })}</span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {t('chat.pager.prev')}
        </Button>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          {t('chat.pager.next')}
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
  const { t } = useTranslation('admin');
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
            {t('chat.close')}
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function AutoReplyPanel() {
  const { t, i18n } = useTranslation('admin');
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
          setError(errorText(cause, t('chat.errors.loadReplies')));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, scope, status, shopId, revision, t]);

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
      toast.success(t('chat.toasts.created'));
    } catch (cause) {
      setActionError(errorText(cause, t('chat.errors.createReply')));
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
      toast.success(t('chat.toasts.locked'));
    } catch (cause) {
      setActionError(errorText(cause, t('chat.errors.lockReply')));
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
      setActionError(errorText(cause, t('chat.errors.loadHistory')));
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel
        title={t('chat.create.title')}
        subtitle={t('chat.create.subtitle')}
        icon={<Plus size={18} />}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void submitCreate(event)}>
          <label className="grid gap-1.5 text-xs font-medium text-slate-600">
            {t('chat.create.nameLabel')}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              placeholder={t('chat.create.namePlaceholder')}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-600">
            {t('chat.create.triggerLabel')}
            <select
              value={triggerType}
              onChange={(event) => setTriggerType(event.target.value as AdminAutoReplyTrigger)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              {TRIGGER_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`chat.triggers.${key}`)}
                </option>
              ))}
            </select>
          </label>
          {triggerType === 'KEYWORD' && (
            <label className="grid gap-1.5 text-xs font-medium text-slate-600 md:col-span-2">
              {t('chat.create.keywordLabel')}
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
            {t('chat.create.contentLabel')}
            <textarea
              required
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={1000}
              rows={3}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t('chat.create.contentPlaceholder')}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />{' '}
            {t('chat.create.activateNow')}
          </label>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving || !content.trim() || (triggerType === 'KEYWORD' && !keyword.trim())}
            >
              <Plus size={14} /> {t('chat.create.submit')}
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
        title={t('chat.list.title')}
        subtitle={t('chat.list.subtitle')}
        icon={<MessageCircle size={18} />}
        action={
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw size={14} /> {t('chat.refresh')}
          </Button>
        }
      >
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <select
            aria-label={t('chat.list.scopeAria')}
            value={scope}
            onChange={(event) => {
              setScope(event.target.value as '' | AdminAutoReplyScope);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs"
          >
            <option value="">{t('chat.list.allScopes')}</option>
            <option value="SYSTEM">{t('chat.list.systemScope')}</option>
            <option value="SHOP">{t('chat.list.shopScope')}</option>
          </select>
          <select
            aria-label={t('chat.list.statusAria')}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as '' | AdminAutoReplyStatus);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs"
          >
            <option value="">{t('chat.list.allStatuses')}</option>
            <option value="ACTIVE">{t('chat.list.activeStatus')}</option>
            <option value="CANCELLED_BY_ADMIN">{t('chat.list.lockedStatus')}</option>
          </select>
          <input
            aria-label={t('chat.list.shopIdAria')}
            value={shopId}
            onChange={(event) => {
              setShopId(event.target.value);
              setPage(1);
            }}
            placeholder={t('chat.list.shopIdPlaceholder')}
            className="h-10 rounded-lg border border-slate-200 px-3 text-xs"
          />
        </div>
        {loading ? (
          <p role="status" className="py-10 text-center text-sm text-slate-500">
            {t('chat.list.loading')}
          </p>
        ) : error ? (
          <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            {error}
            <div className="mt-3">
              <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
                {t('chat.retry')}
              </Button>
            </div>
          </div>
        ) : !result?.items.length ? (
          <EmptyState text={t('chat.list.empty')} />
        ) : (
          <>
            <div className="space-y-3">
              {result.items.map((reply) => (
                <article key={reply.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {reply.name || t('chat.list.defaultName')}
                        </h3>
                        <Badge tone={reply.scope === 'SYSTEM' ? 'blue' : 'amber'}>
                          {reply.scope === 'SYSTEM'
                            ? t('chat.list.systemScope')
                            : t('chat.list.shopScope')}
                        </Badge>
                        <Badge tone={reply.status === 'ACTIVE' ? 'green' : 'red'}>
                          {reply.status === 'ACTIVE'
                            ? t('chat.list.activeStatus')
                            : t('chat.list.lockedStatus')}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {t(`chat.triggers.${reply.triggerType}`)}
                        {reply.keyword ? ` · ${reply.keyword}` : ''} ·{' '}
                        {t('chat.list.createdAt', {
                          time: formatDateTime(reply.createdAt, i18n.language),
                        })}
                      </p>
                      {reply.shop && (
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {t('chat.list.shopPrefix')} {reply.shop.fullName} · {reply.shop.email} ·{' '}
                          {reply.shop.id}
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
                          <ClipboardList size={14} /> {t('chat.list.historyBtn')}
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
                          <ShieldAlert size={14} /> {t('chat.list.lockBtn')}
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
          title={t('chat.lockModal.title')}
          onClose={() => {
            setCancelTarget(null);
            setActionError('');
          }}
        >
          <p className="mb-3 text-sm text-slate-600">
            {cancelTarget.name || t('chat.list.defaultName')} ·{' '}
            {cancelTarget.shop?.fullName || cancelTarget.shopId}
          </p>
          <form onSubmit={(event) => void submitCancel(event)}>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">
              {t('chat.lockModal.reasonLabel')}
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
                {t('chat.cancel')}
              </Button>
              <Button type="submit" variant="danger" disabled={saving || !cancelReason.trim()}>
                {saving ? t('chat.saving') : t('chat.lockModal.confirm')}
              </Button>
            </div>
          </form>
        </Overlay>
      )}
      {history && (
        <Overlay title={t('chat.historyModal.title')} onClose={() => setHistory(null)}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">{t('chat.historyModal.status')}</dt>
              <dd className="mt-1 font-medium">
                {history.status === 'ACTIVE'
                  ? t('chat.list.activeStatus')
                  : t('chat.historyModal.lockedByAdmin')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t('chat.historyModal.lockedAt')}</dt>
              <dd className="mt-1 font-medium">
                {formatDateTime(history.cancelledAt, i18n.language)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t('chat.historyModal.actor')}</dt>
              <dd className="mt-1 font-medium">
                {history.cancelledBy?.fullName || '—'}{' '}
                {history.cancelledBy?.email ? `(${history.cancelledBy.email})` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t('chat.historyModal.shop')}</dt>
              <dd className="mt-1 font-medium">
                {history.shop?.fullName || t('chat.list.systemScope')}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">{t('chat.historyModal.reason')}</dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {history.cancelReason || t('chat.historyModal.noReason')}
              </dd>
            </div>
          </dl>
        </Overlay>
      )}
    </div>
  );
}

function ConversationAuditPanel() {
  const { t, i18n } = useTranslation('admin');
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
          setError(errorText(cause, t('chat.errors.loadConversations')));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, type, revision, t]);

  async function openAudit(conversation: AdminChatConversation) {
    setSelected(conversation);
    setAudit(null);
    setAuditError('');
    setAuditLoading(true);
    try {
      const response = await auditAdminChatConversation(conversation.id, { limit: 50 });
      setAudit(response.data);
    } catch (cause) {
      setAuditError(errorText(cause, t('chat.errors.loadAudit')));
    } finally {
      setAuditLoading(false);
    }
  }

  const participantNames = (conversation: AdminChatConversation) =>
    [conversation.participant1?.fullName, conversation.participant2?.fullName]
      .filter(Boolean)
      .join(' · ') ||
    conversation.title ||
    t('chat.audit.fallbackTitle');
  return (
    <Panel
      title={t('chat.audit.title')}
      subtitle={t('chat.audit.subtitle')}
      icon={<ClipboardList size={18} />}
      action={
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={14} /> {t('chat.refresh')}
        </Button>
      }
    >
      <div className="mb-4 flex justify-end">
        <select
          aria-label={t('chat.audit.filterAria')}
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:max-w-xs"
        >
          <option value="">{t('chat.audit.allTypes')}</option>
          <option value="STAFF_BUYER">{t('chat.audit.types.STAFF_BUYER')}</option>
          <option value="STAFF_SELLER">{t('chat.audit.types.STAFF_SELLER')}</option>
          <option value="SUPPORT_TICKET">{t('chat.audit.types.SUPPORT_TICKET')}</option>
          <option value="BUYER_SELLER">{t('chat.audit.types.BUYER_SELLER')}</option>
        </select>
      </div>
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          {t('chat.audit.loading')}
        </p>
      ) : error ? (
        <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          <div className="mt-3">
            <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
              {t('chat.retry')}
            </Button>
          </div>
        </div>
      ) : !result?.items.length ? (
        <EmptyState text={t('chat.audit.empty')} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">
                    {t('chat.audit.columns.participants')}
                  </th>
                  <th className="px-3 py-2 font-semibold">{t('chat.audit.columns.type')}</th>
                  <th className="px-3 py-2 font-semibold">{t('chat.audit.columns.updated')}</th>
                  <th className="px-3 py-2 font-semibold">{t('chat.audit.columns.lastMessage')}</th>
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
                    <td className="px-3 py-3 text-slate-500">
                      {formatDateTime(conversation.updatedAt, i18n.language)}
                    </td>
                    <td className="max-w-64 truncate px-3 py-3 text-slate-500">
                      {conversation.lastMessage || t('chat.audit.noMessage')}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button variant="secondary" onClick={() => void openAudit(conversation)}>
                        {t('chat.audit.viewAudit')}
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
        <Overlay title={t('chat.audit.modalTitle')} onClose={() => setSelected(null)}>
          <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">{participantNames(selected)}</p>
            <p className="mt-1 break-all">{t('chat.audit.conversationId', { id: selected.id })}</p>
          </div>
          {auditLoading ? (
            <p role="status" className="py-8 text-center text-sm text-slate-500">
              {t('chat.audit.loadingLog')}
            </p>
          ) : auditError ? (
            <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {auditError}
              <div className="mt-3">
                <Button variant="secondary" onClick={() => void openAudit(selected)}>
                  {t('chat.retry')}
                </Button>
              </div>
            </div>
          ) : !audit?.messages.length ? (
            <EmptyState text={t('chat.audit.emptyMessages')} />
          ) : (
            <div className="max-h-[55dvh] space-y-3 overflow-y-auto">
              {[...audit.messages].reverse().map((message) => (
                <article key={message.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-800">
                        {message.sender?.fullName || t('chat.audit.fallbackSender')}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        {message.sender?.role || '—'}
                        {message.sender?.email ? ` · ${message.sender.email}` : ''}
                      </span>
                    </div>
                    <time className="text-[10px] text-slate-400">
                      {formatDateTime(message.createdAt, i18n.language)}
                    </time>
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
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState<'replies' | 'audit'>('replies');
  return (
    <main className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('chat.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('chat.subtitle')}</p>
      </header>
      <div role="tablist" aria-label={t('chat.tablistAria')} className="flex flex-wrap gap-2">
        <button
          role="tab"
          aria-selected={tab === 'replies'}
          onClick={() => setTab('replies')}
          className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${tab === 'replies' ? 'bg-primary text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
        >
          {t('chat.tabs.replies')}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'audit'}
          onClick={() => setTab('audit')}
          className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${tab === 'audit' ? 'bg-primary text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
        >
          {t('chat.tabs.audit')}
        </button>
      </div>
      {tab === 'replies' ? <AutoReplyPanel /> : <ConversationAuditPanel />}
    </main>
  );
}
