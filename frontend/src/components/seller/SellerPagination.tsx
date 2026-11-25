import type { ReactElement } from 'react';
import { ChevronLeft as LeftOutlined, ChevronRight as RightOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SellerButton } from './SellerUI';

export default function SellerPagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
      <span>{t('ui.paginationSummary', { total, page, totalPages: Math.max(1, totalPages) })}</span>
      <div className="flex gap-2">
        <SellerButton
          secondary
          aria-label={t('ui.prevPage')}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <LeftOutlined />
        </SellerButton>
        <SellerButton
          secondary
          aria-label={t('ui.nextPage')}
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <RightOutlined />
        </SellerButton>
      </div>
    </div>
  );
}
