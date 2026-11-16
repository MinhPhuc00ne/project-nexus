import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Headphones, Inbox, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { sectionContent, type StaffSection } from './staffNavigationData';
import StaffSidebar from './StaffSidebar';
import StaffHeader from './StaffHeader';
import StaffTeamManagementPanel from './StaffTeamManagementPanel';
import StaffTicketChatPanel from './StaffTicketChatPanel';
import StaffDisputesPanel from './StaffDisputesPanel';
import StaffBannersPanel from './StaffBannersPanel';
import StaffAuctionSupportPanel from './StaffAuctionSupportPanel';

export type { StaffSection };

export default function StaffDashboard({
  initialSection = 'Hộp Thư Trực Tuyến',
}: {
  initialSection?: StaffSection;
}) {
  const navigate = useNavigate();
  const { user, storedUser, isAdmin, isLoading } = useAuth();
  const account = user || storedUser;
  const managementAccess = isLoading ? 'loading' : isAdmin ? 'allowed' : 'denied';

  const [activeNavigation, setActiveNavigation] = useState<StaffSection>(initialSection);
  const [searchText, setSearchText] = useState('');
  const [toast, setToast] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setActiveNavigation(initialSection);
  }, [initialSection]);

  const notify = (message: string): void => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const content = sectionContent[activeNavigation];
  const unavailableApiMessage: Partial<Record<StaffSection, string>> = {
    'Lịch Sử & CSAT': 'Backend hiện chưa có API lịch sử xử lý và đánh giá CSAT của Staff.',
    'Hiệu Suất Cá Nhân': 'Backend hiện chưa có API thống kê hiệu suất theo nhân viên.',
  };

  if (activeNavigation === 'Quản Lý Nhân Viên' && managementAccess !== 'allowed') {
    return (
      <main className="p-8">
        <p role="status">
          {managementAccess === 'loading'
            ? 'Đang kiểm tra quyền…'
            : 'Chỉ Admin có quyền quản lý và cấp tài khoản Staff.'}
        </p>
        {managementAccess === 'denied' && (
          <button
            onClick={() => navigate('/staff/inbox')}
            className="mt-4 text-primary cursor-pointer"
          >
            Về hộp thư hỗ trợ
          </button>
        )}
      </main>
    );
  }

  return (
    <div className="[--staff-ink:#17233d] [--staff-line:#e7eaf3] [--staff-primary:#1f5fe3] [--staff-primary-soft:#eaf1ff] [--staff-primary-strong:#1849b7] [--staff-accent:#1f5fe3] [--staff-accent-strong:#1849b7] grid [grid-template-columns:250px_minmax(0,_1fr)] max-[1200px]:[grid-template-columns:220px_minmax(0,_1fr)] max-[768px]:block h-screen overflow-hidden bg-[#f8f7fc] [color:var(--staff-ink)] [font-family:Inter,_ui-sans-serif,_system-ui,_-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_sans-serif] text-[13px] text-slate-800">
      <StaffSidebar
        activeNavigation={activeNavigation}
        onSelectNavigation={setActiveNavigation}
        managementAccess={managementAccess}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
      />

      <div className="[grid-column:2] min-w-0 flex flex-col h-screen overflow-hidden max-[768px]:[grid-column:auto] max-[768px]:h-auto max-[768px]:overflow-visible">
        <StaffHeader
          account={account}
          searchText={searchText}
          onSearchChange={setSearchText}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        <main
          className={`w-full min-w-0 flex-1 min-h-0 flex flex-col ${
            activeNavigation === 'Hộp Thư Trực Tuyến'
              ? 'overflow-hidden max-[768px]:overflow-visible px-3 pt-2 pb-3 lg:px-4 lg:pt-2.5 lg:pb-3.5 max-w-full'
              : 'overflow-y-auto px-5 pb-6 pt-4 max-w-[1800px] mx-auto custom-scrollbar'
          }`}
        >
          {activeNavigation === 'Hộp Thư Trực Tuyến' ? (
            <div className="flex items-center justify-between pb-2 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>Kênh Nhân Viên</span>
                <ChevronRight size={12} />
                <b className="font-semibold text-slate-700">{content.title}</b>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-xs">
                  <Headphones size={13} className="text-blue-600" />
                  <span>Phiên làm việc Staff</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="staff-breadcrumb flex items-center gap-1.5 text-[10px] text-slate-400">
                <span>Kênh Nhân Viên</span>
                <ChevronRight size={13} />
                <b className="font-semibold text-slate-600">{content.title}</b>
              </div>
              <div className="[&_h1]:[max-width:500px] [&_h1]:[line-height:1.16] [&_p]:mb-0 max-[760px]:flex-col mt-2.5 flex items-start justify-between gap-4">
                <div>
                  <h1 className="m-0 text-[clamp(20px,2vw,27px)] font-black tracking-[-0.035em] text-slate-900">
                    {content.title}
                  </h1>
                  <p className="mt-1.5 text-[11px] text-slate-500">{content.description}</p>
                </div>
                <div className="max-[760px]:w-full max-[760px]:flex-wrap max-[420px]:[&_>_*]:[flex:1_1_auto] flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 [padding:7px_9px] [border:1px_solid_#e8eaf3] [border-radius:8px] [color:#33405a] [background:white] [font-size:9px] leading-tight text-left cursor-pointer [&_>_svg]:[color:var(--staff-primary)] [&_b]:[color:var(--staff-primary)]">
                    <Headphones size={16} />
                    <span>Phiên làm việc</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeNavigation === 'Quản Lý Nhân Viên' ? (
            <StaffTeamManagementPanel notify={notify} />
          ) : activeNavigation === 'Khiếu Nại & Tranh Chấp' ? (
            <StaffDisputesPanel />
          ) : activeNavigation === 'Quản Lý Banner' ? (
            <StaffBannersPanel />
          ) : activeNavigation === 'Hỗ Trợ Đấu Giá 3D' ? (
            <StaffAuctionSupportPanel />
          ) : activeNavigation !== 'Hộp Thư Trực Tuyến' ? (
            <section
              className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              aria-label={content.title}
            >
              <h2 className="text-base font-bold text-slate-800">
                {activeNavigation === 'Hướng Dẫn & FAQ Sàn'
                  ? 'Quy trình hỗ trợ'
                  : 'Phạm vi theo dõi'}
              </h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-3">
                {content.topics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
              {activeNavigation !== 'Hướng Dẫn & FAQ Sàn' && (
                <div
                  role="status"
                  className="mt-6 rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center"
                >
                  <Inbox className="mx-auto mb-3 text-slate-400" size={28} />
                  <h3 className="font-semibold text-slate-700">Chưa có dữ liệu để hiển thị</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {unavailableApiMessage[activeNavigation] ||
                      `Dữ liệu ${content.title.toLowerCase()} sẽ hiển thị khi được hệ thống cung cấp.`}
                  </p>
                </div>
              )}
            </section>
          ) : (
            <StaffTicketChatPanel searchText={searchText} notify={notify} />
          )}
        </main>
      </div>

      {toast && (
        <div className="fixed [right:22px] [bottom:22px] [z-index:80] flex [max-width:min(420px,_calc(100vw_-_32px))] items-center [gap:9px] [padding:12px_16px] [border:1px_solid_#d8e8df] [border-radius:9px] [color:#256447] [background:white] [box-shadow:0_12px_35px_rgb(27_42_67_/_16%)] text-xs font-bold [&_svg]:[flex:0_0_auto]">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
