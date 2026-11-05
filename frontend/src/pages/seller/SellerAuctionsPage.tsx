import { cn } from '../../lib/utils';
import { useState } from 'react';
import { Box as CodeSandboxOutlined } from 'lucide-react';
import {
  Clock as ClockCircleOutlined,
  History as HistoryOutlined,
  Wrench as BuildOutlined,
  Plus as PlusOutlined,
  PlayCircle as PlayCircleOutlined,
  Search as SearchOutlined,
  ShieldCheck as SafetyCertificateOutlined,
  Clock3 as FieldTimeOutlined,
  Video as VideoCameraOutlined,
} from 'lucide-react';
import Popup from '../../components/Popup';
import { useSellerWorkspace } from '../../components/seller/SellerWorkspace';
import {
  Badge,
  EmptyState,
  ModuleNotice,
  PageHeading,
  Panel,
  SellerButton,
  SellerLink,
  StatCard,
} from '../../components/seller/SellerUI';
import {
  auctionStatuses,
  money,
  previewAuctions,
  type SellerAuction,
} from '../../components/seller/sellerData';

const rotationClasses: Record<number, string> = {
  '0': 'rotate-[0deg]',
  '10': 'rotate-[10deg]',
  '20': 'rotate-[20deg]',
  '30': 'rotate-[30deg]',
  '-30': 'rotate-[-30deg]',
  '-20': 'rotate-[-20deg]',
  '-10': 'rotate-[-10deg]',
};

