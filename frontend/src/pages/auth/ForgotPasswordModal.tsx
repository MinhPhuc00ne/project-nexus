import { useState, useEffect, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { forgotPassword, resetPassword } from '../../services/auth';
import Popup from '../../components/Popup';
import { KeyRound, Mail } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
  onSuccess: (email: string, message: string) => void;
}

export default function ForgotPasswordModal({
  isOpen,
  initialEmail = '',
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const { t } = useTranslation('auth');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState(initialEmail);
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotPending, setForgotPending] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForgotEmail(initialEmail);
      setForgotStep(1);
      setForgotCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotError('');
      setForgotSuccess('');
    }
  }, [isOpen, initialEmail]);

  const handleClose = () => {
    if (!forgotPending) {
      onClose();
    }
  };

  async function handleSendForgotOtp(e: FormEvent) {
    e.preventDefault();
    const targetEmail = forgotEmail.trim();
    if (!targetEmail) {
      setForgotError(t('forgotPasswordModal.emailRequired'));
      return;
    }
    setForgotPending(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await forgotPassword(targetEmail);
      if (res.devOtpCode) {
        setForgotCode(res.devOtpCode);
        setForgotSuccess(
          `${res.message || t('forgotPasswordModal.otpGenerated')} ${t('forgotPasswordModal.devOtpAutoFilled', { code: res.devOtpCode })}`,
        );
      } else {
        setForgotSuccess(res.message || t('forgotPasswordModal.otpSentDefault'));
      }
      setForgotStep(2);
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : t('forgotPasswordModal.sendOtpFailed'));
    } finally {
      setForgotPending(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!forgotCode.trim()) {
      setForgotError(t('forgotPasswordModal.otpRequired'));
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError(t('forgotPasswordModal.passwordMinLength'));
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError(t('forgotPasswordModal.passwordMismatch'));
      return;
    }
    setForgotPending(true);
    setForgotError('');
    try {
      const res = await resetPassword(forgotEmail.trim(), forgotCode.trim(), forgotNewPassword);
      onSuccess(forgotEmail.trim(), res.message || t('forgotPasswordModal.resetSuccessDefault'));
      setForgotStep(1);
      setForgotCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotSuccess('');
      onClose();
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : t('forgotPasswordModal.resetFailed'));
    } finally {
      setForgotPending(false);
    }
  }

  return (
    <Popup
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
          <KeyRound className="w-5 h-5 text-indigo-600" />
          <span>
            {forgotStep === 1
              ? t('forgotPasswordModal.titleStep1')
              : t('forgotPasswordModal.titleStep2')}
          </span>
        </div>
      }
      size="md"
    >
      {forgotStep === 1 ? (
        <form onSubmit={handleSendForgotOtp} className="space-y-4">
          <p className="text-sm text-slate-600">{t('forgotPasswordModal.step1Desc')}</p>

          {forgotError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {forgotError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {t('forgotPasswordModal.emailLabel')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="user@gmail.com"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                disabled={forgotPending}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
              onClick={handleClose}
              disabled={forgotPending}
            >
              {t('forgotPasswordModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={forgotPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
            >
              {forgotPending
                ? t('forgotPasswordModal.sendingOtp')
                : t('forgotPasswordModal.sendOtp')}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-slate-600">
            <Trans
              ns="auth"
              i18nKey="forgotPasswordModal.step2Desc"
              values={{ email: forgotEmail }}
              components={{ bold: <strong /> }}
            />
          </p>

          {forgotSuccess && (
            <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
              {forgotSuccess}
            </div>
          )}

          {forgotError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {forgotError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {t('forgotPasswordModal.otpLabel')}
            </label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder={t('forgotPasswordModal.otpPlaceholder')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tracking-widest text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={forgotCode}
              onChange={(e) => setForgotCode(e.target.value)}
              disabled={forgotPending}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {t('forgotPasswordModal.newPasswordLabel')}
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder={t('forgotPasswordModal.newPasswordPlaceholder')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={forgotNewPassword}
              onChange={(e) => setForgotNewPassword(e.target.value)}
              disabled={forgotPending}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              {t('forgotPasswordModal.confirmPasswordLabel')}
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder={t('forgotPasswordModal.confirmPasswordPlaceholder')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={forgotConfirmPassword}
              onChange={(e) => setForgotConfirmPassword(e.target.value)}
              disabled={forgotPending}
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              className="text-xs text-indigo-600 hover:underline"
              onClick={() => {
                setForgotStep(1);
                setForgotError('');
              }}
              disabled={forgotPending}
            >
              {t('forgotPasswordModal.backOrResend')}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                onClick={handleClose}
                disabled={forgotPending}
              >
                {t('forgotPasswordModal.close')}
              </button>
              <button
                type="submit"
                disabled={forgotPending}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
              >
                {forgotPending
                  ? t('forgotPasswordModal.updating')
                  : t('forgotPasswordModal.confirmReset')}
              </button>
            </div>
          </div>
        </form>
      )}
    </Popup>
  );
}
