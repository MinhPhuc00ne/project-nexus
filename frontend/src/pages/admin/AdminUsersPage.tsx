import { Users } from 'lucide-react';
import { StaffInvite, UserSecurity } from '../../components/adminDashboard/Users/UserManagement';
import { useAdminContext } from '../../components/adminDashboard/shared/useAdminContext';

// Ghép form thêm Staff và danh sách tài khoản; hai khối cũng được dùng ở Tổng quan.
export default function AdminUsersPage() {
  const { data, actions } = useAdminContext();

  return (
    <div className="space-y-5">
      {/* Giới thiệu chức năng quản lý tài khoản. */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Users size={18} />
        Quản lý thành viên, phân quyền và tài khoản hỗ trợ
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.5fr]">
        {/* Form gửi lời mời tạo tài khoản Staff qua API. */}
        <div className="min-w-0 xl:sticky xl:top-0">
          <StaffInvite data={data} actions={actions} />
        </div>
        {/* Danh sách người dùng: tìm kiếm, lọc vai trò và khóa/mở khóa tài khoản. */}
        <UserSecurity data={data} actions={actions} />
      </div>
    </div>
  );
}
