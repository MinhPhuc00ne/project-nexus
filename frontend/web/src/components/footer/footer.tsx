import {
  Box,
  Globe2,
  Network,
  QrCode,
  Scan,
  Share2,
  ShieldCheck,
  ShieldHalf,
  Truck,
} from 'lucide-react';
import './footer.css';

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

const supportLinks = [
  { label: 'Trung tâm trợ giúp 24/7', href: '/help' },
  { label: 'Quy chuẩn đấu giá thực', href: '/auction-guidelines' },
  { label: 'Chính sách đồng kiểm & hoàn tiền', href: '/refund-policy' },
  { label: 'Biểu phí ký gửi giám định', href: '/consignment-fees' },
];

const platformLinks = [
  { label: 'Giới thiệu hệ điều hành 3D', href: '/about' },
  { label: 'Quy trình thẩm định hiện vật', href: '/verification' },
  { label: 'Hệ thống đối tác GHN / Stripe', href: '/partners' },
  { label: 'Điều khoản giao dịch', href: '/terms' },
  { label: 'Chính sách bảo mật dữ liệu', href: '/privacy' },
];

export interface FooterProps {
  className?: string;
  appUrl?: string;
  /** Only show a measured availability value when one is provided. */
  apiAvailability?: string;
  statusUrl?: string;
  year?: number;
}

export function Footer({
  className = '',
  appUrl = '/app',
  apiAvailability,
  statusUrl = '/status',
  year = new Date().getFullYear(),
}: FooterProps) {
  return (
    <footer className={`nexus-footer ${className}`}>
      <div className="nexus-footer__assurances">
        <div className="nexus-footer__container nexus-footer__assurance-grid">
          {commitments.map(({ icon: Icon, title, description }) => (
            <div className="nexus-footer__assurance" key={title}>
              <Icon className="nexus-footer__assurance-icon" aria-hidden="true" strokeWidth={2} />
              <div>
                <p className="nexus-footer__assurance-title">{title}</p>
                <p className="nexus-footer__assurance-description">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="nexus-footer__container nexus-footer__main">
        <div className="nexus-footer__brand-column">
          <img
            src="images/logo.png"
            alt="NEXUS"
            className="h-15 w-auto"
          />
          <p className="nexus-footer__description">
            Sàn giao dịch thương mại điện tử và đấu giá tương tác 3D thời gian thực tiên phong tại
            Đông Nam Á. Kết nối các nhà sưu tập tinh hoa với vật phẩm nghệ thuật và hàng xa xỉ bảo
            chứng.
          </p>
          <div className="nexus-footer__badges" aria-label="Chứng nhận">
            <span className="nexus-footer__badge nexus-footer__badge--blue">PCI-DSS COMPLIANT</span>
            <span className="nexus-footer__badge nexus-footer__badge--orange">MOIT CERTIFIED</span>
          </div>
        </div>

        <nav className="nexus-footer__links" aria-labelledby="nexus-footer-support">
          <h2 id="nexus-footer-support" className="nexus-footer__heading">
            Chăm Sóc Khách Hàng
          </h2>
          <ul>
            {supportLinks.map(({ label, href }) => (
              <li key={href}>
                <a href={href}>{label}</a>
              </li>
            ))}
            <li>
              <a href="tel:19008822">Hotline: 1900 8822</a>
            </li>
          </ul>
        </nav>

        <nav className="nexus-footer__links" aria-labelledby="nexus-footer-platform">
          <h2 id="nexus-footer-platform" className="nexus-footer__heading">
            Về NEXUS Platform
          </h2>
          <ul>
            {platformLinks.map(({ label, href }) => (
              <li key={href}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nexus-footer__connect">
          <h2 className="nexus-footer__heading">Ứng Dụng & Cổng Kết Nối</h2>
          <a className="nexus-footer__app" href={appUrl}>
            <span className="nexus-footer__qr">
              <QrCode size={24} aria-hidden="true" />
            </span>
            <span>
              <span className="nexus-footer__app-title">NEXUS 3D App</span>
              <span className="nexus-footer__app-description">
                Khám phá trải nghiệm AR và đấu giá trực tiếp
              </span>
            </span>
          </a>
          <nav className="nexus-footer__socials" aria-label="Cổng kết nối NEXUS">
            <a href="/community" aria-label="Cộng đồng NEXUS">
              <Network size={15} aria-hidden="true" />
            </a>
            <a href="/invite" aria-label="Mời bạn bè">
              <Share2 size={15} aria-hidden="true" />
            </a>
            <a href="/international" aria-label="NEXUS quốc tế">
              <Globe2 size={15} aria-hidden="true" />
            </a>
          </nav>
        </div>
      </div>

      <div className="nexus-footer__bottom">
        <div className="nexus-footer__container nexus-footer__bottom-content">
          <p>
            © {year} NEXUS E-Commerce & 3D Auction Inc. Toàn quyền bảo lưu mã nguồn và chứng chỉ số.
          </p>
          <div className="nexus-footer__utilities">
            <nav className="nexus-footer__languages" aria-label="Ngôn ngữ">
              <a href="/?lang=vi" lang="vi" hrefLang="vi">
                VIỆT NAM (VN)
              </a>
              <a href="/?lang=en" lang="en" hrefLang="en">
                ENGLISH (US)
              </a>
            </nav>
            <a className="nexus-footer__status" href={statusUrl}>
              API STATUS{apiAvailability ? `: ${apiAvailability}` : ''}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
