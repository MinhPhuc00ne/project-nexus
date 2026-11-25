import {
  Box as CodeSandboxOutlined,
  Clock3 as FieldTimeOutlined,
  PlayCircle as PlayCircleOutlined,
  Plus as PlusOutlined,
  ShieldCheck as SafetyCertificateOutlined,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { money, type SellerAuction } from './sellerData';
import { canSubmitConsignment } from './sellerConsignmentHelpers';
import { Badge, SellerLink } from './SellerUI';

/**
 * Seller auction card component properties.
 */
export interface SellerAuctionCardProps {
  auction: SellerAuction;
}

/**
 * Renders the seller-facing summary card for an auction.
 *
 * @param props - Auction data to display.
 * @returns Auction summary card with navigation and consignment action.
 */
export default function SellerAuctionCard({ auction }: SellerAuctionCardProps) {
  const { t } = useTranslation('seller');
  return (
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
            auction.status === 'live' ? 'green' : auction.status === 'pending' ? 'amber' : 'gray'
          }
        >
          {auction.status === 'live' && (
            <PlayCircleOutlined className="text-[12px]" aria-hidden="true" />
          )}
          {t(`auctions.statuses.${auction.status}`)}
        </Badge>
        <span>
          <CodeSandboxOutlined className="text-[13px]" aria-hidden="true" />
          {auction.model}
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
          {auction.image ? (
            <img src={auction.image} alt={auction.title} />
          ) : (
            <CodeSandboxOutlined className="text-[34px] text-[#8fa4ca]" aria-hidden="true" />
          )}
          <span>{t('auctions.card.collectionLabel')}</span>
        </div>
        <div>
          <small>{t('auctions.card.lotPrefix', { id: auction.id })}</small>
          <h2>{auction.title}</h2>
          <p>{auction.description}</p>
          <div
            className="flex justify-between gap-2.5 mt-[15px] [&_strong]:block [&_strong]:text-[#27436d] [&_strong]:text-[15px] [&_strong]:tracking-[-0.3px] [&_strong]:font-[650] [&>div:last-child]:text-right [&>div:last-child]:shrink-0 [&>div:last-child_strong]:text-[#315eea] max-[540px]:flex-wrap max-[540px]:gap-2 max-[540px]:[&_strong]:text-[13px] max-[540px]:[&>div:last-child]:text-left max-[540px]:[&>div:last-child]:flex max-[540px]:[&>div:last-child]:gap-1 max-[540px]:[&>div:last-child]:items-center max-[540px]:[&_small]:text-[8px]"
            data-seller="auction-pricing"
          >
            <div>
              <small>
                {auction.status === 'ended'
                  ? t('auctions.card.endedPrice')
                  : t('auctions.card.currentPrice')}
              </small>
              <strong>{money(auction.price)}</strong>
            </div>
            <div>
              <strong>{auction.bids}</strong>
              <small>{t('auctions.card.bidsUnit')}</small>
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
          {auction.itemCount
            ? t('auctions.card.approvedItemsCount', { count: auction.itemCount })
            : t('auctions.card.noApprovedItems')}
        </span>
      </div>
      <div
        className="[border-top:1px_solid_#eff3f9] py-[13px] px-5 flex justify-between items-center gap-2.5 bg-[#fcfdff] [&>span:not(.anticon)]:flex [&>span:not(.anticon)]:items-center [&>span:not(.anticon)]:gap-[5px] [&>span:not(.anticon)]:text-[9px] [&>span:not(.anticon)]:text-[#91a3be] max-[540px]:py-3 max-[540px]:px-[15px] max-[540px]:flex-wrap max-[540px]:[&>span:not(.anticon)]:text-[8px] max-[540px]:[&_[data-seller~=button]]:text-[9px]! max-[540px]:[&_[data-seller~=button]]:py-[7px] max-[540px]:[&_[data-seller~=button]]:px-2.5"
        data-seller="auction-card-footer"
      >
        <span>
          <FieldTimeOutlined className="text-[14px]" aria-hidden="true" />
          {auction.itemCount
            ? t('auctions.card.itemsListLabel')
            : t('auctions.card.waitingItemsLabel')}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <SellerLink secondary to={`/seller/auctions/${encodeURIComponent(auction.id)}`}>
            <PlayCircleOutlined className="text-[15px]" aria-hidden="true" />
            {t('auctions.card.viewSession')}
          </SellerLink>
          {canSubmitConsignment(auction) && (
            <SellerLink to={`/seller/auctions/new?auctionId=${encodeURIComponent(auction.id)}`}>
              <PlusOutlined className="text-[15px]" aria-hidden="true" />
              {t('auctions.card.addProduct')}
            </SellerLink>
          )}
        </div>
      </div>
    </article>
  );
}
