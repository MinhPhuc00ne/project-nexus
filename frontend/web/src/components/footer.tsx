import { Box, CheckCircle2, ShieldCheck, ShieldHalf, Truck } from 'lucide-react';

const commitments = [
  {
    icon: ShieldCheck,
    title: '100% Chính Hãng',
    description: 'Bảo chứng Bộ Công Thương & PCI-DSS',
  },
  {
    icon: ShieldHalf,
    title: 'Thanh Toán Bảo Mật',
    description: 'Escrow PayOS, Stripe & Thẻ quốc tế',
  },
  { icon: Truck, title: 'Đồng Kiểm Tận Nơi', description: 'Vận hành GHN Express & Viettel Post' },
  { icon: Box, title: 'Mô Phỏng 3D Thực', description: 'Kiểm định micro-mesh & vật lý số' },
];

const customerCareLinks = [
  { label: 'Trung Tâm Trợ Giúp 24/7', href: '/help' },
  { label: 'Hướng Dẫn Đấu Giá 3D', href: '/guide' },
  { label: 'Quy Trình Hoàn Tiền & Trả Hàng', href: '/refund-policy' },
  { label: 'Bảo Hiểm Hàng Hóa Giá Trị Cao', href: '/insurance' },
  { label: 'Chính Sách Bảo Hành NEXUS CARE', href: '/warranty' },
];

const platformLegalLinks = [
  { label: 'Giới Thiệu Tập Đoàn NEXUS', href: '/about' },
  { label: 'Quy Chế Hoạt Động Sàn Đấu Giá', href: '/auction-guidelines' },
  { label: 'Chính Sách Bảo Mật Thông Tin', href: '/privacy' },
  { label: 'Điều Khoản Giao Dịch Escrow', href: '/escrow-terms' },
  { label: 'Liên Hệ Hợp Tác Doanh Nghiệp', href: '/contact' },
];

export interface FooterProps {
  className?: string;
  showAssurances?: boolean;
  year?: number;
}

export function Footer({ className = '', showAssurances = true, year = 2025 }: FooterProps) {
  return (
    <footer
      className={`w-full border-t border-slate-200 bg-white font-sans text-slate-900 ${className}`}
    >
      {showAssurances && (
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-3 gap-y-3 px-4 py-4 sm:gap-x-6 sm:gap-y-5 sm:px-8 sm:py-5 lg:grid-cols-4">
            {commitments.map(({ icon: Icon, title, description }) => (
              <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3" key={title}>
                <Icon
                  className="size-5 shrink-0 text-blue-600 sm:size-6"
                  aria-hidden="true"
                  strokeWidth={2}
                />
                <div className="min-w-0">
                  <p className="m-0 text-xs font-semibold leading-4">{title}</p>
                  <p className="m-0 text-[10px] leading-4 text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-5 sm:gap-8 sm:px-8 sm:py-8 lg:grid-cols-[1.8fr_1fr_1fr_1.2fr]">
        {/* Brand column */}
        <div className="col-span-full min-w-0 overflow-wrap-anywhere lg:col-span-1 lg:max-w-sm">
          <div className="mb-2 flex items-center gap-2">
            <a
              href="/"
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
            </a>
            <div className="ml-1 flex items-center gap-1.5">
              <span className="rounded bg-[#ee4d2d] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">
                MALL
              </span>
              <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">
                3D BID
              </span>
            </div>
          </div>

          <p className="mt-2.5 mb-0 max-w-xs text-xs leading-[1.65] text-slate-600 max-sm:mt-2 max-sm:max-w-none max-sm:leading-normal">
            Hệ sinh thái sàn giao dịch thương mại điện tử kết hợp công nghệ đấu giá thực tế ảo 3D
            thời gian thực. Đảm bảo bảo chứng ký gửi, minh bạch kiểm định và giao nhận an toàn toàn
            quốc.
          </p>

          <div className="mt-3.5 flex items-center gap-2 text-[11px] font-medium text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Bảo chứng bởi Hiệp Hội Thương Mại Điện Tử & Đấu Giá Trực Tuyến</span>
          </div>
        </div>

        {/* Customer Care column */}
        <nav className="min-w-0" aria-label="Chăm Sóc Khách Hàng">
          <h4 className="mb-3 mt-0 text-xs font-bold leading-5 tracking-wider text-slate-800">
            CHĂM SÓC KHÁCH HÀNG
          </h4>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {customerCareLinks.map(({ label, href }) => (
              <li key={label}>
                <a
                  className="text-[11px] leading-4 text-slate-600 no-underline transition-colors hover:text-[#ee4d2d] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:text-xs"
                  href={href}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Legal & About column */}
        <nav className="min-w-0" aria-label="Về NEXUS & Pháp Lý">
          <h4 className="mb-3 mt-0 text-xs font-bold leading-5 tracking-wider text-slate-800">
            VỀ NEXUS & PHÁP LÝ
          </h4>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {platformLegalLinks.map(({ label, href }) => (
              <li key={label}>
                <a
                  className="text-[11px] leading-4 text-slate-600 no-underline transition-colors hover:text-[#ee4d2d] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:text-xs"
                  href={href}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Partners & Payment column */}
        <div className="col-span-full flex min-w-0 flex-col sm:col-span-1 lg:col-span-1">
          <h4 className="mb-3 mt-0 text-xs font-bold leading-5 tracking-wider text-slate-800">
            ĐỐI TÁC THANH TOÁN & VẬN CHUYỂN
          </h4>
          <div className="mb-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                PayOS
              </span>
              <span className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                Stripe
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                Visa / Mastercard
              </span>
              <span className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                Ví Trả Sau
              </span>
            </div>
          </div>

          <p className="mb-1.5 text-[11px] font-medium text-slate-500">
            Đơn vị vận chuyển hỏa tốc:
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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 text-xs text-slate-500 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Chứng Nhận Bộ Công Thương</span>
            <span className="text-slate-300">•</span>
            <span>Mã số doanh nghiệp: 0109988234 do Sở KH&ĐT cấp</span>
          </div>
          <div className="text-xs text-slate-500">
            <span>
              © {year} NEXUS Ecommerce & 3D Auction Inc. Bản quyền được bảo lưu toàn diện.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
