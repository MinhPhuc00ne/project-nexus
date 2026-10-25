import React from 'react';
import { ArrowLeft, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes/paths';

interface HeaderProps {
  backUrl?: string;
  backText?: string;
}

const Header: React.FC<HeaderProps> = ({
  backUrl = ROUTES.HOME,
  backText = 'Quay lại Trang Chủ',
}) => {
  const targetUrl = !backUrl || backUrl === '#' ? ROUTES.HOME : backUrl;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-8 md:py-4">
      <div className="flex items-center gap-4">
        <Link
          to={ROUTES.HOME}
          className="flex shrink-0 items-center justify-center leading-none no-underline"
        >
          <img
            src="/images/NEXUS.png"
            alt="NEXUS"
            className="block h-[42px] w-12 object-contain md:h-12 md:w-14"
          />

          {/*<span className="auth-brand-name">NEXUS</span>*/}
        </Link>
        <div className="hidden h-8 w-px bg-slate-200 md:block"></div>
        <p className="hidden text-sm font-medium text-slate-500 md:block">
          Sàn Thương Mại Điện Tử & Đấu Giá Trực Tuyến 3D
        </p>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <Link
          to={targetUrl}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" />
          {backText}
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center justify-center rounded-full bg-blue-50 p-1.5">
            <Phone className="size-4 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase leading-[1.2] text-slate-500">
              Hotline 24/7
            </span>
            <span className="text-sm font-bold leading-[1.2] text-slate-900">1900 8822</span>
          </div>
        </div>
        <a href="#" className="whitespace-nowrap text-sm font-medium text-blue-600 hover:underline">
          Trung tâm trợ giúp
        </a>
      </div>
    </header>
  );
};

export default Header;
