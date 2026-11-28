import React, { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X as CloseOutlined } from 'lucide-react';

export type PopupSize = 'sm' | 'md' | 'lg' | 'xl';

export interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  descriptionId?: string;
  closeLabel?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: PopupSize;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

let openCount = 0;
let previousOverflow = '';

function lockBodyScroll() {
  if (openCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  openCount += 1;
}

function unlockBodyScroll() {
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sizeClasses: Record<PopupSize, string> = {
  sm: 'max-w-[380px]',
  md: 'max-w-[520px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[960px]',
};

const Popup: React.FC<PopupProps> = ({
  isOpen,
  onClose,
  title,
  descriptionId,
  closeLabel,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  closeOnEsc = true,
  showCloseButton = true,
  className = '',
}) => {
  const { t } = useTranslation('common');
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && closeOnEsc) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      // Trap focus inside the popup when pressing Tab.
      if (event.key === 'Tab' && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) {
          event.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === dialogRef.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockBodyScroll();
      previouslyFocused?.focus?.();
    };
  }, [isOpen, closeOnEsc]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/55 p-4 max-[480px]:items-end max-[480px]:p-2"
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-xl bg-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.3)] outline-none max-[480px]:max-h-[calc(100vh-1rem)] ${sizeClasses[size]} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            {title ? (
              <h2 id={titleId} className="m-0 text-lg leading-[1.3] font-bold">
                {title}
              </h2>
            ) : (
              <span />
            )}
            {showCloseButton && (
              <button
                type="button"
                className="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-transparent p-0 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                onClick={onClose}
                aria-label={closeLabel ?? t('popup.close')}
              >
                <CloseOutlined className="text-2xl" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 leading-[1.55]">{children}</div>

        {footer && (
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-200 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Popup;
