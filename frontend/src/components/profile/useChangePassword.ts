import { useEffect, useRef, useState } from 'react';
import i18n from '../../i18n';
import { getStoredUser } from '@/features/auth/services/auth';
import {
  confirmChangePasswordOtp,
  requestChangePasswordOtp,
  validatePasswordChange,
} from '@/features/auth/services/changePassword';

export default function useChangePassword(
  userId: string,
  onSuccess: () => void,
  onClose: () => void,
) {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'request' | 'confirm' | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!sent) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sent]);

  const assertAccount = () => {
    if (getStoredUser()?.id !== userId)
      throw new Error(i18n.t('common:profileEditor.changePasswordModal.accountChangedError'));
  };
  async function requestOtp(): Promise<void> {
    if (lock.current || Date.now() < resendAt) return;
    lock.current = true;
    setPending('request');
    setError('');
    try {
      assertAccount();
      const result = await requestChangePasswordOtp();
      assertAccount();
      if (!active.current) return;
      const time = Date.now();
      setSent(true);
      setOtp('');
      setMessage(result.message);
      setNow(time);
      setExpiresAt(time + 15 * 60 * 1000);
      setResendAt(time + 30 * 1000);
    } catch (cause) {
      if (active.current)
        setError(
          cause instanceof Error
            ? cause.message
            : i18n.t('common:profileEditor.changePasswordModal.sendOtpFailed'),
        );
    } finally {
      lock.current = false;
      if (active.current) setPending(null);
    }
  }
  async function confirm(): Promise<void> {
    if (lock.current) return;
    setError('');
    try {
      assertAccount();
      if (!sent)
        throw new Error(i18n.t('common:profileEditor.changePasswordModal.requestOtpFirstError'));
      if (Date.now() >= expiresAt)
        throw new Error(i18n.t('common:profileEditor.changePasswordModal.expiredError'));
      const payload = validatePasswordChange(otp, newPassword, confirmation);
      lock.current = true;
      setPending('confirm');
      await confirmChangePasswordOtp(payload);
      assertAccount();
      if (active.current) onSuccess();
    } catch (cause) {
      if (active.current)
        setError(
          cause instanceof Error
            ? cause.message
            : i18n.t('common:profileEditor.changePasswordModal.changeFailed'),
        );
    } finally {
      lock.current = false;
      if (active.current) setPending(null);
    }
  }
  return {
    otp,
    setOtp,
    newPassword,
    setNewPassword,
    confirmation,
    setConfirmation,
    sent,
    message,
    error,
    pending,
    requestOtp,
    confirm,
    remaining: Math.max(0, Math.ceil((expiresAt - now) / 1000)),
    resendWait: Math.max(0, Math.ceil((resendAt - now) / 1000)),
    close: () => {
      if (!lock.current) onClose();
    },
  };
}
