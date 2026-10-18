// Hai khối dùng ở Tổng quan và Người dùng: form thêm Staff và danh sách khóa/mở khóa tài khoản.

import { Mail, ShieldBan, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, EmptyState, Panel, SearchInput } from './AdminUI';
import type { AdminTabProps } from './adminTypes';

// Form thêm Staff được tái sử dụng trong Tổng quan và tab Người dùng.
// Form giữ giá trị đang nhập; danh sách tài khoản thực sự nằm trong data của AdminLayout.
export function StaffInvite({ data, actions }: AdminTabProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Thẩm định hoàn tiền');

  return (
    <Panel
      title="Cấp tài khoản Support Staff"
      subtitle="Nhân viên hỗ trợ được quản trị viên cấp quyền"
      icon={<UserPlus size={19} />}
    >
      <p className="mb-4 rounded-lg bg-blue-50 p-3 text-[11px] leading-relaxed text-slate-500">
        Bản demo thêm nhân viên vào danh sách tại giao diện. Email kích hoạt và xác thực hai bước sẽ
        được kết nối khi có API.
      </p>
      <form
        onSubmit={(event) => {
          // Chặn submit mặc định tải lại trang; trim bỏ khoảng trắng thừa ở đầu/cuối.
          // required/type="email" kiểm tra tại trình duyệt; action ở trang cha kiểm tra trùng email.
          event.preventDefault();
          actions.addStaff(name.trim(), email.trim(), department);
          // Hiện form xóa nội dung sau khi gọi action, kể cả khi action báo email trùng.
          setName('');
          setEmail('');
        }}
        className="space-y-3"
      >
        <label className="block text-[11px] font-medium">
          Email công việc
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nhanvien.support@nexus.vn"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-blue-400"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
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
          <label className="text-[11px] font-medium">
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
          </label>
        </div>
        <Button type="submit" className="w-full">
          <Mail size={16} />
          Thêm Staff vào bản demo
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-[10px]">
        <span className="text-slate-500">
          Hiện có:{' '}
          <b>{data.users.filter((user) => user.role === 'Staff').length} Staff trong bản demo</b>
        </span>
        <span className="text-primary">2FA bắt buộc</span>
      </div>
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
