// Danh sách yêu cầu hoàn tiền dùng ở Tổng quan và trang Hoàn tiền; cùng gọi action của layout.

import { RefreshCcw } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { formatMoney } from '../shared/adminData';
import type { AdminTabProps } from '../shared/adminTypes';

// Danh sách hoàn tiền chờ quyết định; preview dùng bản rút gọn trong Tổng quan.
// Tab gọi actions.reviewRefund, còn hộp thoại xác nhận và cập nhật data nằm ở AdminLayout.
export default function RefundRequestsPanel({
  data,
  actions,
  preview = false,
  orderId,
}: AdminTabProps & { preview?: boolean; orderId?: string }) {
  const [search, setSearch] = useState('');
  // Phê duyệt/bác bỏ xong, trạng thái không còn pending nên hồ sơ rời danh sách này.
  const pending = data.refunds.filter(
    (item) => item.status === 'pending' && (!orderId || item.id === orderId),
  );
  // Tìm theo mã đơn hoặc tên sản phẩm; không thay đổi dữ liệu gốc.
  const visible = pending.filter((item) =>
    `${item.id} ${item.product}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Panel
      title="Phán quyết hoàn tiền cuối cùng"
      subtitle="Khiếu nại được Support Staff điều tra & trình Admin quyết định"
      icon={<RefreshCcw size={19} />}
      action={<Badge tone="amber">{pending.length} cần phán quyết</Badge>}
    >
      {!preview && (
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm mã đơn hoặc sản phẩm..."
          />
        </div>
      )}
      {/* Bản rút gọn hiển thị 2 hồ sơ; tab đầy đủ hiển thị toàn bộ kết quả tìm kiếm. */}
      <div className={preview ? 'space-y-3' : 'grid gap-4 xl:grid-cols-2'}>
        {(preview ? visible.slice(0, 2) : visible).map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-blue-100/60 bg-slate-50/80 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold">Đơn #{item.id}</h3>
                <p className="mt-1 text-[11px] text-slate-500">{item.product}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-primary">{formatMoney(item.amount)}</p>
                <span className="text-[10px] text-slate-400">Tạm giữ ký quỹ</span>
              </div>
            </div>
            <div className="my-3">
              <Badge>{item.gateway}</Badge>
            </div>
            <div className="rounded-lg bg-blue-50/80 p-3 text-[11px] leading-relaxed">
              <p>
                <span className="font-semibold text-primary">Báo cáo Support Staff: </span>
                {item.report}
              </p>
              <p className="mt-2">
                <span className="font-semibold">Đề xuất: </span>
                {item.recommendation}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  actions.showDetail(
                    `Bằng chứng #${item.id}`,
                    `${item.report}\n\nĐề xuất của Staff: ${item.recommendation}\n\nVideo unboxing và log giao hàng chưa được kết nối trong bản demo.`,
                  )
                }
              >
                Xem bằng chứng
              </Button>
              <Button variant="danger" onClick={() => actions.reviewRefund(item.id, 'rejected')}>
                Bác bỏ khiếu nại
              </Button>
              <Button onClick={() => actions.reviewRefund(item.id, 'approved')}>
                Chấp thuận hoàn tiền
              </Button>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && <EmptyState />}
      {preview && (
        <button
          onClick={() => actions.navigate('refunds')}
          className="mt-4 text-xs font-semibold text-primary hover:underline"
        >
          Xem tất cả yêu cầu →
        </button>
      )}
    </Panel>
  );
}
