import { useState, type JSX } from 'react';
import ChatAvatar from '../../components/chat/ChatAvatar';
import { Copy, Check, ShieldCheck, Clock, Tag, UserCheck, AlertCircle } from 'lucide-react';
import type { SupportTicket } from './StaffTicketConversationView';

function formatCustomerRole(role: string): string {
  if (role === 'SELLER') return 'Người bán';
  if (role === 'BUYER') return 'Người mua';
  if (role === 'SELLER VERIFIED') return 'Người bán đã xác minh';
  if (role === 'VIP GOLD') return 'VIP';
  return role;
}

export interface StaffCustomerInfoAsideProps {
  activeTicket: SupportTicket | undefined;
}

export default function StaffCustomerInfoAside({
  activeTicket,
}: StaffCustomerInfoAsideProps): JSX.Element {
  const [copiedId, setCopiedId] = useState(false);

  function copyCustomerId() {
    if (!activeTicket?.customerId) return;
    void navigator.clipboard.writeText(activeTicket.customerId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  return (
    <aside className="support-customer-aside custom-scrollbar flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      {activeTicket ? (
        <>
          {/* Card 1: Customer Profile (100% Real Data from Active Ticket) */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <UserCheck size={13} className="text-blue-600" /> Hồ Sơ Khách Hàng
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                  activeTicket.role === 'VIP GOLD'
                    ? 'bg-amber-100 text-amber-800'
                    : activeTicket.role === 'SELLER VERIFIED' || activeTicket.role === 'SELLER'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {formatCustomerRole(activeTicket.role)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ChatAvatar src={activeTicket.avatarUrl} name={activeTicket.customer} size={42} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-bold text-slate-900">
                  {activeTicket.customer}
                </b>
                <div className="mt-1 flex items-center gap-1">
                  <span
                    className="truncate font-mono text-[10px] text-slate-400"
                    title={activeTicket.customerId}
                  >
                    ID:{' '}
                    {activeTicket.customerId
                      ? `${activeTicket.customerId.slice(0, 12)}…`
                      : 'Chưa có'}
                  </span>
                  {activeTicket.customerId && (
                    <button
                      type="button"
                      onClick={copyCustomerId}
                      title={copiedId ? 'Đã sao chép mã khách hàng' : 'Sao chép mã khách hàng'}
                      aria-label={copiedId ? 'Đã sao chép mã khách hàng' : 'Sao chép mã khách hàng'}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedId ? (
                        <Check size={11} className="text-emerald-600" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Ticket Context & Related Data (100% Real Data from Active Ticket) */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <Tag size={13} className="text-blue-600" /> Dữ Liệu Liên Quan
              </span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Chuyên mục:</span>
                <span className="font-semibold text-slate-800">
                  {activeTicket.category === 'Shipping'
                    ? 'Vận chuyển GHN'
                    : activeTicket.category === 'Escrow'
                      ? 'Thanh toán Escrow'
                      : activeTicket.category === 'Auction 3D'
                        ? 'Đấu giá 3D'
                        : 'Hỗ trợ chung'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Chủ đề:</span>
                <span
                  className="max-w-[140px] truncate font-semibold text-slate-800"
                  title={activeTicket.subject}
                >
                  {activeTicket.subject || 'Hỗ trợ trực tuyến'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Trạng thái:</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    activeTicket.status === 'waiting'
                      ? 'text-amber-600'
                      : activeTicket.status === 'resolved'
                        ? 'text-emerald-600'
                        : 'text-blue-600'
                  }`}
                >
                  {activeTicket.status === 'waiting'
                    ? 'Chờ tiếp nhận'
                    : activeTicket.status === 'resolved'
                      ? 'Đã hoàn tất'
                      : 'Đang xử lý'}
                </span>
              </div>

              {typeof activeTicket.waitingTimeSeconds === 'number' && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Thời gian chờ:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                    <Clock size={11} /> {Math.floor(activeTicket.waitingTimeSeconds / 60)} phút
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Card 3: Support Guidelines / Tips for Staff */}
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-blue-900 mb-2">
              <ShieldCheck size={14} className="text-blue-600" />
              Lưu Ý Nghiệp Vụ
            </div>
            <ul className="space-y-1.5 text-[10.5px] text-slate-600">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold">•</span>
                <span>Cam kết SLA phản hồi dưới 5 phút cho khách hàng.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold">•</span>
                <span>Kiểm tra kỹ mã vận đơn và tiền cọc trước khi xác nhận.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold">•</span>
                <span>Bấm "Hoàn tất" khi khách hàng đã được giải đáp đầy đủ.</span>
              </li>
            </ul>
          </section>
        </>
      ) : (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-xs">
          <AlertCircle size={28} className="text-slate-300 mb-2" />
          <p className="text-[11px] font-medium text-slate-500">
            Chọn một ticket trong hàng đợi để xem chi tiết hồ sơ khách hàng.
          </p>
        </section>
      )}
    </aside>
  );
}
