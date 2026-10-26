import { useEffect } from 'react';
import { CheckCircle2, CircleX, X } from 'lucide-react';
import type { ToastItemProps, ToastItem } from '../../types/toast.types';
import { Button } from '../ui/button';

export default function ToastFrame({
  id,
  message,
  duration,
  onDismiss,
  variant,
}: ToastItemProps & Pick<ToastItem, 'variant'>) {
  const success = variant === 'success';

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      role={success ? 'status' : 'alert'}
      aria-atomic="true"
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-l-4 p-4 shadow-lg motion-safe:animate-fade-in ${success ? 'border-emerald-200 border-l-emerald-500 bg-emerald-50 text-emerald-900' : 'border-red-200 border-l-red-500 bg-red-50 text-red-900'}`}
    >
      {success ? (
        <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
      ) : (
        <CircleX size={22} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{success ? 'Thành công' : 'Thất bại'}</p>
        <p className="mt-1 break-words whitespace-pre-line text-sm leading-relaxed">{message}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Đóng thông báo"
        onClick={() => onDismiss(id)}
        className={`size-7 shrink-0 ${success ? 'text-emerald-700 hover:bg-emerald-100' : 'text-red-700 hover:bg-red-100'}`}
      >
        <X size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
