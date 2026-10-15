import { ChartNoAxesCombined, CircleDollarSign, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Badge, Panel } from './AdminUI';
import { formatMoney } from './adminData';

// Mỗi phần tử là một kỳ thống kê mẫu. total/auction/normal tính bằng VND.
// auctionValues/normalValues tính bằng triệu VND để vẽ SVG, là chuỗi minh họa riêng
// và chưa được tính từ các tổng ở trên. Khi nối API cần trả về chuỗi và tổng đồng nhất.
const periods = [
  {
    label: '7 ngày',
    total: 438500000,
    auction: 226200000,
    normal: 212300000,
    unit: 'tuần này',
    labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'],
    auctionValues: [40, 90, 65, 120, 150, 180, 172],
    normalValues: [60, 78, 95, 108, 132, 146, 135],
  },
  {
    label: '30 ngày',
    total: 1842500000,
    auction: 918200000,
    normal: 924300000,
    unit: '30 ngày',
    labels: ['Ngày 1', 'Ngày 5', 'Ngày 10', 'Ngày 15', 'Ngày 20', 'Ngày 25', 'Ngày 30'],
    auctionValues: [52, 70, 95, 82, 140, 165, 190],
    normalValues: [48, 85, 82, 110, 125, 150, 175],
  },
  {
    label: 'Tháng này',
    total: 1258000000,
    auction: 640000000,
    normal: 618000000,
    unit: 'tháng này',
    labels: ['Ngày 1', 'Ngày 3', 'Ngày 5', 'Ngày 7', 'Ngày 9', 'Ngày 11', 'Ngày 14'],
    auctionValues: [30, 58, 100, 88, 132, 175, 162],
    normalValues: [45, 62, 75, 108, 115, 138, 152],
  },
  {
    label: 'Năm 2026',
    total: 18650000000,
    auction: 9400000000,
    normal: 9250000000,
    unit: 'năm nay',
    labels: ['Tháng 1', 'Tháng 3', 'Tháng 5', 'Tháng 7', 'Tháng 9', 'Tháng 10', 'Tháng 12'],
    auctionValues: [45, 80, 72, 115, 152, 178, 192],
    normalValues: [38, 65, 88, 102, 130, 148, 168],
  },
];

