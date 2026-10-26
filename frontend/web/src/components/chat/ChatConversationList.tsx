import type { FormEvent, JSX } from 'react';
import { Plus } from 'lucide-react';
import type { ChatConversation, ChatConversationType } from '../../types/chat.types';

interface ChatConversationListProps {
  conversations: ChatConversation[];
  activeId?: string;
  onSelect: (conversation: ChatConversation) => void;
  search: string;
  onSearchChange: (value: string) => void;
  participantId: string;
  onParticipantIdChange: (value: string) => void;
  type: ChatConversationType;
  onTypeChange: (value: ChatConversationType) => void;
  creating: boolean;
  onCreateConversation: () => void;
  hasMorePages: boolean;
  onLoadMore: () => void;
  hiddenOnMobile: boolean;
}

export default function ChatConversationList({
  conversations,
  activeId,
  onSelect,
  search,
  onSearchChange,
  participantId,
  onParticipantIdChange,
  type,
  onTypeChange,
  creating,
  onCreateConversation,
  hasMorePages,
  onLoadMore,
  hiddenOnMobile,
}: ChatConversationListProps): JSX.Element {
  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    onCreateConversation();
  };

  return (
    <aside
      className={`${hiddenOnMobile ? 'max-sm:hidden' : ''} flex w-64 shrink-0 flex-col border-r border-slate-100 max-sm:w-full`}
    >
      <div className="space-y-3 border-b border-slate-100 p-3">
        <input
          aria-label="Tìm hội thoại"
          placeholder="Tìm cuộc trò chuyện…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm outline-blue-500"
        />
        <details>
          <summary className="flex cursor-pointer items-center gap-1 text-sm font-medium text-blue-600">
            <Plus size={16} /> Cuộc trò chuyện mới
          </summary>
          <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
            <input
              required
              aria-label="ID người nhận"
              placeholder="ID tài khoản người nhận"
              value={participantId}
              onChange={(e) => onParticipantIdChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            />
            <select
              aria-label="Loại hội thoại"
              value={type}
              onChange={(e) => onTypeChange(e.target.value as ChatConversationType)}
              className="w-full rounded-lg border border-slate-200 p-2 text-sm"
            >
              <option value="BUYER_SELLER">Người mua – Người bán</option>
              <option value="STAFF_BUYER">Hỗ trợ – Người mua</option>
              <option value="STAFF_SELLER">Hỗ trợ – Người bán</option>
              <option value="GENERAL">Trao đổi chung</option>
            </select>
            <button
              disabled={creating}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm text-white disabled:opacity-50"
            >
              {creating ? 'Đang mở…' : 'Bắt đầu chat'}
            </button>
          </form>
        </details>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="p-5 text-center text-sm text-slate-500">
            Chưa có cuộc trò chuyện. Bắt đầu chat với một tài khoản khác.
          </p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`flex w-full gap-3 border-b border-slate-50 p-3 text-left hover:bg-blue-50 ${activeId === c.id ? 'bg-blue-50' : ''}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
              {c.partner.fullName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {c.partner.storeName || c.partner.fullName}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {c.lastMessage || 'Bắt đầu trò chuyện'}
              </span>
            </span>
            {c.unreadCount > 0 && (
              <span className="h-fit rounded-full bg-blue-600 px-1.5 text-xs text-white">
                {c.unreadCount}
              </span>
            )}
          </button>
        ))}
        {hasMorePages && (
          <button onClick={onLoadMore} className="w-full p-3 text-sm text-blue-600">
            Xem thêm hội thoại
          </button>
        )}
      </div>
    </aside>
  );
}
