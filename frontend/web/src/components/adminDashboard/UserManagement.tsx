import { ChevronLeft, ChevronRight, Mail, ShieldBan, UserPlus } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { inviteStaff, lockUser, unlockUser } from '../../services/admin';
import type { AdminUser, AdminUserRole, AdminUserStatus } from '../../types/user.types';
import { Badge, Button, EmptyState, Panel, SearchInput } from './AdminUI';
import type { AdminTabProps } from './adminTypes';
import { useAdminUsers } from './useAdminUsers';
import UserAccountDetail from './UserAccountDetail';

export function StaffInvite({ actions }: AdminTabProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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

const roleLabels: Record<AdminUserRole, string> = {
  BUYER: 'Buyer',
  SELLER: 'Seller',
  SUPPORT_STAFF: 'Staff',
  ADMIN: 'Admin',
};

// Cả trang người dùng và preview tổng quan đều lấy dữ liệu thật từ backend.
export function UserSecurity({ actions, preview = false }: AdminTabProps & { preview?: boolean }) {
  const { search, setSearch, query, setQuery, result, loading, error, refresh } =
    useAdminUsers(preview);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  return (
    <Panel
      title="Quản lí tài khoản"
      subtitle="Quản lý tài khoản Buyer / Seller / Staff / Admin trong hệ thống"
      icon={<ShieldBan size={19} />}
      className={
        preview
          ? ''
          : 'flex h-[clamp(24rem,calc(100dvh-17rem),42rem)] flex-col [&>div:first-child]:shrink-0'
      }
    >
      <div className="mb-4 flex shrink-0 flex-wrap gap-2">
        <div className="min-w-48 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên, email hoặc số điện thoại..."
          />
        </div>
        {!preview && (
          <>
            <select
              aria-label="Lọc vai trò"
              value={query.role ?? ''}
              onChange={(event) =>
                setQuery((current) => ({
                  ...current,
                  role: (event.target.value || undefined) as AdminUserRole | undefined,
                  page: 1,
                }))
              }
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs"
            >
              <option value="">Tất cả vai trò</option>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Lọc trạng thái tài khoản"
              value={query.status ?? 'ALL'}
              onChange={(event) =>
                setQuery((current) => ({
                  ...current,
                  status: event.target.value as AdminUserStatus,
                  page: 1,
                }))
              }
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
            </select>
          </>
        )}
      </div>
      {loading && (
        <p role="status" className="py-8 text-center text-xs text-slate-500">
          Đang tải người dùng…
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-3 py-4 text-xs text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={refresh}>
            Thử lại
          </Button>
        </div>
      )}
      {!loading && !error && (
        <div
          role="region"
          aria-label="Danh sách tài khoản"
          tabIndex={preview ? undefined : 0}
          className={
            preview
              ? 'space-y-2'
              : 'min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]'
          }
        >
          {result?.items.map((user) => (
            <article
              key={user.id}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-primary">
                {(user.fullName || user.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-xs font-semibold">{user.fullName || user.email}</p>
                  <Badge>{roleLabels[user.role]}</Badge>
                  <Badge tone={user.isLocked ? 'red' : 'green'}>
                    {user.isLocked ? 'Đã khóa' : 'Hoạt động'}
                  </Badge>
                </div>
                <p className="mt-1 break-all text-xs text-slate-600">{user.email}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  {user.phoneNumber || 'Chưa có số điện thoại'} •{' '}
                  {user.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setDetailUserId(user.id)}>
                Xem chi tiết
              </Button>
              {user.role !== 'ADMIN' && (
                <Button
                  variant={user.isLocked ? 'secondary' : 'danger'}
                  onClick={() => setTarget(user)}
                >
                  {user.isLocked ? 'Mở khóa' : 'Khóa tài khoản'}
                </Button>
              )}
            </article>
          ))}
          {result?.items.length === 0 && <EmptyState text="Không tìm thấy tài khoản phù hợp." />}
        </div>
      )}
      {!loading && !error && result && !preview && (
        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {result.total} người dùng • Trang {result.page}/{Math.max(1, result.totalPages)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={result.page <= 1}
              aria-label="Trang trước"
              onClick={() => setQuery((current) => ({ ...current, page: result.page - 1 }))}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="secondary"
              disabled={result.page >= result.totalPages}
              aria-label="Trang sau"
              onClick={() => setQuery((current) => ({ ...current, page: result.page + 1 }))}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
      {detailUserId && (
        <UserAccountDetail
          key={detailUserId}
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
        />
      )}
      {target && (
        <UserStatusDialog
          key={target.id}
          user={target}
          onClose={() => setTarget(null)}
          onSuccess={(message) => {
            setTarget(null);
            actions.notify(message);
            refresh();
          }}
        />
      )}
    </Panel>
  );
}

function UserStatusDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUser;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const title = user.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const result = await (user.isLocked ? unlockUser : lockUser)(
        user.id,
        reason.trim() || undefined,
      );
      onSuccess(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể cập nhật trạng thái tài khoản.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !inFlight.current) onClose();
        }}
      >
        <h2 className="text-lg font-bold text-primary">{title}?</h2>
        <p className="my-4 break-all text-sm text-slate-600">
          {user.fullName} • {user.email}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-medium">
            Lý do (không bắt buộc)
            <textarea
              autoFocus
              maxLength={500}
              disabled={pending}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" variant={user.isLocked ? 'primary' : 'danger'} disabled={pending}>
              {pending ? 'Đang xử lý…' : title}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
