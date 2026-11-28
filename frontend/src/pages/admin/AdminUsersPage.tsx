import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StaffInvite, UserSecurity } from '../../components/adminDashboard/Users/UserManagement';
import { useAdminContext } from '../../components/adminDashboard/shared/useAdminContext';

// Combines the Staff invite form and users table; both blocks are also reused on Overview.
export default function AdminUsersPage() {
  const { t } = useTranslation('admin');
  const { data, actions } = useAdminContext();

  return (
    <div className="space-y-5">
      {/* Account management overview banner. */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Users size={18} />
        {t('users.pageSubtitle')}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.5fr]">
        {/* Form to invite and create Support Staff accounts via API. */}
        <div className="min-w-0 xl:sticky xl:top-0">
          <StaffInvite data={data} actions={actions} />
        </div>
        {/* User directory: search, role filter, and lock/unlock accounts. */}
        <UserSecurity data={data} actions={actions} />
      </div>
    </div>
  );
}
