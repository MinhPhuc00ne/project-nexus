import i18n from '../../../i18n';
import type { AdminWalletTransaction } from '../../../types/admin-wallet.types';
import { date } from './transactionPresentation';

export function buildTransactionCsv(rows: AdminWalletTransaction[]): string {
  const cell = (value: string | number) => {
    let text = String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const header = [
    i18n.t('admin:finance.csv.id'),
    i18n.t('admin:finance.csv.reference'),
    i18n.t('admin:finance.csv.type'),
    i18n.t('admin:finance.csv.amount'),
    i18n.t('admin:finance.csv.time'),
    i18n.t('admin:finance.csv.status'),
    i18n.t('admin:finance.csv.description'),
  ];
  return (
    '\uFEFF' +
    [
      header,
      ...rows.map((row) => [
        row.id,
        row.referenceId ?? '',
        i18n.t(`admin:finance.types.${row.type}`, { defaultValue: row.type }),
        row.amount,
        date(row.createdAt),
        i18n.t(`admin:finance.statuses.${row.status}`, { defaultValue: row.status }),
        row.description ?? '',
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  );
}
