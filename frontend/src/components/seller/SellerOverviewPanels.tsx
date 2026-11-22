import { cn } from '../../lib/utils';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download as DownloadOutlined } from 'lucide-react';
import {
  ArrowRight as ArrowRightOutlined,
  ExternalLink as ExportOutlined,
  Box as CodeSandboxOutlined,
  CircleDollarSign as DollarOutlined,
  Lock as LockOutlined,
  Plus as PlusOutlined,
  ShieldCheck as SafetyCertificateOutlined,
  Star as StarOutlined,
  Store as ShopOutlined,
  TrendingUp as RiseOutlined,
  Truck as TruckOutlined,
  WalletCards as WalletOutlined,
} from 'lucide-react';
import { useSellerSession } from './SellerSession';
import { useSellerWorkspace } from './SellerWorkspace';
import { Badge, EmptyState, Panel, SellerLink, StatCard, exportCsv } from './SellerUI';
import { money, previewAuctions, previewOrders, trustLabels } from './sellerData';

export function StoreIdentity() {
  const user = useSellerSession();
  const { storeName, storeLoading, storeError, shop } = useSellerWorkspace();
  const shopAvatar = shop?.avatarUrl;
  return (
    <section
      className="flex items-center gap-[17px] [border:1px_solid_#e5ebf4] rounded-[12px] bg-white py-[23px] px-5.5 min-[1600px]:p-[27px] max-[1250px]:flex-wrap max-[1250px]:[&>[data-seller~=actions]]:ml-[77px] max-[760px]:p-4.5 max-[760px]:gap-[13px] max-[760px]:[&>[data-seller~=actions]]:ml-0 max-[760px]:[&>[data-seller~=actions]]:w-full max-[760px]:[&>[data-seller~=actions]]:pt-2.5 max-[760px]:[&>[data-seller~=actions]]:[border-top:1px_solid_#edf2f9] max-[540px]:[&>[data-seller~=actions]]:justify-between max-[540px]:[&>[data-seller~=actions]]:gap-2 max-[540px]:[&_[data-seller~=button]]:flex-1 max-[540px]:[&_[data-seller~=button]]:text-[10px]! max-[540px]:[&_[data-seller~=button]]:p-[9px]"
      data-seller="store-identity"
    >
      <div
        className="relative grid [place-items:center] w-15 h-15 [background:linear-gradient(140deg,_#edf3ff,_#f7faff)] [border:1px_solid_#e2e9f8] rounded-[13px] text-[#315eea] shrink-0 [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:rounded-[13px] [&>[data-seller~=dot]]:absolute [&>[data-seller~=dot]]:bottom-0 [&>[data-seller~=dot]]:right-0 [&>[data-seller~=dot]]:w-3 [&>[data-seller~=dot]]:h-3 [&>[data-seller~=dot]]:[border:3px_solid_white] max-[760px]:h-[49px] max-[760px]:w-[49px] max-[760px]:rounded-[10px]"
        data-seller="store-emblem"
      >
        {shopAvatar ? (
          <img src={shopAvatar} alt="Logo gian hàng" />
        ) : (
          <ShopOutlined className="text-[29px]" aria-hidden="true" />
        )}
        <span
          className="w-1.5 h-1.5 inline-block rounded-full bg-[#14b58a] shrink-0"
          data-seller="dot"
        />
      </div>
      <div className="flex-1 min-w-0 max-[540px]:min-w-[180px]" data-seller="store-info">
        <div
          className="flex gap-2.5 items-center flex-wrap [&_h2]:text-[17px] [&_h2]:tracking-[-0.5px] [&_h2]:font-[650] [&_h2]:m-0 max-[1050px]:[&_h2]:text-[15px] max-[760px]:[&_h2]:text-[14px] max-[760px]:[&>[data-seller~=badge]]:text-[8px] max-[540px]:gap-[7px]"
          data-seller="store-title"
        >
          <h2>
            {storeLoading ? 'Đang tải gian hàng…' : storeName || `Gian hàng của ${user.fullName}`}
          </h2>
          <Badge>
            <SafetyCertificateOutlined className="text-[12px]" aria-hidden="true" /> NEXUS SELLER
          </Badge>
        </div>
        <div
          className="flex items-center gap-[17px] flex-wrap mt-2 text-[10px] text-[#8c9bb2] [&>span:not(.anticon)]:flex [&>span:not(.anticon)]:items-center [&>span:not(.anticon)]:gap-1 [&_b]:text-[#5c6c87] [&_b]:font-[550] [&>span:not(.anticon):first-child>.anticon]:text-[#f7b740]! max-[760px]:gap-2 max-[760px]:text-[9px] max-[540px]:flex-col max-[540px]:items-start max-[540px]:gap-[5px]"
          data-seller="store-meta"
        >
          <span>
            <StarOutlined className="text-[14px]" aria-hidden="true" /> Uy tín{' '}
            <b>{user.reputationScore}</b>
          </span>
          <span>
            Mức tín nhiệm: <b>{trustLabels[user.trustLevel] || user.trustLevel}</b>
          </span>
          <span className="text-[#16a085]!" data-seller="text-green">
            <SafetyCertificateOutlined className="text-[13px]" aria-hidden="true" />
            {user.isVerified ? 'Tài khoản đã xác thực' : 'Chưa xác thực'}
          </span>
        </div>
        {storeError && (
          <small className="text-[#9aa8be] text-[10px]" data-seller="text-muted">
            {storeError}
          </small>
        )}
      </div>
      <div className="flex items-center gap-[9px] flex-wrap" data-seller="actions">
        <SellerLink to="/seller/auctions/new" secondary>
          <CodeSandboxOutlined className="text-[16px]" aria-hidden="true" />
          Gửi vật phẩm đấu giá
        </SellerLink>
        <SellerLink to="/seller/products/new">
          <PlusOutlined className="text-[17px]" aria-hidden="true" />
          Thêm sản phẩm
        </SellerLink>
      </div>
    </section>
  );
}

