import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { dashboardChrome } from '../../components/dashboard/dashboardChrome';
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
  const { t } = useTranslation('staff');
  const navigate = useNavigate();

  return (
    <>
      <aside
        className={`${dashboardChrome.sidebar} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={dashboardChrome.sidebarBrand}>
          <img src="/images/logo.png" alt="NEXUS" className="h-16 w-44 max-w-full object-contain" />
          <button
            className="ml-auto p-1 text-slate-500 lg:hidden"
            aria-label={t('sidebar.closeMenu')}
            onClick={onCloseSidebar}
          >
            <X size={18} />
          </button>
        </div>
        <div className={`${dashboardChrome.sidebarLabel} mt-6 px-6`}>
          {t('sidebar.sectionTitle')}
        </div>
        <nav
          className="flex-1 space-y-1 overflow-y-auto px-3 pb-6"
          aria-label={t('sidebarNavAria')}
        >
          {navigation
            .filter(({ key }) => key !== 'team' || managementAccess === 'allowed')
            .map(({ key, i18nKey, icon: Icon }) => (
              <button
                className={`${dashboardChrome.navItem} w-full text-left ${activeNavigation === key ? dashboardChrome.navActive + ' is-active' : dashboardChrome.navIdle}`}
                key={key}
                aria-current={activeNavigation === key ? 'page' : undefined}
                onClick={() => {
                  onSelectNavigation(key);
                  navigate(staffSectionPaths[key]);
                  onCloseSidebar();
                }}
              >
                <Icon size={17} />
                <span>{t(i18nKey)}</span>
              </button>
            ))}
        </nav>
        <div className="mt-auto border-t border-slate-100 p-4">
          <div className="rounded-lg bg-blue-50 px-3 py-2.5 text-[10px] font-medium text-primary">
            <span>NEXUS Staff Gateway</span>
          </div>
        </div>
      </aside>
      {isSidebarOpen && (
        <button
          className={dashboardChrome.sidebarBackdrop}
          aria-label={t('sidebar.closeMenu')}
          onClick={onCloseSidebar}
        />
      )}
    </>
  );
}
