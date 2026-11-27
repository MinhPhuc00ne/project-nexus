import { Link } from 'react-router-dom';
import { Film, CheckCircle2, ShieldCheck, ShieldHalf, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const commitmentDefs = [
  {
    icon: ShieldCheck,
    titleKey: 'footer.assurances.authenticTitle',
    descKey: 'footer.assurances.authenticDesc',
  },
  {
    icon: ShieldHalf,
    titleKey: 'footer.assurances.paymentTitle',
    descKey: 'footer.assurances.paymentDesc',
  },
  {
    icon: Truck,
    titleKey: 'footer.assurances.shippingTitle',
    descKey: 'footer.assurances.shippingDesc',
  },
  {
    icon: Film,
    titleKey: 'footer.assurances.videoTitle',
    descKey: 'footer.assurances.videoDesc',
  },
] as const;

const customerCareLinks = [
  { key: 'footer.customerCareLinks.help', href: '/help' },
  { key: 'footer.customerCareLinks.guide', href: '/guide' },
  { key: 'footer.customerCareLinks.refundPolicy', href: '/refund-policy' },
  { key: 'footer.customerCareLinks.insurance', href: '/insurance' },
  { key: 'footer.customerCareLinks.warranty', href: '/warranty' },
] as const;

const platformLegalLinks = [
  { key: 'footer.legalLinks.about', href: '/about' },
  { key: 'footer.legalLinks.auctionGuidelines', href: '/auction-guidelines' },
  { key: 'footer.legalLinks.privacy', href: '/privacy' },
  { key: 'footer.legalLinks.escrowTerms', href: '/escrow-terms' },
  { key: 'footer.legalLinks.contact', href: '/contact' },
] as const;

export interface FooterProps {
  className?: string;
  showAssurances?: boolean;
  year?: number;
}

export function Footer({ className = '', showAssurances = true, year = 2026 }: FooterProps) {
  const { t } = useTranslation('common');
  return (
    <footer
      className={`w-full border-t border-slate-200 bg-white font-sans text-slate-900 ${className}`}
    >
      {showAssurances && (
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="storefront-container grid grid-cols-2 gap-x-3 gap-y-3 py-4 sm:gap-x-6 sm:gap-y-5 sm:py-5 lg:grid-cols-4">
            {commitmentDefs.map(({ icon: Icon, titleKey, descKey }) => (
              <div
                className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3"
                key={titleKey}
              >
                <Icon
                  className="size-5 shrink-0 text-blue-600 sm:size-6"
                  aria-hidden="true"
                  strokeWidth={2}
                />
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold leading-5">{t(titleKey)}</p>
                  <p className="m-0 text-xs leading-5 text-muted">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="storefront-container grid grid-cols-2 gap-x-4 gap-y-5 py-5 sm:gap-8 sm:py-8 lg:grid-cols-[1.8fr_1fr_1fr_1.2fr]">
        {/* Brand column */}
        <div className="col-span-full min-w-0 overflow-wrap-anywhere lg:col-span-1 lg:max-w-sm">
          <div className="mb-2 flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center text-slate-900 no-underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              <img
                src="/images/logo.png"
                alt="NEXUS"
                className="h-11 w-auto object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = '/images/NEXUS.png';
                }}
              />
            </Link>
            <div className="ml-1 flex items-center gap-1.5">
              <span className="rounded bg-[var(--color-primary-dark)] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">
                MALL
              </span>
              <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">
                3D BID
              </span>
            </div>
          </div>

          <p className="mt-2.5 mb-0 max-w-xs text-xs leading-[1.65] text-slate-600 max-sm:mt-2 max-sm:max-w-none max-sm:leading-normal">
            {t('footer.description')}
          </p>

          <div className="mt-3.5 flex items-center gap-2 text-[11px] font-medium text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{t('footer.association')}</span>
          </div>
        </div>

        {/* Customer Care column */}
        <nav className="min-w-0" aria-label={t('footer.customerCare')}>
          <h4 className="mb-3 mt-0 text-sm font-semibold leading-5 text-ink">
            {t('footer.customerCare')}
          </h4>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {customerCareLinks.map(({ key, href }) => (
              <li key={key}>
                <Link
                  className="text-sm leading-6 text-muted no-underline transition-colors hover:text-[var(--color-primary-dark)] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:text-xs"
                  to={href}
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Legal & About column */}
        <nav className="min-w-0" aria-label={t('footer.aboutNexus')}>
          <h4 className="mb-3 mt-0 text-sm font-semibold leading-5 text-ink">
            {t('footer.aboutNexus')}
          </h4>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {platformLegalLinks.map(({ key, href }) => (
              <li key={key}>
                <Link
                  className="text-sm leading-6 text-muted no-underline transition-colors hover:text-[var(--color-primary-dark)] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:text-xs"
                  to={href}
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Partners & Payment column */}
        <div className="col-span-full flex min-w-0 flex-col sm:col-span-1 lg:col-span-1">
          <h4 className="mb-3 mt-0 text-xs font-bold leading-5 tracking-wider text-slate-800">
            {t('footer.partnersTitle')}
          </h4>
          <div className="mb-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                PayOS VietQR
              </span>
              <span className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                {t('footer.nexusPayWallet')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                {t('footer.codCash')}
              </span>
            </div>
          </div>

          <p className="mb-1.5 text-[11px] font-medium text-slate-500">
            {t('footer.expressShippingLabel')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
              <Truck className="w-4 h-4 text-orange-600 shrink-0" />
              <span>GHN Express</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
              <span>NEXUS Secure Cargo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-200 bg-white">
        <div className="storefront-container flex flex-col gap-2 py-3 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{t('footer.bctCertified')}</span>
            <span className="text-slate-300">•</span>
            <span>{t('footer.businessLicense')}</span>
          </div>
          <div className="text-xs text-slate-500">
            <span>{t('footer.copyright', { year })}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
