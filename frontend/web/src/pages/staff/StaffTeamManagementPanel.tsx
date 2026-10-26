import { useState, useEffect, useRef, type FormEvent } from 'react';
import { BadgeCheck, UserPlus, RefreshCw, Users, CheckCircle } from 'lucide-react';
import { listStaff, inviteStaff } from '../../services/admin';
import type { StaffUser } from '../../types/admin.types';
import Popup from '../../components/Popup';

interface StaffTeamManagementPanelProps {
  notify: (message: string) => void;
}

export default function StaffTeamManagementPanel({ notify }: StaffTeamManagementPanelProps) {
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
      setStaffError(err instanceof Error ? err.message : 'Không thể tải danh sách nhân viên.');
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
      setStaffFormError('Vui lòng điền đầy đủ email cá nhân và họ tên.');
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
      notify(`${res.message} Tài khoản được cấp: ${res.assignedEmail}. Chờ nhân viên kích hoạt.`);
      setShowAddStaffModal(false);
      setStaffEmail('');
      setStaffFullName('');
      setStaffPhone('');
      // Danh sách hiện tại chỉ chứa tài khoản đã kích hoạt, chưa chứa lời mời đang chờ.
    } catch (err: unknown) {
      setStaffFormError(err instanceof Error ? err.message : 'Không thể gửi lời mời nhân viên.');
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
            Quản Lý Nhân Viên Hỗ Trợ (Support Staff)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Danh sách nhân sự CSKH trực bàn hỗ trợ khách hàng và điều phối khiếu nại.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddStaffModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Thêm Nhân Viên Mới
          </button>
          <button
            type="button"
            onClick={() => void fetchStaffList()}
            disabled={isLoadingStaff}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingStaff ? 'animate-spin' : ''}`} />
            Làm mới
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
          Đang tải danh sách nhân viên từ máy chủ...
        </div>
      ) : staffList.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          Chưa có nhân viên hỗ trợ nào trong hệ thống.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Ngày tạo</th>
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
                      <CheckCircle className="w-3.5 h-3.5" /> Hoạt động
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    {new Date(s.createdAt).toLocaleDateString('vi-VN')}
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
        title="Mời Nhân Viên Hỗ Trợ (Support Staff)"
        size="md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-3.5">
          <p className="text-sm text-slate-600">
            Lời mời được gửi tới email cá nhân. Nhân viên mở link để xác nhận thông tin và tự đặt
            mật khẩu; sau khi kích hoạt mới đăng nhập bằng tài khoản @staff.com được cấp.
          </p>

          {staffFormError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {staffFormError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email cá nhân nhận lời mời <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="nhanvien@gmail.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              disabled={staffPending}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên nhân viên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Nguyễn Văn A"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={staffFullName}
              onChange={(e) => setStaffFullName(e.target.value)}
              disabled={staffPending}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
            <input
              type="tel"
              placeholder="VD: 0987654321"
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
              Hủy
            </button>
            <button
              type="submit"
              disabled={staffPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              {staffPending ? 'Đang gửi lời mời...' : 'Gửi lời mời'}
            </button>
          </div>
        </form>
      </Popup>
    </div>
  );
}
