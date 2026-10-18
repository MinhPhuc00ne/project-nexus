import { Download, Wallet } from 'lucide-react';
import { Badge, Button, Panel } from '../../components/adminDashboard/AdminUI';
import { RevenueChart, RevenueComposition } from '../../components/adminDashboard/RevenueChart';
import { formatMoney } from '../../components/adminDashboard/adminData';

// Giao dịch mẫu chỉ dùng ở trang Tài chính nên đặt trực tiếp tại page, chưa lấy từ đơn hàng hoặc API thanh toán.
// gross là giá trị đơn, fee là phí sàn đã tính sẵn, không phải toàn bộ doanh thu đơn hàng.
const transactions = [
  {
    id: 'TXN-00981',
    order: 'NX-ORD-991201',
    type: 'Đấu giá 3D',
    gross: 450000000,
    fee: 72000000,
    gateway: 'PayOS',
    status: 'Đã đối soát',
  },
  {
    id: 'TXN-00980',
    order: 'NX-ORD-991200',
    type: 'Đơn thường',
    gross: 12500000,
    fee: 875000,
    gateway: 'PayOS',
    status: 'Đã đối soát',
  },
  {
    id: 'TXN-00979',
    order: 'NX-ORD-991199',
    type: 'Đấu giá 3D',
    gross: 85000000,
    fee: 13600000,
    gateway: 'Stripe',
    status: 'Chờ đối soát',
  },
];

export default function AdminFinancePage() {
  // Xuất dữ liệu đang có tại frontend, không gọi server để tạo báo cáo.
  const exportCSV = () => {
    const rows = [
      'Mã giao dịch,Mã đơn,Loại,Giá trị,Phí sàn,Cổng thanh toán,Trạng thái',
      ...transactions.map((item) =>
        [item.id, item.order, item.type, item.gross, item.fee, item.gateway, item.status].join(','),
      ),
    ];
    // Blob tạo tệp trong bộ nhớ. BOM \uFEFF giúp Excel nhận tiếng Việt UTF-8.
    // join(',') phù hợp fixture hiện tại; dữ liệu thực có dấu phẩy/ngoặc kép cần escape CSV.
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nexus-demo-transactions.csv';
    anchor.click();
    // Giải phóng URL tạm sau khi kích hoạt tải tệp, tránh giữ bộ nhớ không cần thiết.
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* 1. Biểu đồ xu hướng doanh thu và tỷ lệ đóng góp của từng nguồn thu. */}
      <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
        <RevenueChart />
        <RevenueComposition />
      </div>

      {/* 2. Bảng giao dịch và đối soát phí sàn; nút Xuất CSV tải danh sách mẫu bên dưới. */}
      <Panel
        title="Giao dịch & đối soát phí sàn"
        subtitle="Danh sách giao dịch mẫu của nền tảng"
        icon={<Wallet size={19} />}
        action={
          <Button variant="secondary" onClick={exportCSV}>
            <Download size={14} />
            Xuất CSV
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-blue-50 text-[10px] text-slate-500">
              <tr>
                {[
                  'Mã giao dịch',
                  'Loại giao dịch',
                  'Giá trị đơn',
                  'Phí sàn',
                  'Cổng thanh toán',
                  'Trạng thái',
                ].map((label) => (
                  <th key={label} className="p-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((item) => (
                <tr key={item.id}>
                  <td className="p-3 font-semibold">
                    {item.id}
                    <p className="mt-1 text-[10px] font-normal text-slate-400">{item.order}</p>
                  </td>
                  <td className="p-3">{item.type}</td>
                  <td className="p-3">{formatMoney(item.gross)}</td>
                  <td className="p-3 font-semibold text-primary">{formatMoney(item.fee)}</td>
                  <td className="p-3">{item.gateway}</td>
                  <td className="p-3">
                    <Badge tone={item.status === 'Đã đối soát' ? 'green' : 'amber'}>
                      {item.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
