import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Headset, MessageCircle } from 'lucide-react';
import { getStoredToken, getStoredUser } from '../../services/auth';
import { requestAuctionSupportChatApi } from '../../services/auction.service';
import { openChatConversation } from '../chat/chatEvents';

export default function AuctionSupportRequest({ auctionId }: { auctionId: string }) {
  const user = getStoredUser();
  const canRequest = Boolean(
    getStoredToken() && (user?.role === 'BUYER' || user?.role === 'SELLER'),
  );
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = message.trim();
    if (!body || pending) return;
    setPending(true);
    setError('');
    try {
      const conversation = await requestAuctionSupportChatApi(auctionId, body);
      setOpen(false);
      setMessage('');
      openChatConversation(conversation.id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Không gửi được yêu cầu hỗ trợ. Vui lòng thử lại.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-white p-2.5 text-primary shadow-sm">
            <Headset size={20} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Cần hỗ trợ trong phiên đấu giá?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Gửi câu hỏi trực tiếp đến đội ngũ hỗ trợ về phiên này.
            </p>
          </div>
        </div>
        {canRequest ? (
          <button
            type="button"
            onClick={() => {
              setError('');
              setOpen(true);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <MessageCircle size={16} /> Yêu cầu hỗ trợ
          </button>
        ) : getStoredToken() ? (
          <span className="text-sm text-slate-500">
            Tính năng này dành cho tài khoản Buyer hoặc Seller.
          </span>
        ) : (
          <Link
            to="/login"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Đăng nhập để liên hệ
          </Link>
        )}
      </section>
      {open && (
        <div
          className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="auction-support-title"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <h2 id="auction-support-title" className="text-lg font-bold text-slate-900">
              Yêu cầu hỗ trợ phiên đấu giá
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tin nhắn sẽ được gửi kèm mã phiên để nhân viên nắm được ngữ cảnh.
            </p>
            <form onSubmit={(event) => void submit(event)} className="mt-4">
              <label
                htmlFor="auction-support-message"
                className="text-xs font-semibold text-slate-700"
              >
                Nội dung cần hỗ trợ
              </label>
              <textarea
                id="auction-support-message"
                autoFocus
                required
                maxLength={1500}
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Mô tả vấn đề bạn gặp trong phiên đấu giá…"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>Tối đa 1.500 ký tự</span>
                <span>{message.length}/1500</span>
              </div>
              {error && (
                <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={pending || !message.trim()}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? 'Đang gửi…' : 'Gửi yêu cầu'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