export function SellerStats() {
  const user = useSellerSession();
  const { preview } = useSellerWorkspace();
  return (
    <div
      className="grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] gap-4 min-[1600px]:gap-5 max-[1250px]:gap-3 max-[1050px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[540px]:gap-2.5"
      data-seller="stats-grid"
    >
      <StatCard
        label="Doanh thu thuần"
        value={preview ? money(348600000) : '—'}
        icon={<DollarOutlined className="text-[20px]" aria-hidden="true" />}
        detail={
          preview ? (
            <span className="text-[#16a085]!" data-seller="text-green">
              <RiseOutlined className="text-[13px]" aria-hidden="true" /> +16,8% so với kỳ trước
            </span>
          ) : (
            'Chưa có dữ liệu doanh thu'
          )
        }
        note={preview ? 'Dữ liệu doanh thu minh họa' : 'Theo dõi hiệu quả bán hàng'}
      />
      <StatCard
        label="Số dư ví khả dụng"
        value={money(user.wallet?.balance ?? 0)}
        icon={<WalletOutlined className="text-[20px]" aria-hidden="true" />}
        detail="Số dư từ tài khoản của bạn"
        note={
          <Link to="/seller/finance">
            Quản lý tài chính <ExportOutlined className="text-[13px]" aria-hidden="true" />
          </Link>
        }
      />
      <StatCard
        label="Đơn hàng cần xử lý"
        value={preview ? '03' : '—'}
        icon={<TruckOutlined className="text-[20px]" aria-hidden="true" />}
        detail={preview ? '2 đơn chờ bàn giao GHN' : 'Chưa có dữ liệu đơn hàng'}
        note={
          <Link to="/seller/orders">
            Quản lý đơn hàng <ExportOutlined className="text-[13px]" aria-hidden="true" />
          </Link>
        }
      />
      <StatCard
        label="Phiên đấu giá đang diễn ra"
        value={preview ? '02' : '—'}
        icon={<CodeSandboxOutlined className="text-[20px]" aria-hidden="true" />}
        detail={
          preview ? (
            <span className="text-[#16a085]!" data-seller="text-green">
              <span
                className="w-1.5 h-1.5 inline-block rounded-full bg-[#14b58a] shrink-0"
                data-seller="dot"
              />{' '}
              27 lượt trả giá minh họa
            </span>
          ) : (
            'Chưa có dữ liệu phiên đấu giá'
          )
        }
        note={
          <Link to="/seller/auctions">
            Khám phá phòng đấu giá <ExportOutlined className="text-[13px]" aria-hidden="true" />
          </Link>
        }
      />
    </div>
  );
}

