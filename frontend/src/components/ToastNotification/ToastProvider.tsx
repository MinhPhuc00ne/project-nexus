import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ToastApi, ToastItem, ToastOptions } from '../../types/toast.types';
import Fail from './Fail';
import Success from './Success';
import { ToastContext } from './ToastContext';

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const sequence = useRef(0);
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const show = useCallback(
    (variant: ToastItem['variant'], message: string, options?: ToastOptions) => {
      const id = ++sequence.current;
      const requestedDuration = options?.duration ?? 4000;
      const duration =
        Number.isFinite(requestedDuration) && requestedDuration > 0 ? requestedDuration : 4000;
      setToasts((current) => [...current, { id, message, variant, duration }].slice(-3));
      return id;
    },
    [],
  );
  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          role="region"
          aria-label="Thông báo"
          className="pointer-events-none fixed right-4 bottom-4 z-[1100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:bottom-6"
        >
          {toasts.map(({ variant, ...toast }) =>
            variant === 'success' ? (
              <Success key={toast.id} {...toast} onDismiss={dismiss} />
            ) : (
              <Fail key={toast.id} {...toast} onDismiss={dismiss} />
            ),
          )}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