export function RevenueChart() {
  // period là vị trí kỳ được chọn trong mảng; hovered là vị trí điểm đang được rê chuột.
  const [period, setPeriod] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const current = periods[period];
  // Chuyển số liệu thành chuỗi tọa độ SVG "x,y x,y ..." cho polyline/polygon.
  // x bắt đầu 48 và cách nhau 76; y=236-value vì trục y của SVG tăng từ trên xuống.
  // Hàm hiện thiết kế cho 7 điểm, giá trị 0–200; đổi số điểm/thang đo cần tính lại tọa độ.
  const coords = (values: number[]) =>
    values.map((value, index) => `${48 + index * 76},${236 - value}`).join(' ');
  return (
    <Panel
      title="Biểu đồ xu hướng doanh thu phí sàn & tỷ trọng"
      subtitle="Phân tích dòng tiền phí 16% (đấu giá 3D) và phí 7% (đơn TMĐT) theo thời gian"
      icon={<ChartNoAxesCombined size={19} />}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-slate-50 p-1">
          {periods.map((item, index) => (
            <button
              key={item.label}
              onClick={() => {
                setPeriod(index);
                setHovered(null);
              }}
              className={`rounded-md px-3 py-2 text-[11px] ${period === index ? 'bg-white font-bold text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Badge>₫ VND</Badge>
      </div>
      <div className="mb-7 grid gap-4 rounded-xl bg-blue-50/70 p-4 sm:grid-cols-3">
        <div>
          <p className="text-[9px] uppercase text-slate-500">Tổng phí sàn {current.unit}</p>
          <p className="mt-1 text-base font-bold tracking-tight">{formatMoney(current.total)}</p>
          <span className="mt-1 flex items-center gap-1 text-[10px] text-primary">
            <TrendingUp size={12} />
            +18.4% so với kỳ trước
          </span>
        </div>
        <div>
          <p className="text-[9px] uppercase text-slate-500">Phí đấu giá 3D (16%)</p>
          <p className="mt-1 text-base font-bold text-primary">{formatMoney(current.auction)}</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Tỷ trọng: {((current.auction / current.total) * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-slate-500">Phí đơn thường (7%)</p>
          <p className="mt-1 text-base font-bold text-blue-500">{formatMoney(current.normal)}</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Tỷ trọng: {((current.normal / current.total) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-primary" />
            Phí đấu giá 3D (16%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-blue-400" />
            Phí đơn thường (7%)
          </span>
        </div>
        <span>Đơn vị: Triệu VND</span>
      </div>
      {/* viewBox giữ hệ tọa độ cố định; w-full co biểu đồ theo chiều rộng card. */}
      <div className="relative rounded-xl bg-slate-50/80 p-2">
        <svg
          viewBox="0 0 550 275"
          role="img"
          aria-label={`Biểu đồ phí sàn ${current.label}`}
          className="w-full"
          onMouseLeave={() => setHovered(null)}
        >
          {/* Gradient dùng cho vùng tô dưới đường biểu đồ; màu primary lấy từ theme chung. */}
          <defs>
            <linearGradient id="admin-chart-auction" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity=".2" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity=".01" />
            </linearGradient>
            <linearGradient id="admin-chart-normal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity=".2" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity=".01" />
            </linearGradient>
          </defs>
          {[0, 50, 100, 150, 200].map((value) => (
            <g key={value}>
              <line
                x1="48"
                x2="504"
                y1={236 - value}
                y2={236 - value}
                stroke="#e2e8f0"
                strokeDasharray="3 4"
              />
              <text x="37" y={240 - value} textAnchor="end" fill="#94a3b8" fontSize="10">
                {value === 0 ? '0' : `${value}M`}
              </text>
            </g>
          ))}
          <polygon
            points={`48,236 ${coords(current.normalValues)} 504,236`}
            fill="url(#admin-chart-normal)"
          />
          <polygon
            points={`48,236 ${coords(current.auctionValues)} 504,236`}
            fill="url(#admin-chart-auction)"
          />
          <polyline
            points={coords(current.auctionValues)}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
          />
          <polyline
            points={coords(current.normalValues)}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2.5"
          />
          {current.labels.map((label, index) => (
            <g key={label} onMouseEnter={() => setHovered(index)}>
              <circle
                cx={48 + index * 76}
                cy={236 - current.auctionValues[index]}
                r="3.5"
                fill="white"
                stroke="var(--color-primary)"
                strokeWidth="2"
              />
              <circle
                cx={48 + index * 76}
                cy={236 - current.normalValues[index]}
                r="3.5"
                fill="white"
                stroke="#60a5fa"
                strokeWidth="2"
              />
              <text x={48 + index * 76} y="260" textAnchor="middle" fill="#64748b" fontSize="10">
                {label}
              </text>
              <rect x={28 + index * 76} y="22" width="40" height="220" fill="transparent" />
            </g>
          ))}
        </svg>
        {hovered !== null && (
          <div className="pointer-events-none absolute right-4 top-3 rounded-xl bg-primary p-3 text-[10px] leading-6 text-white shadow-lg">
            <p className="font-bold">{current.labels[hovered]}</p>
            <p>Đấu giá: {current.auctionValues[hovered]} triệu ₫</p>
            <p>Đơn thường: {current.normalValues[hovered]} triệu ₫</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

// Biểu đồ vòng tròn dùng CSS conic-gradient, chưa cần thư viện chart bên ngoài.
// Lớp tròn trắng bên trong tạo lỗ donut; tỷ trọng và tổng hiện là số liệu mẫu cố định.
export function RevenueComposition() {
  return (
    <Panel
      title="Cơ cấu nguồn thu phí sàn"
      subtitle="Tỷ lệ đóng góp theo danh mục"
      icon={<CircleDollarSign size={19} />}
    >
      <div
        className="relative mx-auto my-6 flex size-40 items-center justify-center rounded-full"
        style={{ background: 'conic-gradient(var(--color-primary) 0% 50.1%, #60a5fa 50.1% 100%)' }}
      >
        <div className="flex size-29 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-[9px] text-slate-500">TỔNG PHÍ SÀN</span>
          <strong className="my-1 text-xl text-slate-900">1.84 tỷ</strong>
          <span className="text-[9px] text-primary">VND / Tháng</span>
        </div>
      </div>
      <div className="space-y-2">
        {[
          {
            name: 'Đơn thường TMĐT (7%)',
            description: 'NEXUS Verified Sellers',
            amount: '924.3M ₫',
            percentage: '50.1%',
            color: 'bg-primary',
          },
          {
            name: 'Đấu giá 3D độc bản (16%)',
            description: 'WebGL Interactive Room',
            amount: '918.2M ₫',
            percentage: '49.9%',
            color: 'bg-blue-400',
          },
        ].map((item) => (
          <div key={item.name} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
            <span className={`mt-1 size-2 shrink-0 rounded-full ${item.color}`} />
            <div className="flex-1">
              <p className="text-[11px] font-semibold">{item.name}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{item.description}</p>
            </div>
            <div className="text-right text-[11px]">
              <p className="font-bold">{item.amount}</p>
              <p className="text-primary">{item.percentage}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// Biểu đồ cột nhỏ: mỗi cột có chiều cao theo giá trị mẫu, giờ cao điểm dùng màu primary.
// Badge LIVE là nhãn minh họa, component chưa đăng ký WebSocket hoặc cập nhật theo thời gian.
export function BidFrequency() {
  const values = [15, 28, 52, 65, 58, 77, 85, 98, 67, 41];
  const labels = ['02h', '06h', '09h', '12h', '15h', '18h', '20h', '21h', '22h', '24h'];
  return (
    <Panel
      title="Tần suất khớp lệnh theo giờ"
      subtitle="Tải WebGL 6 nodes & khung giờ vàng"
      icon={<TrendingUp size={19} />}
      action={<Badge>● LIVE</Badge>}
    >
      <div className="flex h-28 items-end gap-1.5 rounded-xl bg-blue-50/70 px-3 pt-3">
        {values.map((value, index) => (
          <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2">
            <div
              className={`min-h-1 rounded-t ${index === 6 || index === 7 ? 'bg-primary' : 'bg-blue-300'}`}
              style={{ height: `${value * 0.8}%` }}
              title={`${labels[index]}: ${value * 44} lượt trả giá (demo)`}
            />
            <span className="pb-2 text-center text-[8px] text-slate-500">{labels[index]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2 text-[11px]">
        <p className="text-slate-500">
          Khung 20h – 22h đạt:
          <br />
          <strong className="text-primary">4.280 bids/phút</strong>
        </p>
        <Badge>CPU 18% • 6 nodes OK</Badge>
      </div>
    </Panel>
  );
}
