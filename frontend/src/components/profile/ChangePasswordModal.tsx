import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EyeOff as EyeInvisibleOutlined } from 'lucide-react';
import { Eye as EyeOutlined, Lock as LockOutlined, Mail as MailOutlined } from 'lucide-react';
import Popup from '../Popup';
import { useAuth } from '../../contexts/AuthContext';
import useChangePassword from './useChangePassword';
import { markPasswordChanged } from '@/features/auth/services/authNotice';

const inputClass =
  'mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

export default function ChangePasswordModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const state = useChangePassword(
    userId,
    () => {
      markPasswordChanged();
      logout();
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    },
    onClose,
  );
  const busy = Boolean(state.pending);
  return (
    <Popup
      isOpen
      onClose={state.close}
      title={t('profileEditor.changePasswordModal.title')}
      closeOnOverlay={!busy}
      closeOnEsc={!busy}
      showCloseButton={!busy}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void state.confirm();
        }}
        className="space-y-4"
        aria-busy={busy}
      >
        <p className="text-xs leading-5 text-slate-600">
          {t('profileEditor.changePasswordModal.desc')}
        </p>
        <div className="space-y-2.5 rounded-lg border border-blue-200 bg-blue-50/70 p-4">
          <button
            type="button"
            disabled={busy || state.resendWait > 0}
            onClick={() => void state.requestOtp()}
            className={buttonClass}
          >
            <MailOutlined />{' '}
            {state.pending === 'request'
              ? t('profileEditor.changePasswordModal.sendingCode')
              : state.resendWait > 0
                ? t('profileEditor.changePasswordModal.resendAfter', {
                    seconds: state.resendWait,
                  })
                : state.sent
                  ? t('profileEditor.changePasswordModal.resendOtp')
                  : t('profileEditor.changePasswordModal.sendOtpEmail')}
          </button>
          {state.message && (
            <p role="status" className="break-words text-xs leading-5 text-blue-800">
              {state.message}
            </p>
          )}
          {state.sent && (
            <p className="text-[11px] text-slate-600">
              {state.remaining > 0
                ? t('profileEditor.changePasswordModal.remainingTime', {
                    minutes: Math.floor(state.remaining / 60),
                    seconds: state.remaining % 60,
                  })
                : t('profileEditor.changePasswordModal.expiredOtp')}
            </p>
          )}
        </div>
        {state.sent && (
          <fieldset disabled={busy} className="space-y-3.5">
            <label className="block text-xs font-semibold text-slate-700">
              {t('profileEditor.changePasswordModal.otpLabel')}
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={state.otp}
                onChange={(event) =>
                  state.setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                className={inputClass}
                placeholder={t('profileEditor.changePasswordModal.otpPlaceholder')}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              {t('profileEditor.changePasswordModal.newPasswordLabel')}
              <div className="relative">
                <input
                  type={visible ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={state.newPassword}
                  onChange={(event) => state.setNewPassword(event.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  aria-label={
                    visible
                      ? t('profileEditor.changePasswordModal.hidePassword')
                      : t('profileEditor.changePasswordModal.showPassword')
                  }
                  aria-pressed={visible}
                  onClick={() => setVisible((value) => !value)}
                  className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center text-muted"
                >
                  {visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              <span className="mt-1.5 block text-[11px] font-normal text-muted">
                {t('profileEditor.changePasswordModal.passwordHint')}
              </span>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              {t('profileEditor.changePasswordModal.confirmPasswordLabel')}
              <input
                type={visible ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={state.confirmation}
                onChange={(event) => state.setConfirmation(event.target.value)}
                className={inputClass}
              />
            </label>
          </fieldset>
        )}
        {state.error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-xs text-red-700">
            {state.error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-200 pt-3.5">
          <button
            type="button"
            disabled={busy}
            onClick={state.close}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {t('profileEditor.changePasswordModal.cancel')}
          </button>
          {state.sent && (
            <button type="submit" disabled={busy || state.remaining === 0} className={buttonClass}>
              <LockOutlined />{' '}
              {state.pending === 'confirm'
                ? t('profileEditor.changePasswordModal.changing')
                : t('profileEditor.changePasswordModal.title')}
            </button>
          )}
        </div>
      </form>
    </Popup>
  );
}
