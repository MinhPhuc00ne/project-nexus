import type { ReactElement } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
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
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
      <span>
        {total} bản ghi · Trang {page}/{Math.max(1, totalPages)}
      </span>
      <div className="flex gap-2">
        <SellerButton
          secondary
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <LeftOutlined />
        </SellerButton>
        <SellerButton
          secondary
          aria-label="Trang sau"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <RightOutlined />
        </SellerButton>
      </div>
    </div>
  );
}
