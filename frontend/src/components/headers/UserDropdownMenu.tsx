import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@nexus/types';
import { formatCurrency } from '../../i18n/formatters';
import {
  User,
  Wallet,
  Award,
  ShieldCheck,
  Store,
  Package,
  Gavel,
  Heart,
  LogOut,
  ArrowLeftRight,
} from 'lucide-react';
import type { UserProfile } from '../../types';
import { clearAuthSession } from '@/features/auth/services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ToastNotification';
import LogoutConfirmDialog from '../auth/LogoutConfirmDialog';

interface UserDropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  displayUserName: string;
  displayUserEmail?: string;
  displayUserAvatar?: string | null;
  onLogoutClick?: () => void;
}

export const UserDropdownMenu: React.FC<UserDropdownMenuProps> = ({
  isOpen,
  onClose,
  profile,
  displayUserName,
  displayUserEmail,
  displayUserAvatar,
  onLogoutClick,
}) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const toast = useToast();
  const { switchActiveMode } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!isOpen && !showLogoutConfirm) return null;

  const isSellerAccount = profile?.role === Role.SELLER;
  const isSellerModeActive =
    isSellerAccount && Boolean(profile?.isSellerActive) && profile?.currentMode === 'SELLER';

  const getRoleBadgeLabel = () => {
    if (profile?.role === Role.ADMIN) return t('header.roleBadges.admin');
    if (profile?.role === Role.SUPPORT_STAFF) return t('header.roleBadges.staff');
    if (isSellerModeActive) return t('header.roleBadges.seller');
    return t('header.roleBadges.buyer');
  };
  const roleBadgeLabel = getRoleBadgeLabel();

  const handleSwitchMode = async () => {
    onClose();
    if (isSellerModeActive) {
      await switchActiveMode('BUYER');
      navigate('/buyer');
    } else {
      await switchActiveMode('SELLER');
      navigate('/seller');
    }
  };

  return (
    <>
      {isOpen && !showLogoutConfirm && (
        <div className="animate-home-popover-enter motion-reduce:animate-none absolute right-0 top-[calc(100%+6px)] z-[1100] w-[256px] overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgb(20_34_62_/_14%)]">
          <div className="mb-1.5 flex items-center gap-3 rounded-md bg-blue-50/60 border border-blue-100 p-2.5">
            {displayUserAvatar ? (
              <img
                src={displayUserAvatar}
                alt={displayUserName}
                referrerPolicy="no-referrer"
                className="h-[38px] w-[38px] shrink-0 rounded-full object-cover border border-blue-200"
              />
            ) : (
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#1c3973] text-white">
                <User size={20} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-bold text-slate-900">{displayUserName}</p>
              {displayUserEmail && (
                <p className="m-0 truncate text-xs text-slate-500">{displayUserEmail}</p>
              )}
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-600 text-white">
                  {roleBadgeLabel}
                </span>
              </div>
            </div>
          </div>

          {profile && (
            <div className="mb-2 p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <Wallet size={12} className="text-blue-600" /> {t('header.walletBalance')}
                </span>
                <strong className="text-blue-700 font-bold">
                  {formatCurrency(Number(profile.wallet?.balance ?? 0))}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <Award size={12} className="text-blue-600" /> {t('header.reputationScore')}
                </span>
                <span className="font-semibold text-slate-800">
                  {profile.reputationScore} ({profile.trustLevel})
                </span>
              </div>
            </div>
          )}

          {isSellerAccount && (
            <button
              type="button"
              onClick={() => void handleSwitchMode()}
              className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-[12px] text-white bg-blue-600 font-semibold hover:bg-blue-700 transition mb-1.5 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Store size={14} />
                <span>
                  {isSellerModeActive
                    ? t('header.switchToBuyerShort')
                    : t('header.switchToSellerShort')}
                </span>
              </span>
              <ArrowLeftRight size={13} />
            </button>
          )}

          {profile?.role === Role.ADMIN && (
            <Link
              to="/admin"
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-blue-700 bg-blue-50 font-medium hover:bg-blue-100 mb-1"
              onClick={onClose}
            >
              <ShieldCheck size={15} />
              <span>{t('header.adminConsole')}</span>
            </Link>
          )}

          {(profile?.role === Role.ADMIN || profile?.role === Role.SUPPORT_STAFF) && (
            <Link
              to="/staff"
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-blue-700 bg-blue-50 font-medium hover:bg-blue-100 mb-1"
              onClick={onClose}
            >
              <Store size={15} />
              <span>{t('header.staffPortalLink')}</span>
            </Link>
          )}

          <div className="my-1.5 h-px bg-slate-200" />

          <Link
            to="/buyer/profile"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-800 transition-colors hover:bg-blue-50 hover:text-blue-700"
            onClick={onClose}
          >
            <User size={15} />
            <span>{t('nav.profile')}</span>
          </Link>

          <Link
            to="/buyer/orders"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-800 transition-colors hover:bg-blue-50 hover:text-blue-700"
            onClick={onClose}
          >
            <Package size={15} />
            <span>{t('header.myOrders')}</span>
          </Link>

          <Link
            to="/buyer/wallet"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-800 transition-colors hover:bg-blue-50 hover:text-blue-700"
            onClick={onClose}
          >
            <Wallet size={15} />
            <span>{t('footer.nexusPayWallet')}</span>
          </Link>

          <Link
            to="/buyer/bids"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-800 transition-colors hover:bg-blue-50 hover:text-blue-700"
            onClick={onClose}
          >
            <Gavel size={15} />
            <span>{t('header.myBids')}</span>
          </Link>

          <Link
            to="/buyer/profile?tab=auction-offers"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-800 transition-colors hover:bg-blue-50 hover:text-blue-700"
            onClick={onClose}
          >
            <ShieldCheck size={15} />
            <span>{t('header.confirmAuctionPurchase')}</span>
          </Link>

          <Link
            to="/buyer/wishlist"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-800 transition-colors hover:bg-blue-50 hover:text-blue-700"
            onClick={onClose}
          >
            <Heart size={15} />
            <span>{t('header.wishlist')}</span>
          </Link>

          <div className="my-1.5 h-px bg-slate-200" />

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
            onClick={() => {
              setShowLogoutConfirm(true);
              onClose();
            }}
          >
            <LogOut size={15} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      )}
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        accountName={displayUserName}
        onCancel={() => {
          setShowLogoutConfirm(false);
        }}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onClose();
          clearAuthSession();
          toast.success(t('logoutDialog.successToast'));
          if (onLogoutClick) {
            onLogoutClick();
          } else {
            navigate('/login', { replace: true });
          }
        }}
      />
    </>
  );
};

export default UserDropdownMenu;
