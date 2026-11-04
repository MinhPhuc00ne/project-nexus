import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, Headphones, Package, LoaderCircle } from 'lucide-react';
import {
  getChatbotCapabilities,
  sendChatbotMessage,
  type ChatbotReply,
} from '../../services/chatbot';
import { getChatErrorMessage } from './chatUtils';
interface Props {
  guest?: boolean;
  onRequestSupport?: (message: string, orderId?: string) => Promise<void>;
  creating?: boolean;
}
interface Entry {
  id: number;
  text: string;
  mine?: boolean;
  response?: ChatbotReply;
  question?: string;
  orderId?: string;
}
const suggestions = [
  'Chính sách giao hàng',
  'Trả hàng và hoàn tiền',
  'Hủy đơn hàng',
  'Phương thức thanh toán',
];
export default function ChatbotPanel({ guest = false, onRequestSupport, creating }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState('');
  const [orderId, setOrderId] = useState('');
  const [selectOrder, setSelectOrder] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [topics, setTopics] = useState(suggestions);
  const [retry, setRetry] = useState<{ message: string; orderId?: string }>();
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const nextId = useRef(0);
  const end = useRef<HTMLDivElement>(null);
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
  async function send(message: string, selectedOrder?: string, isRetry = false) {
    const text = message.trim();
    if (!text || text.length > 2000 || busy.current || creating) return;
    if (
      selectedOrder &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedOrder)
    ) {
      setError('Nhập mã đơn NEXUS dạng UUID, không dùng mã vận đơn GHN.');
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    setRetry(undefined);
    const abort = new AbortController();
    controller.current = abort;
    if (!isRetry)
      setEntries((current) => [
        ...current,
        {
          id: ++nextId.current,
          text: selectedOrder ? `${text}\nMã đơn: ${selectedOrder}` : text,
          mine: true,
        },
      ]);
    setDraft('');
    try {
      const response = await sendChatbotMessage(text, guest, selectedOrder, abort.signal);
      if (!abort.signal.aborted) {
        setEntries((current) => [
          ...current,
          {
            id: ++nextId.current,
            text: response.reply,
            response,
            question: text,
            orderId: selectedOrder,
          },
        ]);
        setSelectOrder(false);
        setOrderId('');
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        setError(getChatErrorMessage(err));
        setRetry({ message: text, orderId: selectedOrder });
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
    void send(
      draft || (selectOrder ? 'Tra cứu đơn hàng' : ''),
      selectOrder ? orderId.trim() || undefined : undefined,
    );
  }
  async function requestSupport(entry: Entry) {
    if (!onRequestSupport || creating) return;
    setError('');
    try {
      await onRequestSupport(entry.question || 'Tôi cần nhân viên hỗ trợ.', entry.orderId);
    } catch (err) {
      setError(getChatErrorMessage(err));
    }
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50">
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
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
              {Array.from(new Set(entry.response?.actions.map((a) => a.type))).map((action) =>
                action === 'LOGIN' ? (
                  <Link
                    key={action}
                    to="/login"
                    className="text-xs font-semibold text-blue-600 underline"
                  >
                    Đăng nhập để tiếp tục
                  </Link>
                ) : action === 'SELECT_ORDER' ? (
                  <button
                    key={action}
                    disabled={pending || creating}
                    onClick={() => setSelectOrder(true)}
                    className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700"
                  >
                    <Package size={14} />
                    Tra cứu đơn hàng
                  </button>
                ) : (
                  onRequestSupport && (
                    <button
                      key={action}
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
              onClick={() => void send(retry.message, retry.orderId, true)}
              className="shrink-0 font-semibold underline"
            >
              Thử lại
            </button>
          )}
        </div>
      )}
      <form onSubmit={submit} className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
        {selectOrder && (
          <div className="mb-3">
            <label className="text-xs font-medium text-slate-600" htmlFor="chatbot-order-id">
              Mã đơn NEXUS (UUID, không phải mã vận đơn)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="chatbot-order-id"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                disabled={pending}
                required
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                placeholder="Dán mã đơn hàng của bạn"
              />
              <button
                type="button"
                onClick={() => setSelectOrder(false)}
                className="text-xs text-slate-500"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
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
            disabled={pending || creating || (!draft.trim() && !selectOrder)}
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
