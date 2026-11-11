import { ShieldCheck as SafetyCertificateOutlined } from 'lucide-react';
import { Badge, Panel } from './SellerUI';
import { money, orderStatuses, type SellerOrder } from './sellerData';

export function OrderDetail({ order }: { order: SellerOrder }) {
  return (
    <div
      className="flex flex-col gap-5 text-[#566b8c] text-[13px] [&_h3]:font-[650] [&_h3]:text-[17px] [&_h3]:text-[#1e355b] [&_h3]:m-0 [&_p]:leading-[1.9] [&_p]:m-0 [&_p]:text-[#8192ac]"
      data-seller="detail-content"
    >
      <div
        className="flex items-center gap-5 [&>img]:w-[110px] [&>img]:h-[125px] [&>img]:object-contain [&>img]:bg-[#f4f7fc] [&>img]:rounded-[12px] [&_h3]:[margin:10px_0_5px] [&_strong]:block [&_strong]:mt-2.5 [&_strong]:text-[#315eea] [&_strong]:text-[17px] max-[540px]:gap-3 max-[540px]:[&>img]:w-[75px] max-[540px]:[&>img]:h-[95px] max-[540px]:[&_h3]:text-[14px]"
        data-seller="detail-product"
      >
        <img src={order.image} alt={order.product} />
        <div>
          <Badge tone="amber">Dữ liệu minh họa</Badge>
          <h3>{order.product}</h3>
          <p>#{order.id} · Số lượng: 01</p>
          <strong>{money(order.price)}</strong>
        </div>
      </div>
      <div
        className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-4 [border:1px_solid_#e6edf8] rounded-[10px] p-5 [&_small]:block [&_small]:text-[9px] [&_small]:text-[#98a9c2] [&_small]:mb-[5px] [&_small]:tracking-[0.5px] [&_strong]:font-[550] [&_strong]:text-[12px] [&_strong]:text-[#4f6484] [&_p]:text-[11px] max-[540px]:p-[15px] max-[540px]:gap-[15px]"
        data-seller="detail-grid"
      >
        <div>
          <small>NGƯỜI NHẬN</small>
          <strong>{order.buyer}</strong>
          <p>{order.city}</p>
        </div>
        <div>
          <small>THANH TOÁN</small>
          <strong>{order.payment}</strong>
          <p>Không phải giao dịch thật</p>
        </div>
        <div>
          <small>TRẠNG THÁI</small>
          <strong>{orderStatuses[order.status]}</strong>
        </div>
        <div>
          <small>HÌNH THỨC</small>
          <strong>{order.type === 'auction' ? 'Đấu giá' : 'Mua ngay'}</strong>
        </div>
      </div>
      <div
        className="flex gap-2.5 items-center p-[15px] [border:1px_solid_#e3ebfa] bg-[#f4f8ff] rounded-[9px] text-[#8194b1] text-[11px] leading-[1.8] [&>.anticon]:shrink-0 [&>.anticon]:text-[#7194db]! [&>[data-seller~=text-button]]:ml-auto [&>[data-seller~=text-button]]:whitespace-nowrap max-[540px]:text-[10px] max-[540px]:flex-wrap max-[540px]:[&>span:not(.anticon)]:flex-1 max-[540px]:[&_[data-seller~=text-button]]:ml-[27px]"
        data-seller="info-note"
      >
        <SafetyCertificateOutlined className="text-[18px]" aria-hidden="true" />
        Lưu bằng chứng đóng gói và kiểm tra thông tin trước khi bàn giao cho đơn vị vận chuyển.
      </div>
    </div>
  );
}

export function ShippingGuide() {
  return (
    <Panel
      title="Quy chuẩn đóng gói & bàn giao"
      subtitle="Bảo vệ vật phẩm trong từng chuyến đi"
      action={<SafetyCertificateOutlined className="text-[20px]" aria-hidden="true" />}
    >
      <div
        className="flex flex-col gap-2.5 [&>div]:flex [&>div]:gap-[9px] [&>div]:p-3 [&>div]:[border:1px_solid_#edf1f9] [&>div]:rounded-[8px] [&>div]:bg-[#f8faff] [&>div>b]:grid [&>div>b]:[place-items:center] [&>div>b]:w-[21px] [&>div>b]:h-[21px] [&>div>b]:bg-[#315eea] [&>div>b]:text-[white] [&>div>b]:rounded-full [&>div>b]:text-[10px] [&>div>b]:shrink-0 [&_strong]:text-[10px] [&_strong]:font-[550] [&_p]:text-[9px] [&_p]:text-[#92a3be] [&_p]:[margin:4px_0_0] [&_p]:leading-[1.8]"
        data-seller="steps"
      >
        {[
          ['Kiểm tra vật phẩm', 'Đối chiếu sản phẩm, phụ kiện và thông tin người nhận.'],
          ['Lưu bằng chứng đóng gói', 'Chụp ảnh hoặc quay video sản phẩm và quá trình đóng gói.'],
          ['Niêm phong & bàn giao', 'Gia cố kiện hàng, dán tem và lưu biên bản bàn giao.'],
        ].map(([title, text], index) => (
          <div key={title}>
            <b>{index + 1}</b>
            <span>
              <strong>{title}</strong>
              <p>{text}</p>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