export default function SellerAuctionsPage() {
  const { preview, drafts, notify } = useSellerWorkspace();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<SellerAuction | null>(null);
  const [rotation, setRotation] = useState(0);
  const rows = (preview ? previewAuctions : []).filter(
    (auction) =>
      (tab === 'all' || auction.status === tab) &&
      `${auction.title} ${auction.id}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const auctionDrafts = drafts.filter((draft) => draft.kind === 'auction');
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <PageHeading
        title="Quản trị đấu giá 3D"
        description="Một không gian cho vật phẩm độc bản và những phiên đấu giá của bạn."
        actions={
          <>
            <SellerButton secondary onClick={() => setTab('ended')}>
              <HistoryOutlined className="text-[15px]" aria-hidden="true" />
              Lịch sử đấu giá
            </SellerButton>
            <SellerLink to="/seller/auctions/new">
              <PlusOutlined className="text-[16px]" aria-hidden="true" />
              Tạo phiên mới
            </SellerLink>
          </>
        }
      />
      <ModuleNotice label="Phiên đấu giá và phòng 3D" />
      <div
        className="grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] gap-4 min-[1600px]:gap-5 max-[1250px]:gap-3 max-[1050px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[540px]:gap-2.5"
        data-seller="stats-grid"
      >
        <StatCard
          label="Phiên đang diễn ra"
          value={preview ? '02' : '—'}
          detail="Phòng đấu giá trực tiếp"
          icon={<PlayCircleOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Chờ thẩm định"
          value={preview ? '01' : '—'}
          detail="Vật phẩm & mô hình GLB"
          icon={<BuildOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Phiên sắp diễn ra"
          value={preview ? '01' : '—'}
          detail="Theo dõi lịch mở phiên"
          icon={<ClockCircleOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Bản nháp trên thiết bị"
          value={auctionDrafts.length.toString().padStart(2, '0')}
          detail="Chưa gửi lên hệ thống"
          icon={<CodeSandboxOutlined className="text-[20px]" aria-hidden="true" />}
        />
      </div>
      <div
        className="flex items-center flex-wrap gap-2.5 bg-white [border:1px_solid_#e5ebf4] rounded-[10px] p-[13px] [&_select]:[border:1px_solid_#e5ebf4] [&_select]:rounded-[7px] [&_select]:bg-[#f9fbff] [&_select]:py-2 [&_select]:px-2.5 [&_select]:text-[#7384a1] [&_select]:text-[10px] [&_select]:min-h-8.5 [&_select]:max-w-full max-[540px]:p-[11px] max-[540px]:gap-2 max-[540px]:[&>[data-seller~=search-field]]:max-w-[none] max-[540px]:[&>[data-seller~=search-field]]:min-w-full max-[540px]:[&>[data-seller~=button]]:flex-1 max-[540px]:[&>[data-seller~=button]]:py-2 max-[540px]:[&>[data-seller~=button]]:px-2.5 max-[540px]:[&_select]:flex-1"
        data-seller="toolbar"
      >
        <div
          className="flex gap-1 items-center flex-wrap [&_button]:[border:0] [&_button]:bg-transparent [&_button]:text-[#7a89a1] [&_button]:py-2 [&_button]:px-3 [&_button]:rounded-[6px] [&_button]:text-[10px] [&_button]:flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_button.is-active]:text-[#315eea] [&_button.is-active]:bg-[#edf3ff] [&_button.is-active]:font-[650] [&_button>span:not(.anticon)]:text-[9px] [&_button>span:not(.anticon)]:bg-[#edf1f8] [&_button>span:not(.anticon)]:py-0 [&_button>span:not(.anticon)]:px-[5px] [&_button>span:not(.anticon)]:rounded-[4px] [&_button.is-active>span:not(.anticon)]:bg-[#315eea] [&_button.is-active>span:not(.anticon)]:text-[#fff] max-[540px]:[&_button]:py-[7px] max-[540px]:[&_button]:px-2.5 max-[540px]:[&_button]:text-[9px]"
          data-seller="tabs"
        >
          {[['all', 'Tất cả'], ...Object.entries(auctionStatuses)].map(([key, label]) => (
            <button
              key={key}
              className={cn(tab === key ? 'is-active' : '')}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <label
          className="flex items-center gap-2 [border:1px_solid_#e5ebf4] rounded-[7px] py-2 px-2.5 min-w-[160px] flex-1 max-w-[330px] text-[#8da0bf] bg-[#f9fbff] [&_input]:[border:0] [&_input]:bg-transparent [&_input]:[outline:none] [&_input]:w-full [&_input]:min-w-0 [&_input]:text-[10px] [&_input::placeholder]:text-[#a0aec3]"
          data-seller="search-field"
        >
          <SearchOutlined className="text-[16px]" aria-hidden="true" />
          <input
            aria-label="Tìm phiên đấu giá"
            placeholder="Tìm theo lô, tên vật phẩm..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      {rows.length ? (
        <div
          className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-5 max-[1050px]:[grid-template-columns:1fr]"
          data-seller="auction-grid"
        >
          {rows.map((auction) => (
            <article
              className="bg-white [border:1px_solid_#e5ebf4] rounded-[12px] overflow-hidden [&:hover_[data-seller~=auction-image]_img]:[transform:scale(1.04)] [&_h2]:text-[14px] [&_h2]:font-[650] [&_h2]:leading-[1.6] [&_h2]:my-[7px] [&_h2]:mx-0 max-[1250px]:[&_h2]:text-[12px] max-[1050px]:[&_h2]:text-[15px] max-[540px]:[&_h2]:text-[12px]"
              data-seller="auction-card"
              key={auction.id}
            >
              <div
                className="flex items-center justify-between py-4 px-5 [border-bottom:1px_solid_#eef2f8] gap-2 [&>span:not(.anticon):last-child]:flex [&>span:not(.anticon):last-child]:items-center [&>span:not(.anticon):last-child]:gap-[5px] [&>span:not(.anticon):last-child]:text-[9px] [&>span:not(.anticon):last-child]:text-[#8da0bc] max-[540px]:py-[13px] max-[540px]:px-[15px]"
                data-seller="auction-card-top"
              >
                <Badge
                  tone={
                    auction.status === 'live'
                      ? 'green'
                      : auction.status === 'pending'
                        ? 'amber'
                        : 'gray'
                  }
                >
                  {auction.status === 'live' && (
                    <PlayCircleOutlined className="text-[12px]" aria-hidden="true" />
                  )}
                  {auctionStatuses[auction.status]}
                </Badge>
                <span>
                  <CodeSandboxOutlined className="text-[13px]" aria-hidden="true" />
                  Mô hình {auction.model}
                </span>
              </div>
              <div
                className="flex gap-4.5 p-5 [&>div:last-child]:min-w-0 [&_small]:text-[#99a7be] [&_small]:text-[9px] [&_p]:text-[10px] [&_p]:text-[#8e9eb7] [&_p]:leading-[1.9] [&_p]:m-0 max-[1250px]:p-4 max-[1250px]:gap-[13px] max-[1050px]:p-5 max-[1050px]:gap-5 max-[540px]:p-[15px] max-[540px]:gap-[13px] max-[540px]:[&_p]:text-[9px]"
                data-seller="auction-card-body"
              >
                <div
                  className="w-[140px] h-[170px] shrink-0 [background:linear-gradient(135deg,_#eef3fb,_#e6edf9)] rounded-[9px] overflow-hidden relative grid [place-items:center] [&_img]:w-[95%] [&_img]:h-[90%] [&_img]:object-contain [&_img]:mix-blend-multiply [&_img]:[transition:transform_0.3s] [&>span:not(.anticon)]:absolute [&>span:not(.anticon)]:bottom-2.5 [&>span:not(.anticon)]:text-[7px] [&>span:not(.anticon)]:tracking-[2px] [&>span:not(.anticon)]:text-[#8fa4ca] min-[1600px]:w-[175px] min-[1600px]:h-[190px] max-[1250px]:w-[110px] max-[1250px]:h-[145px] max-[1050px]:w-[160px] max-[1050px]:h-[175px] max-[540px]:w-[100px] max-[540px]:h-[145px]"
                  data-seller="auction-image"
                >
                  <img src={auction.image} alt={auction.title} />
                  <span>3D COLLECTION</span>
                </div>
                <div>
                  <small>LÔ #{auction.id}</small>
                  <h2>{auction.title}</h2>
                  <p>{auction.description}</p>
                  <div
                    className="flex justify-between gap-2.5 mt-[15px] [&_strong]:block [&_strong]:text-[#27436d] [&_strong]:text-[15px] [&_strong]:tracking-[-0.3px] [&_strong]:font-[650] [&>div:last-child]:text-right [&>div:last-child]:shrink-0 [&>div:last-child_strong]:text-[#315eea] max-[540px]:flex-wrap max-[540px]:gap-2 max-[540px]:[&_strong]:text-[13px] max-[540px]:[&>div:last-child]:text-left max-[540px]:[&>div:last-child]:flex max-[540px]:[&>div:last-child]:gap-1 max-[540px]:[&>div:last-child]:items-center max-[540px]:[&_small]:text-[8px]"
                    data-seller="auction-pricing"
                  >
                    <div>
                      <small>
                        {auction.status === 'ended' ? 'Giá kết thúc' : 'Giá hiện tại / khởi điểm'}
                      </small>
                      <strong>{money(auction.price)}</strong>
                    </div>
                    <div>
                      <strong>{auction.bids}</strong>
                      <small>lượt trả giá</small>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="flex items-center gap-2 [padding:0_20px_15px] text-[#8ca0bf] text-[9px] [&>.anticon]:shrink-0 [&>.anticon]:text-[#849fce]!"
                data-seller="auction-event"
              >
                <SafetyCertificateOutlined className="text-[16px]" aria-hidden="true" />
                <span>
                  {auction.status === 'pending'
                    ? 'Mô hình đang chờ thẩm định trong bản minh họa.'
                    : 'Phiên minh họa · chưa có kết nối phòng đấu giá thật.'}
                </span>
              </div>
              <div
                className="[border-top:1px_solid_#eff3f9] py-[13px] px-5 flex justify-between items-center gap-2.5 bg-[#fcfdff] [&>span:not(.anticon)]:flex [&>span:not(.anticon)]:items-center [&>span:not(.anticon)]:gap-[5px] [&>span:not(.anticon)]:text-[9px] [&>span:not(.anticon)]:text-[#91a3be] max-[540px]:py-3 max-[540px]:px-[15px] max-[540px]:flex-wrap max-[540px]:[&>span:not(.anticon)]:text-[8px] max-[540px]:[&_[data-seller~=button]]:text-[9px]! max-[540px]:[&_[data-seller~=button]]:py-[7px] max-[540px]:[&_[data-seller~=button]]:px-2.5"
                data-seller="auction-card-footer"
              >
                <span>
                  <FieldTimeOutlined className="text-[14px]" aria-hidden="true" />
                  {auction.status === 'live' ? 'Phiên live minh họa' : 'Thông tin vật phẩm'}
                </span>
                <SellerButton
                  secondary
                  onClick={() => {
                    setDetail(auction);
                    setRotation(0);
                  }}
                >
                  <VideoCameraOutlined className="text-[15px]" aria-hidden="true" />
                  Xem vật phẩm
                </SellerButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Panel title="Các phiên đấu giá">
          <EmptyState
            title={preview ? 'Không có phiên phù hợp' : 'Bắt đầu phiên đấu giá đầu tiên'}
            description={
              preview
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                : 'Chuẩn bị vật phẩm, giá khởi điểm và thời gian để lưu bản nháp phiên.'
            }
            action={
              <SellerLink to="/seller/auctions/new">
                <PlusOutlined className="text-[15px]" aria-hidden="true" />
                Tạo bản nháp phiên
              </SellerLink>
            }
          />
        </Panel>
      )}
      {auctionDrafts.length > 0 && (
        <Panel
          title="Bản nháp phiên đấu giá"
          subtitle="Được lưu trên trình duyệt này, chưa phát hành"
        >
          <div className="flex flex-col gap-2.5" data-seller="mini-list">
            {auctionDrafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center gap-[13px] p-[13px] [border:1px_solid_#e9eef7] rounded-[9px] [&>.anticon]:text-[#7c9bd8]! [&>.anticon]:shrink-0 [&_strong]:text-[12px] [&_strong]:font-[550] [&_strong]:block [&_small]:text-[10px] [&_small]:text-[#91a2bc] [&_small]:block [&_small]:mt-1 [&_[data-seller~=badge]]:ml-auto [&_button]:ml-2 max-[540px]:flex-wrap max-[540px]:[&>div]:min-w-[170px] max-[540px]:[&>div]:flex-1 max-[540px]:[&_small]:text-[9px] max-[540px]:[&_[data-seller~=text-button]]:ml-auto"
                data-seller="draft-row"
              >
                <CodeSandboxOutlined className="text-[22px]" aria-hidden="true" />
                <div>
                  <strong>{draft.title}</strong>
                  <small>
                    {money(draft.price)} · Bước giá {money(draft.increment)}
                  </small>
                </div>
                <Badge tone="gray">Bản nháp</Badge>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <div
        className="grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-4.5 max-[1050px]:gap-3 max-[540px]:[grid-template-columns:1fr]"
        data-seller="policy-grid"
      >
        <div
          className="bg-white [border:1px_solid_#e5ebf4] rounded-[11px] p-[21px] [&>.anticon]:text-[#7291d7]! [&>.anticon]:mb-3 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mb-[9px] [&_p]:text-[11px] [&_p]:text-[#8c9bb1] [&_p]:m-0 [&_p]:leading-[1.9] max-[1050px]:p-[17px] max-[760px]:[&_h3]:text-[11px] max-[760px]:[&_p]:text-[10px] max-[540px]:p-4.5 max-[540px]:grid max-[540px]:[grid-template-columns:24px_1fr] max-[540px]:gap-x-3 max-[540px]:[&>.anticon]:[grid-row:1/3] max-[540px]:[&>.anticon]:m-0 max-[540px]:[&_h3]:[margin:0_0_7px] max-[540px]:[&_h3]:text-[12px] max-[540px]:[&_p]:text-[10px]"
          data-seller="policy"
        >
          <FieldTimeOutlined className="text-[22px]" aria-hidden="true" />
          <h3>Chống trả giá phút cuối</h3>
          <p>
            Theo đặc tả dự án: lượt trả giá hợp lệ trong 2 phút cuối sẽ gia hạn phiên thêm 5 phút.
          </p>
        </div>
        <div
          className="bg-white [border:1px_solid_#e5ebf4] rounded-[11px] p-[21px] [&>.anticon]:text-[#7291d7]! [&>.anticon]:mb-3 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mb-[9px] [&_p]:text-[11px] [&_p]:text-[#8c9bb1] [&_p]:m-0 [&_p]:leading-[1.9] max-[1050px]:p-[17px] max-[760px]:[&_h3]:text-[11px] max-[760px]:[&_p]:text-[10px] max-[540px]:p-4.5 max-[540px]:grid max-[540px]:[grid-template-columns:24px_1fr] max-[540px]:gap-x-3 max-[540px]:[&>.anticon]:[grid-row:1/3] max-[540px]:[&>.anticon]:m-0 max-[540px]:[&_h3]:[margin:0_0_7px] max-[540px]:[&_h3]:text-[12px] max-[540px]:[&_p]:text-[10px]"
          data-seller="policy"
        >
          <SafetyCertificateOutlined className="text-[22px]" aria-hidden="true" />
          <h3>Bảo vệ thanh toán Escrow</h3>
          <p>
            Theo dõi ký quỹ và trạng thái thanh toán trước khi bàn giao vật phẩm cho người thắng.
          </p>
        </div>
        <div
          className="bg-white [border:1px_solid_#e5ebf4] rounded-[11px] p-[21px] [&>.anticon]:text-[#7291d7]! [&>.anticon]:mb-3 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mb-[9px] [&_p]:text-[11px] [&_p]:text-[#8c9bb1] [&_p]:m-0 [&_p]:leading-[1.9] max-[1050px]:p-[17px] max-[760px]:[&_h3]:text-[11px] max-[760px]:[&_p]:text-[10px] max-[540px]:p-4.5 max-[540px]:grid max-[540px]:[grid-template-columns:24px_1fr] max-[540px]:gap-x-3 max-[540px]:[&>.anticon]:[grid-row:1/3] max-[540px]:[&>.anticon]:m-0 max-[540px]:[&_h3]:[margin:0_0_7px] max-[540px]:[&_h3]:text-[12px] max-[540px]:[&_p]:text-[10px]"
          data-seller="policy"
        >
          <CodeSandboxOutlined className="text-[22px]" aria-hidden="true" />
          <h3>Chuẩn bị mô hình 3D</h3>
          <p>Lựa chọn mô hình phù hợp, thông tin vật phẩm rõ ràng và hình ảnh có chất lượng.</p>
        </div>
      </div>
      <Popup isOpen={!!detail} onClose={() => setDetail(null)} title="Xem trước vật phẩm" size="lg">
        {detail && (
          <div
            className="flex flex-col gap-5 text-[#566b8c] text-[13px] [&_h3]:font-[650] [&_h3]:text-[17px] [&_h3]:text-[#1e355b] [&_h3]:m-0 [&_p]:leading-[1.9] [&_p]:m-0 [&_p]:text-[#8192ac]"
            data-seller="detail-content"
          >
            <Badge tone="amber">Ảnh vật phẩm minh họa · không phải phòng live</Badge>
            <div
              className="grid [place-items:center] [background:radial-gradient(ellipse,_#edf3ff,_#f8faff)] [border:1px_solid_#e6edf9] rounded-[14px] overflow-hidden h-[300px] [&>img]:max-w-[80%] [&>img]:max-h-[260px] [&>img]:object-contain [&>img]:mix-blend-multiply [&>img]:[transition:transform_0.15s] max-[540px]:h-[220px] max-[540px]:[&>img]:max-h-[200px]"
              data-seller="object-viewer"
            >
              <img src={detail.image} className={rotationClasses[rotation]} alt={detail.title} />
            </div>
            <label
              className="text-[11px] text-[#8096ba] flex items-center gap-[15px] [&_input]:flex-1 [&_input]:[accent-color:#315eea]"
              data-seller="slider-label"
            >
              Xoay ảnh vật phẩm
              <input
                type="range"
                min="-30"
                step="10"
                max="30"
                value={rotation}
                onChange={(event) => setRotation(Number(event.target.value))}
              />
            </label>
            <h3>{detail.title}</h3>
            <p>{detail.description}</p>
            <strong>{money(detail.price)}</strong>
            <SellerButton
              onClick={() =>
                notify(
                  'Phòng đấu giá trực tiếp chưa được kết nối. Không có phiên thật được mở.',
                  'error',
                )
              }
            >
              <PlayCircleOutlined className="text-[15px]" aria-hidden="true" />
              Thông tin phòng đấu giá
            </SellerButton>
          </div>
        )}
      </Popup>
    </div>
  );
}