const barHeights: Record<number, string> = {
  '26': 'h-[26%]',
  '30': 'h-[30%]',
  '37': 'h-[37%]',
  '38': 'h-[38%]',
  '42': 'h-[42%]',
  '44': 'h-[44%]',
  '46': 'h-[46%]',
  '51': 'h-[51%]',
  '53': 'h-[53%]',
  '60': 'h-[60%]',
  '68': 'h-[68%]',
  '71': 'h-[71%]',
  '72': 'h-[72%]',
  '74': 'h-[74%]',
  '75': 'h-[75%]',
  '82': 'h-[82%]',
  '83': 'h-[83%]',
  '92': 'h-[92%]',
  '96': 'h-[96%]',
  '23.18': 'h-[23.18%]',
  '32.33': 'h-[32.33%]',
  '26.84': 'h-[26.84%]',
  '43.31': 'h-[43.31%]',
  '36.6': 'h-[36.6%]',
  '50.019999999999996': 'h-[50.019999999999996%]',
  '45.75': 'h-[45.75%]',
  '15.86': 'h-[15.86%]',
  '25.62': 'h-[25.62%]',
  '22.57': 'h-[22.57%]',
  '45.14': 'h-[45.14%]',
  '41.48': 'h-[41.48%]',
  '56.12': 'h-[56.12%]',
  '18.3': 'h-[18.3%]',
  '31.11': 'h-[31.11%]',
  '28.06': 'h-[28.06%]',
  '43.92': 'h-[43.92%]',
  '50.629999999999995': 'h-[50.629999999999995%]',
  '58.56': 'h-[58.56%]',
};

