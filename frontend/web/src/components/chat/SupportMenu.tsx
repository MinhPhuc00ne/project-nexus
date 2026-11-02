import { useState, type JSX } from 'react';
import {
  ArrowLeft,
  Truck,
  RotateCcw,
  ShieldAlert,
  Headphones,
  ChevronRight,
  Package,
} from 'lucide-react';
import type { ChatConversation } from '../../types/chat.types';
import ChatAvatar from './ChatAvatar';

const categories = [
  {
    id: 'SHIPPING',
    title: 'Giao hàng',
    description: 'Chậm giao, theo dõi vận chuyển, thất lạc hàng',
    icon: Truck,
  },
  {
    id: 'RETURN',
    title: 'Trả hàng & hoàn tiền',
    description: 'Đổi trả sản phẩm, kiểm tra hoàn tiền',
    icon: RotateCcw,
  },
  {
    id: 'COMPLAINT',
    title: 'Khiếu nại',
    description: 'Sản phẩm, giao dịch hoặc hành vi vi phạm',
    icon: ShieldAlert,
  },
  {
    id: 'LIVE_CHAT',
    title: 'Chat trực tiếp với Staff',
    description: 'Trao đổi với nhân viên về vấn đề khác',
    icon: Headphones,
  },
];

interface SupportMenuProps {
  conversations: ChatConversation[];
  onOpenConversation: (conversation: ChatConversation) => void;
  onSendSupportMessage: (request: {
    category: string;
    description: string;
    orderId?: string;
  }) => Promise<void>;
  sending: boolean;
}

export default function SupportMenu({
  conversations,
  onOpenConversation,
  onSendSupportMessage,
  sending,
}: SupportMenuProps): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState('');
  const category = categories.find((item) => item.id === selected);
  const staffChats = conversations.filter(
    (c) => c.type === 'STAFF_BUYER' || c.type === 'STAFF_SELLER' || c.type === 'SUPPORT_TICKET',
  );

  async function submitSupportMessage(): Promise<void> {
    if (!category || !description.trim() || sending) return;
    try {
      await onSendSupportMessage({
        category: category.title,
        description: description.trim(),
        ...(orderId.trim() ? { orderId: orderId.trim() } : {}),
      });
    } catch {
      return;
    }
    setSelected(null);
    setDescription('');
    setOrderId('');
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5 sm:p-6">
      {!category ? (
        <>
          <div className="mb-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Trung tâm hỗ trợ Nexus
            </span>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Bạn cần hỗ trợ điều gì?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Chọn vấn đề để chuẩn bị yêu cầu gửi đến nhân viên hỗ trợ.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map(({ id, title, description: detail, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-sm focus-visible:outline-blue-500"
              >
                <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <Icon size={22} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-slate-800">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span>
                </span>
                <ChevronRight size={16} className="mt-1 text-slate-400" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => setSelected(null)}
            className="mb-4 flex items-center gap-2 text-sm text-blue-600"
          >
            <ArrowLeft size={16} /> Các mục hỗ trợ
          </button>
          <h3 className="text-xl font-bold text-slate-900">{category.title}</h3>
          <p className="mb-5 mt-1 text-sm text-slate-500">{category.description}</p>
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <label className="block text-sm font-medium">
              Mã đơn hàng <span className="font-normal text-slate-400">(không bắt buộc)</span>
              <span className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3">
                <Package size={16} className="text-slate-400" />
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  maxLength={80}
                  placeholder="Nhập mã đơn liên quan"
                  className="w-full bg-transparent py-2.5 font-normal outline-none"
                />
              </span>
            </label>
            <label className="block text-sm font-medium">
              Nội dung cần hỗ trợ
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={800}
                rows={4}
                placeholder="Mô tả vấn đề và thông tin cần nhân viên hỗ trợ…"
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 p-3 font-normal outline-blue-500"
              />
            </label>
            <p className="text-right text-xs text-slate-400">{description.length}/800</p>
            <p
              role="status"
              className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800"
            >
              Nội dung sẽ được gửi thành tin nhắn trong hội thoại với bộ phận hỗ trợ. Mã đơn hàng,
              nếu có, sẽ được đính kèm trong nội dung tin nhắn.
            </p>
            <button
              type="button"
              disabled={!description.trim() || sending}
              onClick={() => void submitSupportMessage()}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {sending ? 'Đang gửi…' : 'Gửi tin nhắn hỗ trợ'}
            </button>
          </div>
        </>
      )}
      <div className="mt-6">
        <h4 className="mb-3 text-sm font-semibold text-slate-800">Hội thoại hỗ trợ của bạn</h4>
        {staffChats.length ? (
          <div className="space-y-2">
            {staffChats.map((c) => (
              <button
                key={c.id}
                onClick={() => onOpenConversation(c)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-blue-400"
              >
                <ChatAvatar src={c.partner.avatarUrl} name={c.partner.fullName} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.partner.fullName}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {c.lastMessage || 'Tiếp tục trao đổi với nhân viên'}
                  </span>
                </span>
                {c.unreadCount > 0 && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                    {c.unreadCount}
                  </span>
                )}
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Chưa có hội thoại hỗ trợ trong danh sách đã tải.
          </p>
        )}
      </div>
    </div>
  );
}
