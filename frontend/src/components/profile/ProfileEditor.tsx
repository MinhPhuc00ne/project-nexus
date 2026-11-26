import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock as LockOutlined } from 'lucide-react';
import { Save as SaveOutlined, User as UserOutlined } from 'lucide-react';
import { Role } from '@nexus/types';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { updateMyProfile, type ProfileChanges } from '@/features/account/services/profile';
import type { UserProfile } from '@/features/account/types/user.types';
import AvatarPicker from './AvatarPicker';
import ChangePasswordModal from './ChangePasswordModal';
import { useToast } from '../ToastNotification';

const inputClass =
  'mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';

type ProfileForm = Required<ProfileChanges>;

export default function ProfileEditor({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation('common');
  const { refreshProfile, setProfile } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const initial = (): ProfileForm => ({
    fullName: profile.fullName,
    phoneNumber: profile.phoneNumber || '',
    avatarUrl: profile.avatarUrl || '',
  });
  const [form, setForm] = useState<ProfileForm>(initial);
  const [savedForm, setSavedForm] = useState<ProfileForm>(initial);
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
    ? t('profileEditor.roleSeller')
    : profile.role === Role.ADMIN
      ? t('profileEditor.roleAdmin')
      : t('profileEditor.roleBuyer');

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canEdit || locked.current) return;
    const normalizedForm: ProfileForm = {
      fullName: form.fullName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      avatarUrl: form.avatarUrl.trim(),
    };
    setError('');
    if (normalizedForm.fullName.length < 2 || normalizedForm.fullName.length > 100) {
      setError(t('profileEditor.nameLengthError'));
      return;
    }
    if (normalizedForm.phoneNumber && !/^\+?[0-9]{9,15}$/.test(normalizedForm.phoneNumber)) {
      setError(t('profileEditor.phoneFormatError'));
      return;
    }
    const changes: ProfileChanges = {};
    if (normalizedForm.fullName !== savedForm.fullName) changes.fullName = normalizedForm.fullName;
    if (normalizedForm.phoneNumber !== savedForm.phoneNumber)
      changes.phoneNumber = normalizedForm.phoneNumber;
    if (avatarFile || normalizedForm.avatarUrl !== savedForm.avatarUrl)
      changes.avatarUrl = normalizedForm.avatarUrl;

    if (Object.keys(changes).length === 0) {
      setError(t('profileEditor.noChangesError'));
      return;
    }

    locked.current = true;
    setPending(true);
    try {
      const saved = await updateMyProfile(changes, password, avatarFile);
      const nextForm = { ...normalizedForm, ...saved };
      setForm(nextForm);
      setSavedForm(nextForm);
      setAvatarFile(null);
      setProfile((current) => (current?.id === profile.id ? { ...current, ...saved } : current));
      await refreshProfile();
      toast.success(t('profileEditor.updateSuccess'));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t('profileEditor.updateFailed');
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
              alt={t('profileEditor.avatarAlt')}
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
          <p className="mt-0.5 text-[11px] text-slate-400">{t('profileEditor.avatarNote')}</p>
        </div>
      </div>
      {!canEdit && (
        <p className="mb-5 rounded-md bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-800">
          {t('profileEditor.readOnlyNotice')}
        </p>
      )}
      <form onSubmit={(event) => void save(event)} className="space-y-5">
        <fieldset disabled={pending || !canEdit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            {t('profileEditor.fullNameLabel')}
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
            {t('profileEditor.phoneLabel')}
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
          {t('profileEditor.emailLabel')}
          <input
            value={profile.email}
            readOnly
            className={`${inputClass} bg-slate-50 text-slate-500`}
          />
          <span className="mt-1.5 block text-[11px] font-normal text-slate-500">
            {t('profileEditor.emailNote')}
          </span>
        </label>
        {seller && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
            <p className="mb-2.5 text-xs font-semibold text-[var(--color-navy)]">
              <LockOutlined className="mr-1.5" />
              {t('profileEditor.verifyPasswordPrompt')}
            </p>
            <label className="block text-xs font-semibold text-slate-700">
              {t('profileEditor.currentPasswordLabel')}
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
              {pending
                ? t('profileEditor.savingAndVerifying')
                : seller
                  ? t('profileEditor.verifyAndSave')
                  : t('profileEditor.saveChanges')}
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
              {t('profileEditor.cancelChanges')}
            </button>
          </div>
        )}
      </form>
      {canEdit && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
          <div>
            <h3 className="text-xs font-bold text-slate-900">{t('profileEditor.securityTitle')}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{t('profileEditor.securityDesc')}</p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowChangePassword(true)}
            className="rounded-md border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition cursor-pointer"
          >
            <LockOutlined className="mr-1.5" /> {t('profileEditor.changePassword')}
          </button>
        </div>
      )}
      {canEdit && showChangePassword && (
        <ChangePasswordModal userId={profile.id} onClose={() => setShowChangePassword(false)} />
      )}
    </section>
  );
}
