import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CircleX, X, ArrowRight } from 'lucide-react';
import type { ToastItemProps, ToastItem } from '../../types/toast.types';
import { Button } from '../ui/button';

export default function ToastFrame({
  id,
  message,
  duration,
  onDismiss,
  variant,
  targetUrl,
  onClick,
  actionLabel,
}: ToastItemProps & Pick<ToastItem, 'variant'>) {
  const { t } = useTranslation('common');
  const success = variant === 'success';

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const handleAction = () => {
    if (onClick) {
      onClick();
    } else if (targetUrl) {
      window.location.assign(targetUrl);
    }
    onDismiss(id);
  };

  const isClickable = Boolean(targetUrl || onClick);

  return (
    <div
      role={success ? 'status' : 'alert'}
      aria-atomic="true"
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-l-4 p-4 shadow-lg motion-safe:animate-fade-in ${
        success
          ? 'border-emerald-200 border-l-emerald-500 bg-emerald-50 text-emerald-900'
          : 'border-red-200 border-l-red-500 bg-red-50 text-red-900'
      }`}
    >
      {success ? (
        <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
      ) : (
        <CircleX size={22} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
      )}
      <div
        className={`min-w-0 flex-1 ${isClickable ? 'cursor-pointer group' : ''}`}
        onClick={isClickable ? handleAction : undefined}
      >
        <p className="text-sm font-semibold">{success ? t('toast.success') : t('toast.failed')}</p>
        <p className="mt-1 break-words whitespace-pre-line text-sm leading-relaxed">{message}</p>

        {isClickable && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-bold shadow-xs transition group-hover:bg-white">
            <span className={success ? 'text-emerald-800' : 'text-red-800'}>
              {actionLabel || t('toast.viewDetails')}
            </span>
            <ArrowRight size={13} className={success ? 'text-emerald-700' : 'text-red-700'} />
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('toast.dismissAria')}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
        className={`size-7 shrink-0 cursor-pointer ${
          success ? 'text-emerald-700 hover:bg-emerald-100' : 'text-red-700 hover:bg-red-100'
        }`}
      >
        <X size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
