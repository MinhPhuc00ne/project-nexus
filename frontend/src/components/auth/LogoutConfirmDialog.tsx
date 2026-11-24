import { useId } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Popup from '../Popup';

type LogoutConfirmDialogProps = {
  open: boolean;
  accountName?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

/** One logout confirmation for buyer, seller, admin, and staff. */
export default function LogoutConfirmDialog({
  open,
  accountName,
  onCancel,
  onConfirm,
}: LogoutConfirmDialogProps) {
  const { t } = useTranslation('common');
  const descriptionId = useId();

  return (
    <Popup
      isOpen={open}
      onClose={onCancel}
      size="sm"
      title={t('logoutDialog.title')}
      descriptionId={descriptionId}
      closeLabel={t('logoutDialog.closeAria')}
      footer={
        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-10 flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {t('logoutDialog.stay')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-10 flex-1 cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            {t('logoutDialog.confirm')}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
          <LogOut size={21} aria-hidden="true" />
        </span>
        <p
          id={descriptionId}
          className="py-1 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]"
        >
          {accountName
            ? t('logoutDialog.descriptionWithAccount', { accountName })
            : t('logoutDialog.descriptionDefault')}
        </p>
      </div>
    </Popup>
  );
}
