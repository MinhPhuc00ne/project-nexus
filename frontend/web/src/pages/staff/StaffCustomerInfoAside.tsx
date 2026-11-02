import type { JSX } from 'react';
import ChatAvatar from '../../components/chat/ChatAvatar';
import type { SupportTicket } from './StaffTicketConversationView';

export interface StaffCustomerInfoAsideProps {
  activeTicket: SupportTicket | undefined;
}

export default function StaffCustomerInfoAside({
  activeTicket,
}: StaffCustomerInfoAsideProps): JSX.Element {
  return (
    <aside className="grid min-w-0 gap-3 max-[1100px]:[grid-column:1_/_-1] max-[1100px]:[grid-template-columns:repeat(3,_minmax(0,_1fr))] max-[760px]:[grid-column:auto] max-[760px]:[grid-template-columns:minmax(0,_1fr)]">
      {activeTicket ? (
        <>
          <section className="staff-customer-card rounded-xl border border-[#e9eaf2] bg-white p-3 shadow-[0_4px_14px_rgb(30_42_72_/_3%)]">
            <div className="mb-2.5 flex items-center justify-between gap-1 text-[8px] font-extrabold uppercase tracking-wider text-[#92909b]">
              HỒ SƠ KHÁCH HÀNG
            </div>
            <div className="flex items-center gap-2.5">
              <ChatAvatar src={activeTicket.avatarUrl} name={activeTicket.customer} />
              <div className="grid min-w-0 gap-0.5">
                <b className="truncate text-[10px] text-slate-800">{activeTicket.customer}</b>
                <small className="truncate text-[8px] text-[#9b8f96]">
                  Mã khách: {activeTicket.customerId || 'Chưa có thông tin'}
                </small>
                <small className="truncate text-[8px] text-[#9b8f96]">
                  Vai trò: {activeTicket.role}
                </small>
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-[#e9eaf2] bg-white p-3 shadow-[0_4px_14px_rgb(30_42_72_/_3%)]">
            <div className="mb-2.5 flex items-center justify-between gap-1 text-[8px] font-extrabold uppercase tracking-wider text-[#92909b]">
              DỮ LIỆU LIÊN QUAN
            </div>
            <div className="space-y-1.5 text-[9px] text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Chuyên mục:</span>
                <span className="font-semibold">
                  {activeTicket.category === 'Shipping'
                    ? 'Vận chuyển'
                    : activeTicket.category === 'Escrow'
                      ? 'Thanh toán'
                      : activeTicket.category === 'Auction 3D'
                        ? 'Đấu giá 3D'
                        : 'Hỗ trợ chung'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chủ đề:</span>
                <span className="max-w-[120px] truncate font-semibold">
                  {activeTicket.subject || 'Hỗ trợ trực tuyến'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trạng thái:</span>
                <span className="font-semibold text-blue-600">
                  {activeTicket.status === 'waiting'
                    ? 'Chờ tiếp nhận'
                    : activeTicket.status === 'resolved'
                      ? 'Đã hoàn tất'
                      : 'Đang xử lý'}
                </span>
              </div>
              {typeof activeTicket.waitingTimeSeconds === 'number' && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Thời gian chờ:</span>
                  <span className="font-semibold text-amber-600">
                    {Math.floor(activeTicket.waitingTimeSeconds / 60)} phút
                  </span>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-xl border border-[#e9eaf2] bg-white p-3 shadow-[0_4px_14px_rgb(30_42_72_/_3%)]">
          <div className="mb-2.5 flex items-center justify-between gap-1 text-[8px] font-extrabold uppercase tracking-wider text-[#92909b]">
            HỒ SƠ KHÁCH HÀNG
          </div>
          <p className="text-[9px] text-slate-400">Chọn một ticket để xem thông tin khách hàng.</p>
        </section>
      )}
    </aside>
  );
}
