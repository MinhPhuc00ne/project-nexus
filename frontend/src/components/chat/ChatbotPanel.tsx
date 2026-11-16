import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Send, Headphones, LoaderCircle, ArrowUpRight, Trash2 } from 'lucide-react';
import {
  getChatbotCapabilities,
  sendChatbotMessage,
  type ChatbotAction,
  type ChatbotReply,
} from '../../services/chatbot';
import { getChatErrorMessage } from './chatUtils';

function isSafeInternalPath(path?: string): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

function visibleActions(actions?: ChatbotAction[]): ChatbotAction[] {
  const seen = new Set<string>();
  const result: ChatbotAction[] = [];
  for (const action of actions ?? []) {
    if (action.type === 'SELECT_ORDER') continue;
    if (action.type === 'NAVIGATE' && !isSafeInternalPath(action.path)) continue;
    const key = action.type === 'NAVIGATE' ? `NAVIGATE:${action.path}` : action.type;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }
  return result;
}
interface Props {
  guest?: boolean;
  storageKey?: string;
  onRequestSupport?: (message: string, orderId?: string) => Promise<void>;
  creating?: boolean;
}
interface Entry {
  id: number;
  text: string;
  mine?: boolean;
  response?: ChatbotReply;
  question?: string;
}
const HISTORY_STORAGE_PREFIX = 'nexus:chatbot-history:';
const MAX_STORED_ENTRIES = 50;

