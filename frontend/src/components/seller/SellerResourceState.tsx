import type { ReactElement, ReactNode } from 'react';
import { RefreshCw as ReloadOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SellerButton } from './SellerUI';

export const sellerInputClass =
  'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';
export const sellerLabelClass = 'block text-xs font-medium text-slate-600';

export default function SellerResourceState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
  children: ReactNode;
}): ReactElement {
  const { t } = useTranslation('seller');
  if (loading)
    return (
      <p role="status" className="py-10 text-center text-sm text-slate-500">
        {t('ui.loadingData')}
      </p>
    );
  if (error)
    return (
      <div
        role="alert"
        className="space-y-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
      >
        <p>{error}</p>
        <SellerButton secondary onClick={retry}>
          <ReloadOutlined /> {t('ui.retry')}
        </SellerButton>
      </div>
    );
  return <>{children}</>;
}
