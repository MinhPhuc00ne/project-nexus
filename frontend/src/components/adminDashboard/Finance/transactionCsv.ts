import type { AdminWalletTransaction } from '../../../types/admin-wallet.types';
import { typeLabels, statusLabels, date } from './transactionPresentation';

export function buildTransactionCsv(rows: AdminWalletTransaction[]): string {
  const cell = (value: string | number) => {
    let text = String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const header = [
    'Mã giao dịch',
    'Mã tham chiếu',
    'Loại giao dịch',
    'Số tiền',
    'Thời gian',
    'Trạng thái',
    'Mô tả',
  ];
  return (
    '\uFEFF' +
    [
      header,
      ...rows.map((row) => [
        row.id,
        row.referenceId ?? '',
        typeLabels[row.type] ?? row.type,
        row.amount,
        date(row.createdAt),
        statusLabels[row.status] ?? row.status,
        row.description ?? '',
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  );
}
