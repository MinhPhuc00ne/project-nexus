import { Link } from 'react-router-dom';
import { ArrowRight as ArrowRightOutlined } from 'lucide-react';
import {
  ExternalLink as ExportOutlined,
  Box as CodeSandboxOutlined,
  Calendar as CalendarOutlined,
  Clock as ClockCircleOutlined,
  ShieldCheck as SafetyCertificateOutlined,
  Store as ShopOutlined,
  Truck as TruckOutlined,
  WalletCards as WalletOutlined,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n/config';
import { ModuleNotice, Panel, PolicyCards } from '../../components/seller/SellerUI';
import {
  StoreIdentity,
  SellerStats,
  RevenuePanels,
  OrdersPreview,
  AuctionsPreview,
  WalletPanel,
} from '../../components/seller/SellerOverviewPanels';

export default function SellerDashboardPage({ home = false }: { home?: boolean }) {
  const { t, i18n } = useTranslation('seller');
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <div
        className="flex justify-between items-center gap-4.5 mb-0.5 [&_h1]:text-[26px] [&_h1]:tracking-[-0.9px] [&_h1]:[margin:5px_0_4px] [&_h1]:leading-[1.4] [&_h1]:font-bold [&_p]:text-[12px] [&_p]:text-[#8b98b0] [&_p]:m-0 max-[1050px]:[&_h1]:text-[23px] max-[760px]:[&_h1]:text-[23px] max-[760px]:items-start max-[540px]:[&_h1]:text-[21px] max-[540px]:[&_h1]:max-w-[260px] max-[540px]:[&_p]:text-[10px]"
        data-seller="overview-intro"
      >
        <div>
          <span
            className="text-[9px] tracking-[1.7px] text-[#315eea] font-bold max-[540px]:text-[8px]"
            data-seller="eyebrow"
          >
            {t('dashboard.eyebrow')}
          </span>
          <h1>{home ? t('dashboard.homeTitle') : t('dashboard.overviewTitle')}</h1>
          <p>{home ? t('dashboard.homeSubtitle') : t('dashboard.overviewSubtitle')}</p>
        </div>
        <span
          className="flex items-center gap-2 bg-white [border:1px_solid_#e5ebf4] rounded-[8px] py-2 px-3 text-[#7889a6] text-[11px] whitespace-nowrap max-[760px]:text-[9px] max-[760px]:p-[7px] max-[540px]:hidden"
          data-seller="date"
        >
          <CalendarOutlined className="text-[15px]" aria-hidden="true" />
          {new Date().toLocaleDateString(getIntlLocale(i18n.language))}
        </span>
      </div>
      <StoreIdentity />
      {home && (
        <div
          className="grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] gap-[13px] [&>a]:flex [&>a]:items-center [&>a]:gap-3 [&>a]:bg-white [&>a]:[border:1px_solid_#e5ebf4] [&>a]:rounded-[10px] [&>a]:py-4 [&>a]:px-3.5 [&>a]:[transition:box-shadow_0.2s,_transform_0.2s] [&>a]:text-inherit [&>a:hover]:[box-shadow:0_5px_15px_#315eea0d] [&>a:hover]:[transform:translateY(-2px)] [&>a:hover]:[border-color:#c8d7fd] [&_i]:grid [&_i]:[place-items:center] [&_i]:bg-[#eef4ff] [&_i]:rounded-[9px] [&_i]:w-9.5 [&_i]:h-9.5 [&_i]:shrink-0 [&_i]:text-[#315eea] [&_strong]:text-[11px] [&_strong]:block [&_strong]:font-semibold [&_small]:text-[9px] [&_small]:text-[#8a9ab4] [&>a>svg]:ml-auto [&>a>svg]:text-[#8da6d3]! [&>a>svg]:shrink-0 max-[1250px]:gap-2.5 max-[1250px]:[&>a]:py-[13px] max-[1250px]:[&>a]:px-2.5 max-[1250px]:[&>a]:gap-[9px] max-[1250px]:[&_i]:w-[31px] max-[1250px]:[&_i]:h-8.5 max-[1250px]:[&_small]:text-[8px] max-[1250px]:[&>a>svg]:hidden max-[1050px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[540px]:[&>a]:p-3 max-[540px]:[&>a]:gap-[9px] max-[540px]:[&_strong]:text-[10px] max-[540px]:[&_small]:text-[8px] max-[540px]:[&_i]:w-[29px] max-[540px]:[&_i]:h-8 max-[540px]:[&_svg]:w-4.5 max-[540px]:gap-[9px]"
          data-seller="quick-links"
        >
          {[
            [
              '/seller/orders',
              TruckOutlined,
              t('dashboard.quickLinks.ordersTitle'),
              t('dashboard.quickLinks.ordersDesc'),
            ],
            [
              '/seller/auctions',
              CodeSandboxOutlined,
              t('dashboard.quickLinks.auctionsTitle'),
              t('dashboard.quickLinks.auctionsDesc'),
            ],
            [
              '/seller/products',
              ShopOutlined,
              t('dashboard.quickLinks.productsTitle'),
              t('dashboard.quickLinks.productsDesc'),
            ],
            [
              '/seller/finance',
              WalletOutlined,
              t('dashboard.quickLinks.financeTitle'),
              t('dashboard.quickLinks.financeDesc'),
            ],
          ].map(([to, Icon, title, text]) => {
            const ItemIcon = Icon as typeof TruckOutlined;
            return (
              <Link key={String(to)} to={String(to)}>
                <i>
                  <ItemIcon className="text-[21px]" aria-hidden="true" />
                </i>
                <span>
                  <strong>{String(title)}</strong>
                  <small>{String(text)}</small>
                </span>
                <ExportOutlined className="text-[17px]" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      )}
      <ModuleNotice label={t('dashboard.moduleNoticeLabel')} />
      <SellerStats />
      <RevenuePanels compact={home} />
      <div
        className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-5 max-[1050px]:[grid-template-columns:1fr]"
        data-seller="two-columns"
      >
        <OrdersPreview />
        <AuctionsPreview />
      </div>
      {home && <AuctionsPreview full />}
      <div
        className="grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-5 max-[1050px]:[grid-template-columns:1fr]"
        data-seller="two-columns"
      >
        <WalletPanel />
        <Panel
          title={t('dashboard.partnerTitle')}
          subtitle={t('dashboard.partnerSubtitle')}
          action={<SafetyCertificateOutlined className="text-[19px]" aria-hidden="true" />}
        >
          <div
            className="flex flex-col gap-3.5 [&>div]:flex [&>div]:items-start [&>div]:gap-2.5 [&>div]:p-[13px] [&>div]:[border:1px_solid_#ecf1f9] [&>div]:rounded-[9px] [&>div]:bg-[#f9fbff] [&_svg]:w-4.5 [&_svg]:shrink-0 [&_svg]:text-[#7295e4]! [&_svg]:mt-[1px] [&_strong]:text-[11px] [&_strong]:font-[550] [&_p]:text-[10px] [&_p]:text-[#91a0b8] [&_p]:[margin:4px_0_0] [&_p]:leading-[1.8]"
            data-seller="checklist"
          >
            <div>
              <SafetyCertificateOutlined className="text-[18px]" aria-hidden="true" />
              <span>
                <strong>{t('dashboard.partner.infoTitle')}</strong>
                <p>{t('dashboard.partner.infoDesc')}</p>
              </span>
            </div>
            <div>
              <TruckOutlined className="text-[18px]" aria-hidden="true" />
              <span>
                <strong>{t('dashboard.partner.shippingTitle')}</strong>
                <p>{t('dashboard.partner.shippingDesc')}</p>
              </span>
            </div>
            <div>
              <ClockCircleOutlined className="text-[18px]" aria-hidden="true" />
              <span>
                <strong>{t('dashboard.partner.supportTitle')}</strong>
                <p>{t('dashboard.partner.supportDesc')}</p>
              </span>
            </div>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 p-0 [border:0] bg-transparent text-[#315eea] text-[10px] font-[550]"
            data-seller="text-button"
            to="/seller/settings"
          >
            {t('dashboard.completeShop')}{' '}
            <ArrowRightOutlined className="text-[14px]" aria-hidden="true" />
          </Link>
        </Panel>
      </div>
      {!home && <PolicyCards />}
      <div
        className="flex items-center gap-2 text-[#9aa7bd] text-[10px] py-[5px] px-0 [&>svg]:shrink-0 [&>[data-seller~=button]]:ml-auto max-[760px]:items-start max-[760px]:flex-wrap max-[760px]:leading-[1.8] max-[760px]:[&>span]:flex-1 max-[760px]:[&>[data-seller~=button]]:ml-[23px] max-[540px]:[&_[data-seller~=button]]:text-[9px]!"
        data-seller="bottom-note"
      >
        <SafetyCertificateOutlined className="text-[15px]" aria-hidden="true" />
        <span>{t('dashboard.bottomNoteApi')}</span>
      </div>
    </div>
  );
}