function readStoredEntries(key: string): Entry[] {
  try {
    const raw = localStorage.getItem(`${HISTORY_STORAGE_PREFIX}${key}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is Entry =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof (item as Entry).id === 'number' &&
          typeof (item as Entry).text === 'string',
      )
      .slice(-MAX_STORED_ENTRIES);
  } catch {
    return [];
  }
}

function writeStoredEntries(key: string, entries: Entry[]): void {
  try {
    const trimmed = entries.slice(-MAX_STORED_ENTRIES);
    if (trimmed.length === 0) {
      localStorage.removeItem(`${HISTORY_STORAGE_PREFIX}${key}`);
      return;
    }
    localStorage.setItem(`${HISTORY_STORAGE_PREFIX}${key}`, JSON.stringify(trimmed));
  } catch {
    return;
  }
}
const suggestions = [
  'Chính sách giao hàng',
  'Trả hàng và hoàn tiền',
  'Hủy đơn hàng',
  'Phương thức thanh toán',
];
export default function ChatbotPanel({
  guest = false,
  storageKey,
  onRequestSupport,
  creating,
}: Props) {
  const historyKey = storageKey ?? (guest ? 'guest' : 'user');
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>(() => readStoredEntries(historyKey));
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [topics, setTopics] = useState(suggestions);
  const [retry, setRetry] = useState<{ message: string }>();
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const nextId = useRef(entries.reduce((max, item) => Math.max(max, item.id), 0));
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setEntries(readStoredEntries(historyKey));
  }, [historyKey]);
  useEffect(() => {
    writeStoredEntries(historyKey, entries);
  }, [historyKey, entries]);
  useEffect(() => {
    const abort = new AbortController();
    if (!guest)
      void getChatbotCapabilities(abort.signal)
        .then((result) => setTopics(result.topics.map((t) => t.title)))
        .catch(() => {});
    return () => {
      abort.abort();
      controller.current?.abort();
    };
  }, [guest]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [entries, pending]);
  async function send(message: string, isRetry = false) {
    const text = message.trim();
    if (!text || text.length > 2000 || busy.current || creating) return;
    busy.current = true;
    setPending(true);
    setError('');
    setRetry(undefined);
    const abort = new AbortController();
    controller.current = abort;
    const historyPayload = (isRetry ? entries.slice(0, -1) : entries)
      .filter((entry) => entry.text.trim().length > 0)
      .slice(-12)
      .map((entry) => ({
        role: (entry.mine ? 'user' : 'assistant') as 'user' | 'assistant',
        content: entry.text.trim().slice(0, 2000),
      }));
    if (!isRetry)
      setEntries((current) => [
        ...current,
        {
          id: ++nextId.current,
          text,
          mine: true,
        },
      ]);
    setDraft('');
    try {
      const response = await sendChatbotMessage(
        text,
        guest,
        undefined,
        abort.signal,
        historyPayload,
      );
      if (!abort.signal.aborted) {
        setEntries((current) => [
          ...current,
          {
            id: ++nextId.current,
            text: response.reply,
            response,
            question: text,
          },
        ]);
        const autoTarget = response.actions.find(
          (action) => action.type === 'NAVIGATE' && action.auto && isSafeInternalPath(action.path),
        );
        if (autoTarget?.path) {
          navigate(autoTarget.path);
        }
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        setError(getChatErrorMessage(err));
        setRetry({ message: text });
      }
    } finally {
      if (!abort.signal.aborted) {
        setPending(false);
        busy.current = false;
      }
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }
  async function requestSupport(entry: Entry) {
    if (!onRequestSupport || creating) return;
    setError('');
    try {
      await onRequestSupport(entry.question || 'Tôi cần nhân viên hỗ trợ.');
    } catch (err) {
      setError(getChatErrorMessage(err));
    }
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-blue-50 p-2 text-blue-600">
            <Bot size={22} />
          </span>
          <div>
            <h3 className="text-sm font-bold">Trợ lý NEXUS</h3>
            <p className="text-xs text-slate-500">
              {guest
                ? 'Giải đáp chính sách · Đăng nhập để tra cứu đơn'
                : 'Giải đáp chính sách và tra cứu đơn hàng của bạn'}
            </p>
          </div>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            disabled={pending || creating}
            onClick={() => {
              setEntries([]);
              setError('');
              setRetry(undefined);
            }}
            aria-label="Xóa lịch sử trò chuyện"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <Trash2 size={14} />
            Xóa lịch sử
          </button>
        )}
      </div>
      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain [overflow-wrap:anywhere] p-4 sm:p-5"
        role="log"
        aria-label="Hội thoại với chatbot"
      >
        <div className="w-fit max-w-[90%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
          Xin chào! Mình là trợ lý tự động NEXUS. Bạn cần hỗ trợ về thanh toán, giao hàng hay
          hủy/trả hàng?
          <div className="mt-3 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <button
                key={topic}
                disabled={pending || creating}
                onClick={() => void send(topic)}
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`w-fit max-w-[90%] rounded-2xl px-3.5 py-2 text-sm leading-6 ${entry.mine ? 'ml-auto rounded-tr-sm bg-blue-600 text-white' : 'rounded-tl-sm border border-slate-200 bg-white text-slate-700'}`}
          >
            <p className="whitespace-pre-wrap break-words">{entry.text}</p>
            {entry.response?.sources.length ? (
              <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-400">
                Nguồn: {entry.response.sources.map((s) => s.title).join(' · ')}
              </p>
            ) : null}
            {entry.response?.order?.waybillCode && (
              <p className="mt-2 text-xs">Mã vận đơn: {entry.response.order.waybillCode}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 empty:hidden">
              {visibleActions(entry.response?.actions).map((action) =>
                action.type === 'LOGIN' ? (
                  <Link
                    key="LOGIN"
                    to="/login"
                    className="text-xs font-semibold text-blue-600 underline"
                  >
                    Đăng nhập để tiếp tục
                  </Link>
                ) : action.type === 'NAVIGATE' && action.path ? (
                  <Link
                    key={`NAVIGATE:${action.path}`}
                    to={action.path}
                    className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <ArrowUpRight size={14} />
                    {action.label || 'Chuyển trang'}
                  </Link>
                ) : (
                  onRequestSupport && (
                    <button
                      key={action.type}
                      disabled={pending || creating}
                      onClick={() => void requestSupport(entry)}
                      className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 disabled:opacity-50"
                    >
                      <Headphones size={14} />
                      {creating ? 'Đang kết nối…' : 'Liên hệ nhân viên'}
                    </button>
                  )
                ),
              )}
            </div>
          </div>
        ))}
        {pending && (
          <p role="status" className="flex items-center gap-2 text-xs text-slate-500">
            <LoaderCircle size={15} className="animate-spin" />
            Trợ lý đang trả lời…
          </p>
        )}
        <div ref={end} />
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 bg-red-50 px-4 py-3 text-xs text-red-700"
        >
          <span>{error}</span>
          {retry && (
            <button
              disabled={pending}
              onClick={() => void send(retry.message, true)}
              className="shrink-0 font-semibold underline"
            >
              Thử lại
            </button>
          )}
        </div>
      )}
      <form onSubmit={submit} className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex items-end gap-2">
          <textarea
            aria-label="Câu hỏi cho chatbot"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            disabled={pending || creating}
            rows={2}
            placeholder="Nhập câu hỏi của bạn…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-blue-500"
          />
          <button
            type="submit"
            aria-label="Gửi câu hỏi"
            disabled={pending || creating || !draft.trim()}
            className="shrink-0 rounded-xl bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            <Send size={19} />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-400">
          Trợ lý tự động · Chưa giải quyết được vấn đề? Liên hệ nhân viên hỗ trợ.
        </p>
      </form>
    </div>
  );
}
