// Hai khối dùng ở Tổng quan và Người dùng: form thêm Staff và danh sách khóa/mở khóa tài khoản.

import { Mail, ShieldBan, UserPlus } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { inviteStaff } from '../../services/admin';
import { Badge, Button, EmptyState, Panel, SearchInput } from './AdminUI';
import type { AdminTabProps } from './adminTypes';

// Form thêm Staff được tái sử dụng trong Tổng quan và tab Người dùng.
// Chỉ tạo lời mời; tài khoản SUPPORT_STAFF được tạo khi nhân viên kích hoạt thành công.
export function StaffInvite({ actions }: AdminTabProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Thẩm định hoàn tiền');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [assignedEmail, setAssignedEmail] = useState('');
  const inFlight = useRef(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên.');
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    setAssignedEmail('');
    try {
      const result = await inviteStaff({
        fullName: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        department,
      });
      setAssignedEmail(result.assignedEmail);
      actions.notify(result.message);
      setName('');
      setEmail('');
      setPhoneNumber('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gửi lời mời Staff.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <Panel
      title="Cấp tài khoản Support Staff"
      subtitle="Nhân viên hỗ trợ được quản trị viên cấp quyền"
      icon={<UserPlus size={19} />}
    >
      <p className="mb-4 rounded-lg bg-blue-50 p-3 text-[11px] leading-relaxed text-slate-500">
        Nhập email cá nhân để nhận lời mời. Hệ thống cấp email @staff.com; nhân viên mở link trong
        email để xác nhận thông tin và tự đặt mật khẩu trước khi đăng nhập.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-[11px] font-medium">
          Email cá nhân nhận lời mời
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nhanvien@gmail.com"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-blue-400"
          />
        </label>
        <div className="grid gap-3">
          <label className="text-[11px] font-medium">
            Họ và tên Staff
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nguyễn Văn A"
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-blue-400"
            />
          </label>
          {/* <label className="text-[11px] font-medium">
            Bộ phận phụ trách
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-blue-400"
            >
              <option>Thẩm định hoàn tiền</option>
              <option>Hỗ trợ đấu giá</option>
              <option>Chăm sóc khách hàng</option>
            </select>
          </label> */}
        </div>
        <label className="block text-[11px] font-medium">
          Số điện thoại
          <input
            type="tel"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-blue-400"
          />
        </label>
        {error && (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          <Mail size={16} />
          {pending ? 'Đang gửi lời mời…' : 'Gửi lời mời Staff'}
        </Button>
      </form>
      {assignedEmail && (
        <p role="status" className="mt-4 break-all text-xs text-primary">
          Tài khoản được cấp: <b>{assignedEmail}</b>. Đang chờ nhân viên kích hoạt.
        </p>
      )}
    </Panel>
  );
}

// Khối quản lý khóa/mở khóa: preview giới hạn 3 tài khoản và ẩn bộ lọc vai trò.
export function UserSecurity({
  data,
  actions,
  preview = false,
}: AdminTabProps & { preview?: boolean }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  // Kết hợp tìm tên/email với lọc vai trò; data.users vẫn giữ toàn bộ tài khoản.
  const visible = data.users.filter(
    (user) =>
      `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()) &&
      (role === 'all' || user.role === role),
  );

  return (
    <Panel
      title="Quản trị an ninh & khóa tài khoản"
      subtitle="Quản lý tài khoản Buyer / Seller / Staff và lịch sử vi phạm"
      icon={<ShieldBan size={19} />}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="min-w-48 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên hoặc email..."
          />
        </div>
        {!preview && (
          <select
            aria-label="Lọc vai trò"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs"
          >
            <option value="all">Tất cả vai trò</option>
            <option>Buyer</option>
            <option>Seller</option>
            <option>Staff</option>
          </select>
        )}
      </div>
      <div className="space-y-2">
        {(preview ? visible.slice(0, 3) : visible).map((user) => (
          <article
            key={user.id}
            className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-primary">
              {user.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="break-all text-xs font-semibold">{user.email}</p>
                <Badge tone={user.banned ? 'red' : 'blue'}>
                  {user.banned ? 'BANNED' : user.role.toUpperCase()}
                </Badge>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                {user.role} • {user.note}
              </p>
            </div>
            <Button
              variant={user.banned ? 'secondary' : 'danger'}
              onClick={() => actions.toggleBan(user.id)}
            >
              {user.banned ? 'Mở khóa' : 'Khóa tài khoản'}
            </Button>
          </article>
        ))}
      </div>
      {visible.length === 0 && <EmptyState text="Không tìm thấy tài khoản phù hợp." />}
    </Panel>
  );
}
