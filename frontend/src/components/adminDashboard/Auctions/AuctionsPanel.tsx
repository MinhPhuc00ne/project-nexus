// Bảng phiên đấu giá dùng ở Tổng quan và trang Đấu giá: lọc trạng thái, tìm kiếm, duyệt lịch.

import { Box, Gavel, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { formatMoney } from '../shared/adminData';
import { mockSettings } from '../Settings/mockData/settings';
import type { AdminTabProps } from '../shared/adminTypes';

// Quản lý danh sách phiên. preview chỉ ẩn một số công cụ, vẫn giữ bảng và bộ lọc trạng thái.
export default function AuctionsPanel({
  data,
  actions,
  preview = false,
}: AdminTabProps & { preview?: boolean }) {
  // Bộ lọc/từ khóa là state riêng của tab, không lưu vào dữ liệu chung ở AdminLayout.
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  // Kết quả cần đồng thời khớp trạng thái và từ khóa. 'all' bỏ điều kiện trạng thái.
  const items = data.auctions.filter(
    (item) =>
      (filter === 'all' || item.status === filter) &&
      `${item.name} ${item.seller}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Panel
      title="Điều hành phiên đấu giá 3D & tiếp nhận vật phẩm"
      subtitle="Vật phẩm theo preset được ánh xạ sang mô hình 3D. Vật phẩm ngoài danh mục sử dụng 3D Gallery Frame."
      icon={<Gavel size={19} />}
      action={<Badge>Thu phí sàn 16%</Badge>}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">
          {[
            ['pending', 'Chờ duyệt'],
            ['scheduled', 'Đã duyệt'],
            ['live', 'Đang live'],
            ['all', 'Tất cả'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-2 text-[11px] font-semibold ${filter === value ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
            >
              {label} (
              {data.auctions.filter((item) => value === 'all' || item.status === value).length})
            </button>
          ))}
        </div>
        {!preview && (
          <Button onClick={() => actions.navigate('studio')}>
            <Plus size={14} />
            Mở studio đấu giá
          </Button>
        )}
      </div>
      {!preview && (
        <div className="mb-4 max-w-sm">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm vật phẩm hoặc Seller..."
          />
        </div>
      )}
      {/* Giữ bảng tối thiểu 760px để đọc rõ các cột, mobile cuộn ngang trong card này. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-blue-50/80 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              {[
                'Vật phẩm & Seller',
                'Giá khởi điểm / cọc 10%',
                'Cơ chế phân bổ 3D',
                'Phí sàn',
                'Thời điểm dự kiến',
                'Thao tác',
              ].map((label) => (
                <th key={label} className="px-3 py-4 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70">
                <td className="px-3 py-5">
                  <div className="flex max-w-64 items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-12 rounded-lg object-contain"
                        />
                      ) : (
                        <Box size={23} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold leading-relaxed">{item.name}</p>
                      <p className="mt-1 text-[10px] text-slate-500">Seller: {item.seller}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-5">
                  <p className="font-bold">{formatMoney(item.price)}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Cọc 10%: <span className="text-primary">{formatMoney(item.price * 0.1)}</span>
                  </p>
                </td>
                <td className="px-3 py-5">
                  <span className="inline-flex max-w-36 items-center gap-2 rounded-lg bg-blue-50 p-2 text-[10px] font-semibold text-primary">
                    <Box size={16} className="shrink-0" />
                    {item.preset}
                    <br />
                    (WebGL GLB)
                  </span>
                </td>
                <td className="px-3 py-5 font-bold text-primary">
                  {mockSettings.auctionFee}%
                  <br />
                  <span className="text-[10px] font-normal">Chốt phiên</span>
                </td>
                <td className="px-3 py-5">
                  <p>{item.time}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Thời lượng: {item.duration} phút
                  </p>
                </td>
                <td className="px-3 py-5">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        actions.showDetail(
                          item.name,
                          `Mã phiên: ${item.id}\nSeller: ${item.seller}\nMô hình: ${item.preset}\nGiá khởi điểm: ${formatMoney(item.price)}\n\nBản xem trước WebGL sẽ được tích hợp sau.`,
                        )
                      }
                    >
                      Xem thử 3D
                    </Button>
                    {item.status === 'pending' ? (
                      <Button onClick={() => actions.approveAuction(item.id)}>Duyệt lịch</Button>
                    ) : (
                      <Badge tone={item.status === 'live' ? 'green' : 'blue'}>
                        {item.status === 'live' ? 'Đang live' : 'Đã duyệt'}
                      </Badge>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && <EmptyState />}
    </Panel>
  );
}
