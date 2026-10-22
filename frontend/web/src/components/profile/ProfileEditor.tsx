import { useRef, useState, type FormEvent } from 'react';
import { LockOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { Role } from '@nexus/types';
import { useAuth } from '../../contexts/AuthContext';
import { updateMyProfile, type ProfileChanges } from '../../services/profile';
import type { UserProfile } from '../../types';
import AvatarPicker from './AvatarPicker';
import ChangePasswordModal from './ChangePasswordModal';

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50';

export default function ProfileEditor({ profile }: { profile: UserProfile }) {
  const { refreshProfile, setProfile } = useAuth();
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
  const [success, setSuccess] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const locked = useRef(false);
  const seller = profile.role === Role.SELLER;
  const canEdit = profile.role === Role.BUYER || seller;

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canEdit || locked.current) return;
    const changes = {
      fullName: form.fullName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      avatarUrl: form.avatarUrl.trim(),
    };
    setError('');
    setSuccess('');
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
      setSuccess('Đã cập nhật hồ sơ cá nhân.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể cập nhật hồ sơ.');
    } finally {
      setPassword('');
      setPending(false);
      locked.current = false;
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-7 flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-3xl text-blue-600">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Ảnh đại diện"
              className="h-full w-full object-cover"
            />
          ) : (
            <UserOutlined />
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{profile.fullName}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {profile.role} · {profile.email}
          </p>
        </div>
      </div>
      {!canEdit && (
        <p className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          Vai trò của bạn chỉ được xem thông tin cá nhân.
        </p>
      )}
      <form onSubmit={(event) => void save(event)} className="space-y-5">
        <fieldset disabled={pending || !canEdit} className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
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
          <label className="text-sm font-medium text-slate-700">
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
        <label className="block text-sm font-medium text-slate-700">
          Email đăng nhập
          <input
            value={profile.email}
            readOnly
            className={`${inputClass} bg-slate-50 text-slate-500`}
          />
          <span className="mt-2 block text-xs text-slate-500">
            Email và vai trò không thể đổi tại đây.
          </span>
        </label>
        {seller && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="mb-3 text-sm text-blue-900">
              <LockOutlined className="mr-2" />
              Xác minh lại người bán trước mỗi lần lưu thay đổi.
            </p>
            <label className="block text-sm font-medium text-slate-700">
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
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </p>
        )}
        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <SaveOutlined className="mr-2" />
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
                setSuccess('');
              }}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
            >
              Hủy thay đổi
            </button>
          </div>
        )}
      </form>
      {canEdit && (
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Bảo mật tài khoản</h3>
            <p className="mt-1 text-xs text-slate-500">
              Đổi mật khẩu bằng mã xác minh gửi qua email.
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowChangePassword(true)}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            <LockOutlined className="mr-2" /> Đổi mật khẩu
          </button>
        </div>
      )}
      {canEdit && showChangePassword && (
        <ChangePasswordModal userId={profile.id} onClose={() => setShowChangePassword(false)} />
      )}
    </section>
  );
}