export function RevenuePanels({ compact = false }: { compact?: boolean }) {
  const [period, setPeriod] = useState('7 ngày');
  const { preview, notify } = useSellerWorkspace();
  const datasets: Record<string, number[]> = {
    '7 ngày': [38, 53, 44, 71, 60, 82, 75],
    '30 ngày': [26, 42, 37, 60, 74, 68, 92],
    'Tháng này': [30, 38, 51, 46, 72, 83, 96],
  };
  return (
    <div
      className="grid [grid-template-columns:minmax(0,_1.9fr)_minmax(240px,_1fr)] gap-5 max-[1250px]:[grid-template-columns:minmax(0,_1.6fr)_minmax(230px,_1fr)] max-[1050px]:[grid-template-columns:minmax(0,_1.5fr)_minmax(200px,_1fr)] max-[760px]:[grid-template-columns:minmax(0,_1.8fr)_minmax(200px,_1fr)] max-[540px]:[grid-template-columns:1fr]"
      data-seller="chart-grid"
    >
      <Panel
        title="Tăng trưởng dòng tiền & doanh số"
        subtitle="So sánh doanh thu đấu giá và bán lẻ trực tiếp"
        action={
          <span className="text-[9px] text-[#8c9bb4] whitespace-nowrap" data-seller="unit">
            VND triệu
          </span>
        }
      >
        <div
          className="gap-1 items-center flex-wrap [&_button]:[border:0] [&_button]:bg-transparent [&_button]:text-[#7a89a1] [&_button]:rounded-[6px] [&_button]:text-[10px] [&_button]:flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_button.is-active]:font-[650] [&_button>span:not(.anticon)]:text-[9px] [&_button>span:not(.anticon)]:bg-[#edf1f8] [&_button>span:not(.anticon)]:py-0 [&_button>span:not(.anticon)]:px-[5px] [&_button>span:not(.anticon)]:rounded-[4px] [&_button.is-active>span:not(.anticon)]:bg-[#315eea] [&_button.is-active>span:not(.anticon)]:text-[#fff] max-[540px]:[&_button]:py-[7px] max-[540px]:[&_button]:px-2.5 max-[540px]:[&_button]:text-[9px] inline-flex bg-[#f5f7fb] rounded-[7px] p-[3px] mb-5.5 [&_button]:py-[5px] [&_button]:px-[11px] [&_button.is-active]:bg-white [&_button.is-active]:[box-shadow:0_1px_4px_#2039640b] [&_button.is-active]:text-[#465570]"
          data-seller="tabs chart-tabs"
        >
          {Object.keys(datasets).map((item) => (
            <button
              key={item}
              className={cn(period === item ? 'is-active' : '')}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div
          className={cn(
            `relative h-[218px] [margin:4px_0_35px_22px] min-[1600px]:h-[250px] max-[760px]:h-[190px] max-[540px]:h-[200px] ${!preview ? 'is-empty' : ''}`,
          )}
          data-seller="chart"
        >
          <div
            className="absolute [inset:0] flex flex-col justify-between [&>span:not(.anticon)]:block [&>span:not(.anticon)]:[border-top:1px_dashed_#edf1f7] [&>span:not(.anticon)]:relative [&_i]:absolute [&_i]:left-[-25px] [&_i]:top-[-8px] [&_i]:not-italic [&_i]:text-[8px] [&_i]:text-[#a1afc2]"
            data-seller="chart-gridlines"
          >
            {[400, 300, 200, 100, 0].map((n) => (
              <span key={n}>
                <i>{n}</i>
              </span>
            ))}
          </div>
          {preview ? (
            <div
              className="absolute [inset:0_8px_0_14px] flex items-end justify-between gap-[13px]"
              data-seller="chart-bars"
            >
              {datasets[period].map((value, index) => (
                <div
                  key={index}
                  className="h-full w-[10%] flex items-end justify-center gap-[5px] relative [&>div]:w-[13px] [&>div]:max-w-[40%] [&>div]:[background:linear-gradient(#4d79f3,_#315eea)] [&>div]:rounded-[3px_3px_0_0] [&>div]:[transition:height_0.4s] [&>div:nth-child(2)]:bg-none [&>div:nth-child(2)]:bg-[#9eb7fb] [&_small]:absolute [&_small]:bottom-[-24px] [&_small]:text-[9px] [&_small]:text-[#8b9bb4]"
                  data-seller="chart-bar-group"
                >
                  <div className={barHeights[value]} />
                  <div className={barHeights[value * 0.61]} />
                  <small>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}</small>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="absolute [inset:0] flex flex-col items-center justify-center gap-[9px] text-[#adbbd2] [&_strong]:text-[11px] [&_strong]:text-[#899bb9] [&_strong]:font-medium [&_span:not(.anticon)]:text-[10px]"
              data-seller="chart-placeholder"
            >
              <RiseOutlined className="text-[28px]" aria-hidden="true" />
              <strong>Doanh thu sẽ được hiển thị tại đây</strong>
              <span>Chưa có số liệu trong kỳ đã chọn</span>
            </div>
          )}
        </div>
        <div
          className="flex gap-5 justify-center [border-top:1px_solid_#f0f3f8] [padding:15px_0_2px] flex-wrap text-[9px] text-[#8b98ad] [&>span:not(.anticon)]:flex [&>span:not(.anticon)]:items-center [&>span:not(.anticon)]:gap-1.5 [&_i]:inline-block [&_i]:w-[7px] [&_i]:h-[7px] [&_i]:bg-[#315eea] [&_i]:rounded-full [&_i]:shrink-0 [&>span:not(.anticon):nth-child(2)_i]:bg-[#9eb7fb] [&_b]:font-semibold [&_b]:text-[#4b5d7d] max-[1050px]:gap-2.5"
          data-seller="chart-legend"
        >
          <span>
            <i />
            Đấu giá <b>{preview ? '218,2 triệu' : '—'}</b>
          </span>
          <span>
            <i />
            Bán lẻ trực tiếp <b>{preview ? '130,4 triệu' : '—'}</b>
          </span>
        </div>
        {!compact && (
          <button
            className="inline-flex items-center gap-1.5 p-0 [border:0] bg-transparent text-[#315eea] text-[10px] font-[550]"
            data-seller="text-button"
            onClick={() =>
              preview
                ? exportCsv('doanh-thu-minh-hoa.csv', [
                    ['Dữ liệu minh họa', period],
                    ['Đấu giá', 218200000],
                    ['Bán lẻ', 130400000],
                  ])
                : notify('Chưa có dữ liệu để xuất báo cáo.', 'error')
            }
          >
            <DownloadOutlined className="text-[14px]" aria-hidden="true" />
            Xuất báo cáo doanh thu
          </button>
        )}
      </Panel>
      <Panel
        title="Tỷ trọng nguồn thu"
        subtitle="Phân bổ doanh thu theo kênh"
        action={<DollarOutlined className="text-[17px]" aria-hidden="true" />}
      >
        <div
          className={cn(
            `w-[174px] h-[174px] [margin:25px_auto_24px] rounded-full [background:conic-gradient(#315eea_0_62.6%,_#adc1fc_62.6%_100%)] grid [place-items:center] [transform:rotate(-90deg)] [&.is-empty]:[background:conic-gradient(#e9eff9_0_100%)] [&>div]:w-[133px] [&>div]:h-[133px] [&>div]:bg-white [&>div]:rounded-full [&>div]:flex [&>div]:items-center [&>div]:justify-center [&>div]:flex-col [&>div]:[transform:rotate(90deg)] [&_small]:text-[8px] [&_small]:tracking-[0.7px] [&_small]:text-[#96a4bc] [&_strong]:text-[24px] [&_strong]:mt-[5px] [&_strong]:font-bold [&_strong]:text-[#253557] [&_span:not(.anticon)]:text-[10px] [&_span:not(.anticon)]:text-[#16a486] [&_span:not(.anticon)]:mt-[3px] max-[1050px]:w-[155px] max-[1050px]:h-[155px] max-[1050px]:[&>div]:w-[120px] max-[1050px]:[&>div]:h-[120px] max-[760px]:my-7.5 max-[760px]:mx-auto max-[540px]:my-4.5 max-[540px]:mx-auto ${!preview ? 'is-empty' : ''}`,
          )}
          data-seller="donut"
        >
          <div>
            <small>TỔNG DOANH THU</small>
            <strong>{preview ? '348,6M' : '—'}</strong>
            {preview && <span>+16,8%</span>}
          </div>
        </div>
        <div
          className="[&_i]:inline-block [&_i]:w-[7px] [&_i]:h-[7px] [&_i]:bg-[#315eea] [&_i]:rounded-full [&_i]:shrink-0 [&>div:nth-child(2)_i]:bg-[#9eb7fb] [&>div]:flex [&>div]:justify-between [&>div]:items-center [&>div]:gap-2.5 [&>div]:bg-[#f7f9fc] [&>div]:[border:1px_solid_#eef2f8] [&>div]:rounded-[7px] [&>div]:p-2.5 [&>div]:mb-2 [&>div]:text-[10px] [&_span:not(.anticon)]:flex [&_span:not(.anticon)]:items-center [&_span:not(.anticon)]:gap-[7px] [&_span:not(.anticon)]:text-[#7a8ba9]"
          data-seller="donut-legend"
        >
          <div>
            <span>
              <i />
              Đấu giá
            </span>
            <b>{preview ? '62,6%' : '—'}</b>
          </div>
          <div>
            <span>
              <i />
              Bán lẻ trực tiếp
            </span>
            <b>{preview ? '37,4%' : '—'}</b>
          </div>
        </div>
        <p
          className="text-center text-[9px] text-[#98a7bf] [margin:13px_0_0]"
          data-seller="chart-footnote"
        >
          {preview
            ? 'Số liệu minh họa cho giao diện báo cáo.'
            : 'Tự động tổng hợp khi có dữ liệu bán hàng.'}
        </p>
      </Panel>
    </div>
  );
}

export function OrdersPreview() {
  const { preview } = useSellerWorkspace();
  return (
    <Panel
      title="Đơn hàng chờ bàn giao GHN"
      subtitle="Chuẩn bị, đóng gói và theo dõi vận chuyển"
      action={
        <Link
          className="inline-flex items-center gap-1.5 p-0 [border:0] bg-transparent text-[#315eea] text-[10px] font-[550]"
          data-seller="text-button"
          to="/seller/orders"
        >
          Xem tất cả <ArrowRightOutlined className="text-[14px]" aria-hidden="true" />
        </Link>
      }
    >
      {preview ? (
        <div className="flex flex-col gap-2.5" data-seller="mini-list">
          {previewOrders.slice(0, 3).map((order) => (
            <Link
              className="flex items-center gap-3 py-[13px] px-[11px] [border:1px_solid_#edf1f7] rounded-[9px] text-inherit [&:hover]:[border-color:#d3dffa] [&:hover]:bg-[#fbfcff] [&>img]:w-[45px] [&>img]:h-12 [&>img]:object-contain [&>img]:bg-[#f5f7fb] [&>img]:rounded-[7px] [&>img]:shrink-0 [&>div]:min-w-0 [&_strong]:block [&_strong]:text-[10px] [&_strong]:font-semibold [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:max-w-[220px] [&_small]:block [&_small]:text-[9px] [&_small]:text-[#97a5ba] [&_small]:mt-1 max-[1250px]:[&_strong]:max-w-[150px] max-[1050px]:[&_strong]:max-w-[none] max-[540px]:py-[11px] max-[540px]:px-2 max-[540px]:gap-[9px] max-[540px]:flex-wrap max-[540px]:[&>img]:w-9.5 max-[540px]:[&>img]:h-[43px] max-[540px]:[&>div:nth-child(2)]:flex-1 max-[540px]:[&>div:nth-child(2)]:min-w-[130px] max-[540px]:[&_strong]:text-[10px] max-[540px]:[&_strong]:max-w-[200px] max-[540px]:[&_[data-seller~=preview-price]]:ml-[47px]"
              data-seller="mini-row"
              to={`/seller/orders/${order.id}`}
              key={order.id}
            >
              <img src={order.image} alt="" />
              <div>
                <strong>{order.product}</strong>
                <small>
                  #{order.id} · {order.buyer}
                </small>
              </div>
              <div
                className="ml-auto text-right shrink-0 flex items-end flex-col gap-1.5 [&>b]:text-[10px] max-[760px]:max-w-[140px] max-[540px]:ml-[47px] max-[540px]:text-left max-[540px]:items-center max-[540px]:flex-row max-[540px]:gap-2.5 max-[540px]:max-w-[none] max-[540px]:[&>b]:text-[10px] max-[540px]:[&_[data-seller~=badge]]:text-[8px]"
                data-seller="mini-value"
              >
                <b>{money(order.price)}</b>
                <Badge tone={order.status === 'packing' ? 'amber' : 'blue'}>
                  {order.status === 'packing' ? 'Chờ giao GHN' : 'Chờ xác nhận'}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có đơn hàng cần xử lý"
          description="Đơn hàng của gian hàng sẽ được tập trung tại đây."
        />
      )}
    </Panel>
  );
}

export function AuctionsPreview({ full = false }: { full?: boolean }) {
  const { preview } = useSellerWorkspace();
  return (
    <Panel
      title="Không gian đấu giá"
      subtitle="Quản lý phiên và vật phẩm sưu tầm của gian hàng"
      action={
        <Link
          className="inline-flex items-center gap-1.5 p-0 [border:0] bg-transparent text-[#315eea] text-[10px] font-[550]"
          data-seller="text-button"
          to="/seller/auctions"
        >
          Tất cả phiên <ArrowRightOutlined className="text-[14px]" aria-hidden="true" />
        </Link>
      }
    >
      {preview ? (
        <div
          className={cn(
            full
              ? 'grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-4.5 max-[1050px]:gap-3 max-[540px]:[grid-template-columns:1fr]'
              : 'flex flex-col gap-2.5',
          )}
          data-seller="auction-preview-grid mini-list"
        >
          {previewAuctions.slice(0, full ? 3 : 2).map((auction) => (
            <Link
              className={cn(
                full
                  ? '[border:1px_solid_#e5ebf4] rounded-[10px] overflow-hidden text-inherit [&:hover_[data-seller~=preview-image]>img]:[transform:scale(1.05)] [&>div:not(:first-child)]:p-[13px] [&_strong]:block [&_strong]:text-[11px] [&_strong]:font-semibold [&_small]:text-[9px] [&_small]:text-[#92a2bc] [&_small]:block [&_small]:my-1 [&_small]:mx-0 [&_[data-seller~=preview-price]]:[margin:0_12px_12px] [&_[data-seller~=preview-price]]:rounded-[8px] [&_[data-seller~=preview-price]]:bg-[#f5f8fe] [&_[data-seller~=preview-price]]:p-[11px]! [&_[data-seller~=preview-price]_b]:text-[15px] max-[760px]:[&_strong]:text-[10px] max-[540px]:[&_strong]:text-[13px] max-[540px]:[&_[data-seller~=preview-price]_b]:text-[17px]'
                  : 'flex items-center gap-3 py-[13px] px-[11px] [border:1px_solid_#edf1f7] rounded-[9px] text-inherit [&:hover]:[border-color:#d3dffa] [&:hover]:bg-[#fbfcff] [&>img]:w-[45px] [&>img]:h-12 [&>img]:object-contain [&>img]:bg-[#f5f7fb] [&>img]:rounded-[7px] [&>img]:shrink-0 [&>div]:min-w-0 [&_strong]:block [&_strong]:text-[10px] [&_strong]:font-semibold [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:max-w-[220px] [&_small]:block [&_small]:text-[9px] [&_small]:text-[#97a5ba] [&_small]:mt-1 max-[1250px]:[&_strong]:max-w-[150px] max-[1050px]:[&_strong]:max-w-[none] max-[540px]:py-[11px] max-[540px]:px-2 max-[540px]:gap-[9px] max-[540px]:flex-wrap max-[540px]:[&>img]:w-9.5 max-[540px]:[&>img]:h-[43px] max-[540px]:[&>div:nth-child(2)]:flex-1 max-[540px]:[&>div:nth-child(2)]:min-w-[130px] max-[540px]:[&_strong]:text-[10px] max-[540px]:[&_strong]:max-w-[200px] max-[540px]:[&_[data-seller~=preview-price]]:ml-[47px]',
              )}
              data-seller="auction-preview mini-row"
              to="/seller/auctions"
              key={auction.id}
            >
              {full ? (
                <div
                  className="h-[165px] relative [background:linear-gradient(130deg,_#f2f5fb,_#e7edf8)] grid [place-items:center] overflow-hidden [&>img]:w-[80%] [&>img]:h-[90%] [&>img]:object-contain [&>img]:mix-blend-multiply [&>img]:[transition:transform_0.3s] [&>[data-seller~=badge]]:absolute [&>[data-seller~=badge]]:left-2.5 [&>[data-seller~=badge]]:top-2.5 [&>[data-seller~=badge]]:bg-[#f1fbf8] max-[1050px]:h-[135px] max-[540px]:h-[195px]"
                  data-seller="preview-image"
                >
                  <img src={auction.image} alt={auction.title} />
                  <Badge tone={auction.status === 'live' ? 'green' : 'gray'}>
                    {auction.status === 'live' ? '● ĐANG DIỄN RA' : 'Đã kết thúc'}
                  </Badge>
                </div>
              ) : (
                <img src={auction.image} alt="" />
              )}
              <div>
                <strong>{auction.title}</strong>
                <small>{auction.bids} lượt trả giá · Dữ liệu mẫu</small>
              </div>
              <div
                className="ml-auto [&_small]:text-[9px] [&_small]:text-[#96a4bb] [&_small]:block [&_b]:text-[11px] [&_b]:block [&>span:not(.anticon)]:flex [&>span:not(.anticon)]:items-center [&>span:not(.anticon)]:justify-between [&>span:not(.anticon)]:text-[9px] [&>span:not(.anticon)]:text-[#315eea] [&>span:not(.anticon)]:mt-[9px]"
                data-seller="preview-price"
              >
                <small>Giá hiện tại</small>
                <b>{money(auction.price)}</b>
                {full && (
                  <span>
                    Khám phá phiên <ExportOutlined className="text-[14px]" aria-hidden="true" />
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sẵn sàng cho phiên đấu giá đầu tiên?"
          description="Chuẩn bị thông tin và hình ảnh vật phẩm của bạn."
          action={
            <SellerLink to="/seller/auctions/new" secondary>
              <PlusOutlined className="text-[15px]" aria-hidden="true" />
              Tạo bản nháp phiên
            </SellerLink>
          }
        />
      )}
    </Panel>
  );
}

export function WalletPanel() {
  const user = useSellerSession();
  return (
    <Panel
      title="Ví tài chính & ký quỹ Escrow"
      subtitle="Theo dõi số dư ví trên tài khoản NEXUS"
      action={<SafetyCertificateOutlined className="text-[19px]" aria-hidden="true" />}
    >
      <div
        className="[border:1px_solid_#e2eafa] [background:linear-gradient(120deg,_#f3f7ff,_#fafcff)] rounded-[10px] p-5 flex items-center justify-between gap-3 mb-[15px] [&_small]:text-[9px] [&_small]:text-[#899dbd] [&_small]:tracking-[0.7px] [&_strong]:block [&_strong]:text-[26px] [&_strong]:tracking-[-1px] [&_strong]:font-bold [&_strong]:my-1.5 [&_strong]:mx-0 [&_p]:text-[9px] [&_p]:text-[#93a4be] [&_p]:m-0 [&>.anticon]:text-[#81a2ec]!"
        data-seller="wallet-highlight"
      >
        <div>
          <small>SỐ DƯ KHẢ DỤNG</small>
          <strong>{money(user.wallet?.balance ?? 0)}</strong>
          <p>Số dư được đồng bộ từ hệ thống</p>
        </div>
        <WalletOutlined className="text-[34px]" aria-hidden="true" />
      </div>
      <div
        className="flex items-center justify-between text-[10px] py-[11px] px-0 text-[#90a0b9] [border-bottom:1px_solid_#f0f3f8] [&_span:not(.anticon)]:flex [&_span:not(.anticon)]:items-center [&_span:not(.anticon)]:gap-2 [&_b]:text-[#4b5f80]"
        data-seller="wallet-details"
      >
        <span>
          <LockOutlined className="text-[16px]" aria-hidden="true" />
          Số dư đang khóa
        </span>
        <b>{money(user.wallet?.lockedBalance ?? 0)}</b>
      </div>
      <div
        className="flex items-center justify-between text-[10px] py-[11px] px-0 text-[#90a0b9] [border-bottom:1px_solid_#f0f3f8] [&_span:not(.anticon)]:flex [&_span:not(.anticon)]:items-center [&_span:not(.anticon)]:gap-2 [&_b]:text-[#4b5f80]"
        data-seller="wallet-details"
      >
        <span>Đơn vị tiền tệ</span>
        <b>{user.wallet?.currency ?? 'VND'}</b>
      </div>
      <SellerLink to="/seller/finance" secondary>
        Chi tiết ví & giao dịch <ArrowRightOutlined className="text-[15px]" aria-hidden="true" />
      </SellerLink>
    </Panel>
  );
}
