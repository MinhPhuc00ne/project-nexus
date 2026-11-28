import {
  Activity,
  Image,
  ChartNoAxesCombined,
  Gavel,
  Package,
  ShoppingBag,
  Flag,
  Layers,
  LayoutDashboard,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardChrome } from '../../dashboard/dashboardChrome';
import type { AdminTab } from '../shared/adminTypes';

const groupKeys: Record<string, 'operations' | 'members' | 'content' | 'financeTech'> = {
  'LIVE OPERATIONS': 'operations',
  'MEMBERS & APPROVALS': 'members',
  'CONTENT & DISPLAY': 'content',
  'FINANCE & TECH': 'financeTech',
};

// Menu config: id must match the child route in AppRouter and the AdminTab union.
// label is the English-US fallback label, icon is a lucide-react component.
// Edit this array to reorder or group sidebar items without touching JSX buttons.
export const adminNavigation: {
  label: string;
  items: { id: AdminTab; label: string; icon: typeof Gavel }[];
}[] = [
  {
    label: 'LIVE OPERATIONS',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'products', label: 'Products', icon: Package },
      { id: 'orders', label: 'Orders', icon: ShoppingBag },
      { id: 'auctions', label: 'Auctions', icon: Gavel },
      // Opens category management at /admin/categories.
      { id: 'categories', label: 'Categories', icon: Layers },
    ],
  },
  {
    label: 'MEMBERS & APPROVALS',
    items: [
      { id: 'users', label: 'Users', icon: Users },
      { id: 'sellers', label: 'Seller Approvals', icon: Store },
      { id: 'stores', label: 'Sellers & Stores', icon: Store },
      { id: 'reports', label: 'Disputes & Reports', icon: Flag },
      { id: 'refunds', label: 'Refund Approvals', icon: ShieldCheck },
    ],
  },
  {
    label: 'CONTENT & DISPLAY',
    items: [{ id: 'banners', label: 'Banners', icon: Image }],
  },
  {
    label: 'FINANCE & TECH',
    items: [
      { id: 'finance', label: 'Finance & Fees', icon: Wallet },
      { id: 'system', label: 'System & Logs', icon: Activity },
      { id: 'settings', label: 'Settings & Moderation', icon: Settings2 },
      { id: 'chat', label: 'Chat Moderation', icon: MessageCircle },
    ],
  },
];

// Sidebar receives pending counts from the parent page instead of keeping separate state.
export default function Sidebar({
  open,
  onClose,
  sellerCount,
  refundCount,
  productCount,
  reportCount,
}: {
  open: boolean;
  onClose: () => void;
  sellerCount: number;
  refundCount: number;
  productCount: number;
  reportCount: number;
}) {
  const { t } = useTranslation('admin');
  return (
    <>
      {/* Dark backdrop only shown when mobile menu is open; clicking it closes the menu. */}
      {open && (
        <button
          aria-label={t('sidebar.closeMenu')}
          onClick={onClose}
          className={dashboardChrome.sidebarBackdrop}
        />
      )}
      {/* lg:translate-x-0 always shows sidebar on desktop; mobile uses open to slide in/out. */}
      <aside
        className={`${dashboardChrome.sidebar} ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={dashboardChrome.sidebarBrand}>
          <NavLink
            to="/admin/overview"
            onClick={onClose}
            aria-label={t('sidebar.overviewAria')}
            className="flex flex-1 items-center"
          >
            {/* Vite serves public from the root URL, so paths omit /public. */}
            <img src="/images/logo.png" alt="NEXUS" className="h-16 w-44 object-contain" />
          </NavLink>
          <button
            aria-label={t('sidebar.closeMenu')}
            onClick={onClose}
            className="ml-auto p-1 text-slate-500 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <nav
          aria-label={t('sidebar.navAria')}
          className="flex-1 space-y-6 overflow-y-auto px-3 py-6"
        >
          {adminNavigation.map((group) => (
            <div key={group.label}>
              <p className={dashboardChrome.sidebarLabel}>
                {groupKeys[group.label] ? t(`groups.${groupKeys[group.label]}`) : group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(({ id, label, icon: Icon }) => {
                  function getPendingCount() {
                    if (id === 'sellers') {
                      return sellerCount;
                    }
                    if (id === 'refunds') {
                      return refundCount;
                    }
                    if (id === 'products') {
                      return productCount;
                    }
                    return reportCount;
                  }

                  return (
                    // NavLink sets isActive from the URL to highlight the active item.
                    // onClose closes the mobile menu after selection without controlling the URL.
                    <NavLink
                      key={id}
                      to={`/admin/${id}`}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `${dashboardChrome.navItem} ${isActive ? dashboardChrome.navActive : dashboardChrome.navIdle}`
                      }
                    >
                      <Icon size={17} />
                      <span className="flex-1">{t(`nav.${id}`, { defaultValue: label })}</span>
                      {['sellers', 'refunds', 'reports'].includes(id) && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {getPendingCount()}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-[10px] font-medium text-primary">
            <ChartNoAxesCombined size={15} />
            <span>{t('sidebar.engineLabel')}</span>
            <span className="ml-auto flex items-center gap-1 text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {t('sidebar.demoBadge')}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
