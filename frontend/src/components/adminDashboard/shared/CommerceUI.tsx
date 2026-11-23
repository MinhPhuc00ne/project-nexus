import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Popup from '../../Popup';
import { Badge, Button, EmptyState, SearchInput } from './AdminUI';

export function DemoNotice() {
  const { t } = useTranslation('admin');
  return (
    <p
      role="note"
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"
    >
      {t('shared.demoNotice')}
    </p>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone = ['active', 'delivered', 'resolved', 'reconciled', 'paid'].includes(status)
    ? 'green'
    : ['rejected', 'hidden', 'suspended', 'cancelled', 'dismissed'].includes(status)
      ? 'red'
      : ['pending', 'open', 'unpaid'].includes(status)
        ? 'amber'
        : 'blue';
  return <Badge tone={tone}>{label}</Badge>;
}

export function DetailFields({ fields }: { fields: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="mb-1 text-xs text-slate-500">{label}</dt>
          <dd className="break-words whitespace-pre-line text-slate-800">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface TableColumn<T> {
  title: string;
  render: (row: T) => ReactNode;
}

export function ManagementTable<T extends { id: string }>({
  rows,
  columns,
  searchText,
  filters = [],
  searchPlaceholder,
  onExport,
  paginate = true,
}: {
  rows: T[];
  columns: TableColumn<T>[];
  searchText: (row: T) => string;
  searchPlaceholder?: string;
  onExport?: (rows: T[]) => void;
  paginate?: boolean;
  filters?: { key: keyof T; label: string; options: { value: string; label: string }[] }[];
}) {
  const { t } = useTranslation('admin');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const visible = rows.filter(
    (row) =>
      searchText(row).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
      filters.every(
        (filter) =>
          !selected[String(filter.key)] || String(row[filter.key]) === selected[String(filter.key)],
      ),
  );
  const pages = Math.max(1, Math.ceil(visible.length / 8));
  const currentPage = Math.min(page, pages);
  const currentRows = paginate ? visible.slice((currentPage - 1) * 8, currentPage * 8) : visible;
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={searchPlaceholder ?? t('shared.searchCodeOrName')}
          />
        </div>
        {filters.map((filter) => (
          <select
            key={String(filter.key)}
            aria-label={filter.label}
            className="min-h-10 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
            value={selected[String(filter.key)] ?? ''}
            onChange={(event) => {
              setSelected((previous) => ({ ...previous, [filter.key]: event.target.value }));
              setPage(1);
            }}
          >
            <option value="">{filter.label}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
        {onExport && (
          <Button variant="secondary" disabled={!visible.length} onClick={() => onExport(visible)}>
            {t('shared.exportCsv')}
          </Button>
        )}
      </div>
      {currentRows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-blue-50 text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th scope="col" key={column.title} className="p-3 font-semibold">
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRows.map((row) => (
                <tr key={row.id} className="align-top hover:bg-slate-50/70">
                  {columns.map((column) => (
                    <td key={column.title} className="p-3 leading-5">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState text={t('shared.emptyFiltered')} />
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          {t('shared.resultsCount', { count: visible.length })}
          {paginate ? t('shared.pageOf', { page: currentPage, pages }) : t('shared.inCurrentPage')}
        </span>
        {paginate && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              {t('shared.prev')}
            </Button>
            <Button
              variant="secondary"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              {t('shared.next')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export function labelOptions(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

export function DecisionDialog({
  title,
  description,
  onClose,
  onConfirm,
  requireReason = true,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  requireReason?: boolean;
}) {
  const { t } = useTranslation('admin');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  return (
    <Popup isOpen onClose={onClose} title={title} size="md">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (requireReason && !reason.trim()) {
            setError(t('shared.reasonRequiredErr'));
            return;
          }
          onConfirm(reason.trim());
        }}
      >
        <p className="mb-4 text-sm leading-6 text-slate-600">{description}</p>
        <label className="block text-xs font-semibold">
          {requireReason ? t('shared.reasonLabel') : t('shared.reconcileNoteLabel')}
          <textarea
            value={reason}
            rows={3}
            maxLength={1000}
            aria-invalid={!!error}
            aria-describedby={error ? 'commerce-decision-error' : undefined}
            onChange={(event) => {
              setReason(event.target.value);
              setError('');
            }}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal"
          />
        </label>
        {error && (
          <p id="commerce-decision-error" role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('shared.cancel')}
          </Button>
          <Button type="submit">{t('shared.confirm')}</Button>
        </div>
      </form>
    </Popup>
  );
}
