import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getStoredToken, getStoredUser } from '@/features/auth/services/auth';
import { useSellerSession } from './SellerSession';
import { useToast } from '../ToastNotification';

interface SellerAction {
  pending: boolean;
  error: string;
  run: <T>(request: () => Promise<T>, onSuccess: (result: T) => void) => Promise<void>;
}

export default function useSellerAction(): SellerAction {
  const { t } = useTranslation('seller');
  const user = useSellerSession();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function run<T>(request: () => Promise<T>, onSuccess: (result: T) => void): Promise<void> {
    if (lock.current) return;
    const current = (): boolean =>
      mounted.current && !!getStoredToken() && getStoredUser()?.id === user.id;
    if (!current()) return;
    lock.current = true;
    setPending(true);
    setError('');
    try {
      const result = await request();
      if (current()) onSuccess(result);
    } catch (cause) {
      if (current()) {
        const message = cause instanceof Error ? cause.message : t('session.saveFailed');
        setError(message);
        toast.error(message);
      }
    } finally {
      lock.current = false;
      if (current()) setPending(false);
    }
  }
  return { pending, error, run };
}
