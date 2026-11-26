import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, UserPlus, RefreshCw, Users, CheckCircle } from 'lucide-react';
import { listStaff, inviteStaff } from '@/features/admin/services/admin';
import type { StaffUser } from '../../types/admin.types';
import Popup from '../../components/Popup';
import { getIntlLocale } from '../../i18n/config';

interface StaffTeamManagementPanelProps {
  notify: (message: string) => void;
}

export default function StaffTeamManagementPanel({ notify }: StaffTeamManagementPanelProps) {
  const { t, i18n } = useTranslation('staff');
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffFullName, setStaffFullName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const staffRequestInFlight = useRef(false);
  const [staffPending, setStaffPending] = useState(false);
  const [staffFormError, setStaffFormError] = useState('');

  const fetchStaffList = async () => {
    setIsLoadingStaff(true);
    setStaffError('');
    try {
      const res = await listStaff({ limit: 50 });
      setStaffList(res.items || []);
    } catch (err: unknown) {
      setStaffError(err instanceof Error ? err.message : t('team.loadErr'));
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    void fetchStaffList();
  }, []);

  const handleCreateStaff = async (e: FormEvent) => {
    e.preventDefault();
    if (staffRequestInFlight.current) return;
    if (!staffEmail.trim() || !staffFullName.trim()) {
      setStaffFormError(t('team.missingFieldsErr'));
      return;
    }
    staffRequestInFlight.current = true;
    setStaffPending(true);
    setStaffFormError('');
    try {
      // Endpoint mời gửi email kích hoạt; không truyền password để tạo tài khoản trực tiếp.
      const res = await inviteStaff({
        email: staffEmail.trim(),
        fullName: staffFullName.trim(),
        phoneNumber: staffPhone.trim() || undefined,
      });
      notify(
        t('team.invitedToast', {
          message: res.message,
          email: res.assignedEmail,
        }),
      );
      setShowAddStaffModal(false);
      setStaffEmail('');
      setStaffFullName('');
      setStaffPhone('');
      // Danh sách hiện tại chỉ chứa tài khoản đã kích hoạt, chưa chứa lời mời đang chờ.
    } catch (err: unknown) {
      setStaffFormError(err instanceof Error ? err.message : t('team.inviteErr'));
    } finally {
      staffRequestInFlight.current = false;
      setStaffPending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BadgeCheck className="w-6 h-6 text-indigo-600" />
            {t('team.title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t('team.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddStaffModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            {t('team.addBtn')}
          </button>
          <button
            type="button"
            onClick={() => void fetchStaffList()}
            disabled={isLoadingStaff}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingStaff ? 'animate-spin' : ''}`} />
            {t('team.refresh')}
          </button>
        </div>
      </div>

      {staffError && (
        <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {staffError}
        </div>
      )}

      {isLoadingStaff ? (
        <div className="py-20 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 text-indigo-500 animate-spin" />
          {t('team.loading')}
        </div>
      ) : staffList.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          {t('team.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                <th className="py-3 px-4">{t('team.cols.fullName')}</th>
                <th className="py-3 px-4">{t('team.cols.email')}</th>
                <th className="py-3 px-4">{t('team.cols.phone')}</th>
                <th className="py-3 px-4">{t('team.cols.role')}</th>
                <th className="py-3 px-4">{t('team.cols.status')}</th>
                <th className="py-3 px-4">{t('team.cols.createdAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-semibold text-slate-800">{s.fullName}</td>
                  <td className="py-3 px-4 text-slate-600">{s.email}</td>
                  <td className="py-3 px-4 text-slate-600">{s.phoneNumber || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700">
                      SUPPORT_STAFF
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle className="w-3.5 h-3.5" /> {t('team.activeStatus')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    {new Date(s.createdAt).toLocaleDateString(getIntlLocale(i18n.language))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin mời nhân viên bằng email cá nhân; nhân viên tự đặt mật khẩu qua link kích hoạt. */}
      <Popup
        isOpen={showAddStaffModal}
        onClose={() => {
          if (!staffPending) setShowAddStaffModal(false);
        }}
        title={t('team.modalTitle')}
        size="md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-3.5">
          <p className="text-sm text-slate-600">{t('team.modalDesc')}</p>

          {staffFormError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {staffFormError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('team.emailLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder={t('team.emailPlaceholder')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              disabled={staffPending}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('team.fullNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t('team.fullNamePlaceholder')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={staffFullName}
              onChange={(e) => setStaffFullName(e.target.value)}
              disabled={staffPending}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('team.phoneLabel')}
            </label>
            <input
              type="tel"
              placeholder={t('team.phonePlaceholder')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={staffPhone}
              onChange={(e) => setStaffPhone(e.target.value)}
              disabled={staffPending}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              onClick={() => setShowAddStaffModal(false)}
              disabled={staffPending}
            >
              {t('team.cancel')}
            </button>
            <button
              type="submit"
              disabled={staffPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              {staffPending ? t('team.sendingInvite') : t('team.sendInvite')}
            </button>
          </div>
        </form>
      </Popup>
    </div>
  );
}
