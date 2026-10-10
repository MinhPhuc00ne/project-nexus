import React from 'react';
import { ArrowLeft, Phone } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  backUrl?: string;
  backText?: string;
}

const Header: React.FC<HeaderProps> = ({
  backUrl = "#",
  backText = "Quay lại Trang Chủ"
}) => {
  return (
    <header className="auth-header">
      <div className="auth-header-left">
        <a href="/" className="auth-brand-logo">
          <img
            src= "/images/NEXUS.png"
            alt= "NEXUS"
            className= "auth-brand-image"
          />

          {/*<span className="auth-brand-name">NEXUS</span>*/}

        </a>
        <div className="auth-header-divider"></div>
        <p className="auth-brand-tagline">
          Sàn Thương Mại Điện Tử & Đấu Giá Trực Tuyến 3D
        </p>
      </div>

      <div className="auth-header-right">
        <a href={backUrl} className="auth-back-home-link">
          <ArrowLeft className="w-4 h-4" />
          {backText}
        </a>
        <div className="auth-hotline-group">
          <div className="auth-hotline-icon-box">
            <Phone className="auth-hotline-icon" />
          </div>
          <div className="auth-hotline-info">
            <span className="auth-hotline-label">Hotline 24/7</span>
            <span className="auth-hotline-number">1900 8822</span>
          </div>
        </div>
        <a href="#" className="auth-help-center-link">
          Trung tâm trợ giúp
        </a>
      </div>
    </header>
  );
};

export default Header;

