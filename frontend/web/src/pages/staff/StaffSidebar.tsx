import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { navigation, staffSectionPaths, type StaffSection } from './staffNavigationData';

interface StaffSidebarProps {
  activeNavigation: StaffSection;
  onSelectNavigation: (section: StaffSection) => void;
  managementAccess: 'loading' | 'allowed' | 'denied';
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export default function StaffSidebar({
  activeNavigation,
  onSelectNavigation,
  managementAccess,
  isSidebarOpen,
  onCloseSidebar,
}: StaffSidebarProps) {
  const navigate = useNavigate();

  return (
    <>
      <aside
        className={`[border-right:1px_solid_var(--staff-line)] max-[760px]:fixed max-[760px]:[inset:0_auto_0_0] max-[760px]:[width:min(290px,_84vw)] max-[760px]:h-dvh max-[760px]:[transform:translateX(-105%)] max-[760px]:[transition:transform_0.2s_ease] max-[760px]:[box-shadow:14px_0_40px_rgb(25_35_55_/_12%)] max-[760px]:[&.staff-sidebar--open]:[transform:translateX(0)] sticky top-0 z-30 flex h-screen min-h-[650px] flex-col border-r border-slate-200 bg-white ${isSidebarOpen ? 'staff-sidebar--open' : ''}`}
      >
        <div className="flex items-center gap-2.5 [min-height:70px] [padding:12px_18px] [border-bottom:1px_solid_#f0f1f6]">
          <img
            src="/images/logo.png"
            alt="NEXUS"
            className="[width:148px] max-w-full [height:auto] object-contain [filter:drop-shadow(0_6px_10px_rgb(31_95_227_/_10%))]"
          />
          <div className="min-w-0">
            <div className="flex items-center whitespace-nowrap">
              <span className="inline-flex items-center [padding:3px_7px] [border-radius:999px] [color:var(--staff-primary)] [background:var(--staff-primary-soft)] [font-size:9px] font-extrabold [letter-spacing:0.08em]">
                STAFF
              </span>
            </div>
            <div className="mt-[2px] [color:#818ba0] text-[10px]">Trung tâm hỗ trợ</div>
          </div>
          <button
            className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff] hidden [margin-left:auto] max-[760px]:[display:inline-grid]"
            aria-label="Đóng menu"
            onClick={onCloseSidebar}
          >
            <X size={18} />
          </button>
        </div>
        <div className="[padding:22px_18px_10px] [color:#9aa2b4] text-[10px] font-extrabold [letter-spacing:0.11em]">
          NGHIỆP VỤ HỖ TRỢ
        </div>
        <nav className="grid [gap:5px] [padding:0_10px]" aria-label="Điều hướng nhân viên">
          {navigation
            .filter(({ label }) => label !== 'Quản Lý Nhân Viên' || managementAccess === 'allowed')
            .map(({ label, icon: Icon }) => (
              <button
                className={`flex [min-height:42px] items-center gap-2.5 [padding:0_11px] [border:0] [border-radius:8px] [color:#665f68] [background:transparent] cursor-pointer text-left [transition:0.15s_ease] [&_>_span:nth-child(2)]:[flex:1] [&_>_span:nth-child(2)]:text-xs [&_>_span:nth-child(2)]:[font-weight:650] [&_>_span:nth-child(2)]:whitespace-nowrap hover:[background:#fff2ef] hover:[color:var(--staff-accent)] [&.is-active]:[color:white] [&.is-active]:[background:var(--staff-accent)] [&.is-active]:[box-shadow:0_7px_16px_rgb(217_52_27_/_18%)] ${activeNavigation === label ? 'is-active' : ''}`}
                key={label}
                aria-current={activeNavigation === label ? 'page' : undefined}
                onClick={() => {
                  onSelectNavigation(label);
                  navigate(staffSectionPaths[label]);
                  onCloseSidebar();
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
        </nav>
        <div className="[margin-top:auto] [padding:12px_10px_14px] [border-top:1px_solid_#f0f1f6]">
          <div className="flex justify-between [padding:12px_5px_0] [color:#9a8f8d] [font-size:9px] [&_strong]:[color:#c94c35]">
            <span>NEXUS Staff Gateway</span>
          </div>
        </div>
      </aside>
      {isSidebarOpen && (
        <button
          className="hidden max-[760px]:fixed max-[760px]:[inset:0] max-[760px]:[z-index:25] max-[760px]:block max-[760px]:[border:0] max-[760px]:[background:rgb(19_27_43_/_35%)]"
          aria-label="Đóng menu"
          onClick={onCloseSidebar}
        />
      )}
    </>
  );
}
