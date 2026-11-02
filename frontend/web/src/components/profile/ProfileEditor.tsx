import { useRef, useState, type FormEvent } from 'react';
import { LockOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { Role } from '@nexus/types';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { updateMyProfile, type ProfileChanges } from '../../services/profile';
import type { UserProfile } from '../../types';
import AvatarPicker from './AvatarPicker';
import ChangePasswordModal from './ChangePasswordModal';
import { useToast } from '../ToastNotification';

const inputClass =
  'mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';

export default function ProfileEditor({ profile }: { profile: UserProfile }) {
  const { refreshProfile, setProfile } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const initial = (): ProfileChanges => ({
    fullName: profile.fullName,
    phoneNumber: profile.phoneNumber || '',
    avatarUrl: profile.avatarUrl || '',
  });
  const [form, setForm] = useState(initial);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const locked = useRef(false);
  const seller = profile.role === Role.SELLER;
  const canEdit = profile.role === Role.BUYER || seller;
  const onSellerArea = location.pathname.startsWith('/seller');
  const roleLabel = onSellerArea
    ? 'Người bán (Seller)'
    : profile.role === Role.ADMIN
      ? 'Quản trị viên (Admin)'
      : 'Khách hàng (Buyer)';

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canEdit || locked.current) return;
    const changes = {
      fullName: form.fullName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      avatarUrl: form.avatarUrl.trim(),
    };
    setError('');
    if (changes.fullName.length < 2 || changes.fullName.length > 100) {
      setError('Họ tên cần từ 2 đến 100 ký tự.');
      return;
    }
    if (changes.phoneNumber && !/^\+?[0-9]{9,15}$/.test(changes.phoneNumber)) {
      setError('Số điện thoại cần từ 9 đến 15 chữ số.');
      return;
    }
    locked.current = true;
    setPending(true);
    try {
      const saved = await updateMyProfile(changes, password, avatarFile);
      setForm(saved);
      setAvatarFile(null);
      setProfile((current) => (current?.id === profile.id ? { ...current, ...saved } : current));
      await refreshProfile();
      toast.success('Đã cập nhật hồ sơ cá nhân.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể cập nhật hồ sơ.';
      setError(message);
      toast.error(message);
    } finally {
      setPassword('');
      setPending(false);
      locked.current = false;
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-6 flex items-center gap-4 border-b border-slate-200 pb-5">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-blue-200 bg-blue-50 text-2xl text-blue-600 shrink-0">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Ảnh đại diện cá nhân"
              className="h-full w-full object-cover"
            />
          ) : (
            <UserOutlined />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 truncate">{profile.fullName}</h2>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-semibold text-blue-700">{roleLabel}</span> · {profile.email}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Ảnh đại diện cá nhân được dùng riêng cho tài khoản của bạn (tách biệt với logo gian
            hàng).
          </p>
        </div>
      </div>
      {!canEdit && (
        <p className="mb-5 rounded-md bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-800">
          Vai trò của bạn chỉ được xem thông tin cá nhân.
        </p>
      )}
      <form onSubmit={(event) => void save(event)} className="space-y-5">
        <fieldset disabled={pending || !canEdit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            Họ và tên
            <input
              required
              maxLength={100}
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              className={inputClass}
              autoComplete="name"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Số điện thoại
            <input
              type="tel"
              maxLength={16}
              value={form.phoneNumber}
              onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
              className={inputClass}
              autoComplete="tel"
            />
          </label>
          <AvatarPicker savedUrl={form.avatarUrl} file={avatarFile} onChange={setAvatarFile} />
        </fieldset>
        <label className="block text-xs font-semibold text-slate-700">
          Email đăng nhập
          <input
            value={profile.email}
            readOnly
            className={`${inputClass} bg-slate-50 text-slate-500`}
          />
          <span className="mt-1.5 block text-[11px] font-normal text-slate-500">
            Email đăng nhập được cố định để bảo mật tài khoản.
          </span>
        </label>
        {seller && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
            <p className="mb-2.5 text-xs font-semibold text-[#1c3973]">
              <LockOutlined className="mr-1.5" />
              Xác minh mật khẩu trước khi lưu thay đổi hồ sơ.
            </p>
            <label className="block text-xs font-semibold text-slate-700">
              Mật khẩu hiện tại
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={pending}
                className={inputClass}
              />
            </label>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {error}
          </p>
        )}
        {canEdit && (
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              <SaveOutlined className="mr-1.5" />
              {pending ? 'Đang xác minh và lưu…' : seller ? 'Xác minh và lưu' : 'Lưu thay đổi'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setForm(initial());
                setAvatarFile(null);
                setPassword('');
                setError('');
              }}
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy thay đổi
            </button>
          </div>
        )}
      </form>
      {canEdit && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Bảo mật tài khoản</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Đổi mật khẩu bằng mã xác minh OTP gửi qua email.
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowChangePassword(true)}
            className="rounded-md border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition cursor-pointer"
          >
            <LockOutlined className="mr-1.5" /> Đổi mật khẩu
          </button>
        </div>
      )}
      {canEdit && showChangePassword && (
        <ChangePasswordModal userId={profile.id} onClose={() => setShowChangePassword(false)} />
      )}
    </section>
  );
}
