import { LogOut, X } from 'lucide-react';

type LogoutConfirmDialogProps = {
  open: boolean;
  accountName?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

/** A shared, accessible confirmation dialog for ending the current session. */
export default function LogoutConfirmDialog({
  open,
  accountName,
  onCancel,
  onConfirm,
}: LogoutConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirmation-title"
        aria-describedby="logout-confirmation-description"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 place-items-center rounded-full bg-red-50 text-red-600">
            <LogOut size={21} aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng xác nhận đăng xuất"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <h2 id="logout-confirmation-title" className="mt-4 text-lg font-bold text-slate-900">
          Xác nhận đăng xuất
        </h2>
        <p id="logout-confirmation-description" className="mt-2 text-sm leading-6 text-slate-600">
          {accountName
            ? `Bạn có chắc muốn đăng xuất khỏi tài khoản ${accountName}?`
            : 'Bạn có chắc muốn đăng xuất khỏi tài khoản này?'}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ở lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Đăng xuất
          </button>
        </div>
      </section>
    </div>
  );
}
