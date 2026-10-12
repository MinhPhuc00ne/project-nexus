import {
  Box,
  CheckCircle2,
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

export function Footer({
  className = '',
  showAssurances = true,
  year = 2025,
}: FooterProps) {
  return (
    <footer className={`nexus-footer ${className}`}>
      {showAssurances && (
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
      )}

      <div className="nexus-footer__container nexus-footer__main">
        {/* Brand column */}
        <div className="nexus-footer__brand-column">
          <div className="nexus-footer__brand-row">
            <a href="/" className="nexus-footer__logo-wrap">
              <img
                src="/images/logo.png"
                alt="NEXUS"
                className="nexus-footer__logo-img"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = '/images/NEXUS.png';
                }}
              />
            </a>
            <div className="nexus-footer__brand-tags">
              <span className="nexus-footer__tag-mall">MALL</span>
              <span className="nexus-footer__tag-3d">3D BID</span>
            </div>
          </div>

          <p className="nexus-footer__description">
            Hệ sinh thái sàn giao dịch thương mại điện tử kết hợp công nghệ đấu giá thực tế ảo 3D thời gian thực. Đảm bảo bảo chứng ký gửi, minh bạch kiểm định và giao nhận an toàn toàn quốc.
          </p>

          <div className="nexus-footer__cert-line">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Bảo chứng bởi Hiệp Hội Thương Mại Điện Tử & Đấu Giá Trực Tuyến</span>
          </div>
        </div>

        {/* Customer Care column */}
        <nav className="nexus-footer__links" aria-label="Chăm Sóc Khách Hàng">
          <h4 className="nexus-footer__heading">CHĂM SÓC KHÁCH HÀNG</h4>
          <ul>
            {customerCareLinks.map(({ label, href }) => (
              <li key={label}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Legal & About column */}
        <nav className="nexus-footer__links" aria-label="Về NEXUS & Pháp Lý">
          <h4 className="nexus-footer__heading">VỀ NEXUS & PHÁP LÝ</h4>
          <ul>
            {platformLegalLinks.map(({ label, href }) => (
              <li key={label}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Partners & Payment column */}
        <div className="nexus-footer__partners-column">
          <h4 className="nexus-footer__heading">ĐỐI TÁC THANH TOÁN & VẬN CHUYỂN</h4>
          <div className="nexus-footer__partner-pills">
            <div className="nexus-footer__pill-row">
              <span className="nexus-footer__pill">PayOS</span>
              <span className="nexus-footer__pill">Stripe</span>
            </div>
            <div className="nexus-footer__pill-row">
              <span className="nexus-footer__pill">Visa / Mastercard</span>
              <span className="nexus-footer__pill">Ví Trả Sau</span>
            </div>
          </div>

          <p className="nexus-footer__shipping-label">Đơn vị vận chuyển hỏa tốc:</p>
          <div className="nexus-footer__shipping-cards">
            <div className="nexus-footer__shipping-box">
              <Truck className="w-4 h-4 text-orange-600 shrink-0" />
              <span>GHN Express</span>
            </div>
            <div className="nexus-footer__shipping-box">
              <span>NEXUS Secure Cargo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="nexus-footer__bottom">
        <div className="nexus-footer__container nexus-footer__bottom-content">
          <div className="nexus-footer__bottom-left">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Chứng Nhận Bộ Công Thương</span>
            <span className="text-slate-300">•</span>
            <span>Mã số doanh nghiệp: 0109988234 do Sở KH&ĐT cấp</span>
          </div>
          <div className="nexus-footer__bottom-right">
            <span>© {year} NEXUS Ecommerce & 3D Auction Inc. Bản quyền được bảo lưu toàn diện.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
