import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';
import {
  Box as CodeSandboxOutlined,
  Clock as ClockCircleOutlined,
  Clock3 as FieldTimeOutlined,
  History as HistoryOutlined,
  Wrench as BuildOutlined,
  Plus as PlusOutlined,
  PlayCircle as PlayCircleOutlined,
  Search as SearchOutlined,
  ShieldCheck as SafetyCertificateOutlined,
} from 'lucide-react';
import { useSellerWorkspace } from '../../components/seller/SellerWorkspace';
import SellerAuctionCard from '../../components/seller/SellerAuctionCard';
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
import { auctionStatuses, money, type SellerAuction } from '../../components/seller/sellerData';
import {
  getAuctionsApi,
  resolveAuctionImageUrl,
  type AuctionEntity,
} from '../../services/auction.service';

function toSellerAuction(auction: AuctionEntity): SellerAuction {
  const status: SellerAuction['status'] =
    auction.status === 'ACTIVE' || auction.status === 'EXTENDED'
      ? 'live'
      : auction.status === 'SCHEDULED'
        ? 'scheduled'
        : auction.status === 'DRAFT'
          ? 'pending'
          : 'ended';
  const image =
    ((auction.imageUrl ? resolveAuctionImageUrl(auction.imageUrl) : '') ||
      auction.product?.images?.find((item) => item.isThumbnail)?.imageUrl) ??
    auction.product?.images?.[0]?.imageUrl ??
    '';

  return {
    id: auction.id,
    title: auction.title || auction.product?.title || 'Phiên đấu giá',
    description:
      status === 'scheduled'
        ? `Mở phiên: ${new Date(auction.startTime).toLocaleString('vi-VN')}`
        : `Kết thúc: ${new Date(auction.endTime).toLocaleString('vi-VN')}`,
    image,
    price: Number(auction.currentHighestBid || auction.startingPrice || 0),
    bids: auction.totalBidsCount ?? 0,
    itemCount: auction.items?.length ?? (auction.product ? 1 : 0),
    status,
    model: 'Sản phẩm',
    consignmentDeadline: auction.consignmentDeadline,
    isConsignmentLocked: auction.isConsignmentLocked,
  };
}

export default function SellerAuctionsPage() {
  const { drafts } = useSellerWorkspace();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [auctions, setAuctions] = useState<SellerAuction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    void getAuctionsApi({ limit: 100 })
      .then((response) => {
        if (active) setAuctions(response.items.map(toSellerAuction));
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Không thể tải các phiên đấu giá.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rows = auctions.filter(
    (auction) =>
      (tab === 'all' || auction.status === tab) &&
      `${auction.title} ${auction.id}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const auctionDrafts = drafts.filter((draft) => draft.kind === 'auction');
  const activeCount = auctions.filter((auction) => auction.status === 'live').length;
  const pendingCount = auctions.filter((auction) => auction.status === 'pending').length;
  const scheduledCount = auctions.filter((auction) => auction.status === 'scheduled').length;
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <PageHeading
        title="Quản trị đấu giá"
        description="Một không gian cho vật phẩm độc bản và những phiên đấu giá của bạn."
        actions={
          <>
            <SellerButton secondary onClick={() => setTab('ended')}>
              <HistoryOutlined className="text-[15px]" aria-hidden="true" />
              Lịch sử đấu giá
            </SellerButton>
            <SellerLink to="/seller/auctions/new">
              <PlusOutlined className="text-[16px]" aria-hidden="true" />
              Gửi vật phẩm đấu giá
            </SellerLink>
          </>
        }
      />
      <ModuleNotice label="Phiên đấu giá" />
      <div
        className="grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] gap-4 min-[1600px]:gap-5 max-[1250px]:gap-3 max-[1050px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[540px]:gap-2.5"
        data-seller="stats-grid"
      >
        <StatCard
          label="Phiên đang diễn ra"
          value={isLoading ? '…' : activeCount.toString().padStart(2, '0')}
          detail="Phòng đấu giá trực tiếp"
          icon={<PlayCircleOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Chờ thẩm định"
          value={isLoading ? '…' : pendingCount.toString().padStart(2, '0')}
          detail="Vật phẩm & mô hình GLB"
          icon={<BuildOutlined className="text-[20px]" aria-hidden="true" />}
        />
        <StatCard
          label="Phiên sắp diễn ra"
          value={isLoading ? '…' : scheduledCount.toString().padStart(2, '0')}
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
        <div className="ml-auto whitespace-nowrap">
          <SellerLink to="/seller/auctions/new">
            <PlusOutlined className="text-[15px]" aria-hidden="true" />
            Gửi vật phẩm đấu giá
          </SellerLink>
        </div>
      </div>
      {isLoading ? (
        <Panel title="Các phiên đấu giá">
          <p className="py-8 text-center text-sm text-slate-500">Đang tải các phiên đấu giá…</p>
        </Panel>
      ) : loadError ? (
        <Panel title="Các phiên đấu giá">
          <div role="alert" className="py-8 text-center text-sm text-red-600">
            {loadError}
          </div>
        </Panel>
      ) : rows.length ? (
        <div
          className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-5 max-[1050px]:[grid-template-columns:1fr]"
          data-seller="auction-grid"
        >
          {rows.map((auction) => (
            <SellerAuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      ) : (
        <Panel title="Các phiên đấu giá">
          <EmptyState
            title={auctions.length ? 'Không có phiên phù hợp' : 'Chưa có phiên đấu giá nào'}
            description={
              auctions.length
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                : 'Hiện chưa có phiên đấu giá được mở. Bạn có thể gửi vật phẩm để chờ phiên phù hợp.'
            }
            action={
              <SellerLink to="/seller/auctions/new">
                <PlusOutlined className="text-[15px]" aria-hidden="true" />
                Gửi vật phẩm đấu giá
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
          <h3>Chuẩn bị vật phẩm</h3>
          <p>
            Chuẩn bị thông tin vật phẩm rõ ràng và hình ảnh có chất lượng trước khi gửi thẩm định.
          </p>
        </div>
      </div>
    </div>
  );
}
