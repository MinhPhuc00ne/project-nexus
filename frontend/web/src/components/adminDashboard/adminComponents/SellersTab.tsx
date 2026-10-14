import { Store } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, EmptyState, Panel, SearchInput } from './AdminUI';
import type { AdminTabProps } from './adminTypes';

// Dùng ở cả tab Seller và Tổng quan. preview=true ẩn tìm kiếm và giới hạn 2 hồ sơ.
export default function SellersTab({
  data,
  actions,
  preview = false,
}: AdminTabProps & { preview?: boolean }) {
  const [search, setSearch] = useState('');
  // Chỉ hiển thị pending: hồ sơ vừa duyệt/từ chối sẽ tự biến mất khỏi hàng chờ.
  const pending = data.sellers.filter((seller) => seller.status === 'pending');
  // Ghép tên gian hàng và chủ sở hữu để tìm trên cả hai trường, không phân biệt hoa/thường.
  const visible = pending.filter((seller) =>
    `${seller.name} ${seller.owner}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Panel
      title="Phê duyệt nâng cấp Seller"
      subtitle="Hồ sơ thẩm định Buyer → mở gian hàng kinh doanh"
      icon={<Store size={19} />}
      action={<Badge>{pending.length} hồ sơ chờ</Badge>}
    >
      {!preview && (
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm tên gian hàng hoặc chủ sở hữu..."
          />
        </div>
      )}
      {/* slice tạo danh sách rút gọn, không cắt hoặc sửa danh sách gốc. */}
      <div className={preview ? 'space-y-3' : 'grid gap-4 xl:grid-cols-2'}>
        {(preview ? visible.slice(0, 2) : visible).map((seller) => (
          <article
            key={seller.id}
            className="rounded-xl border border-blue-100/60 bg-slate-50/80 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-primary">
                {seller.initials}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-slate-900">
                  {seller.name} ({seller.owner})
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  MST / Số đăng ký: {seller.registration}
                </p>
              </div>
              <Badge>Tín nhiệm {seller.rating} ★</Badge>
            </div>
            <div className="my-3 grid grid-cols-3 gap-2 rounded-lg bg-blue-50/80 p-2.5 text-[10px]">
              <div>
                <p className="text-slate-500">Lịch sử Buyer</p>
                <p className="mt-1 font-semibold">{seller.orders} đơn thành công</p>
              </div>
              <div>
                <p className="text-slate-500">Tỷ lệ hủy</p>
                <p className="mt-1 font-semibold text-primary">0% (Hoàn hảo)</p>
              </div>
              <div>
                <p className="text-slate-500">Chuyên mục</p>
                <p className="mt-1 font-semibold">{seller.category}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  actions.showDetail(
                    `Hồ sơ ${seller.name}`,
                    `Chủ sở hữu: ${seller.owner}\nSố đăng ký: ${seller.registration}\nChuyên mục: ${seller.category}\nLịch sử: ${seller.orders} đơn thành công\n\nBản demo chưa có tệp giấy phép đính kèm.`,
                  )
                }
              >
                Xem hồ sơ
              </Button>
              <Button variant="danger" onClick={() => actions.reviewSeller(seller.id, 'rejected')}>
                Từ chối
              </Button>
              <Button onClick={() => actions.reviewSeller(seller.id, 'approved')}>
                Phê duyệt & mở gian hàng
              </Button>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && <EmptyState />}
      {preview && (
        <button
          onClick={() => actions.navigate('sellers')}
          className="mt-4 text-xs font-semibold text-primary hover:underline"
        >
          Xem tất cả hồ sơ →
        </button>
      )}
    </Panel>
  );
}
