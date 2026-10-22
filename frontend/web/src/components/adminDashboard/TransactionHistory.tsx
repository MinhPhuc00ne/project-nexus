import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import Popup from '../Popup';
import { Button, Panel } from './AdminUI';
import {
  DecisionDialog,
  DemoNotice,
  DetailFields,
  labelOptions,
  ManagementTable,
  StatusBadge,
} from './CommerceUI';
import { formatMoney } from './adminData';
import type { AdminTabProps } from './adminTypes';
import { transactionKindLabels, type ManagedTransaction } from './commerceTypes';

export function buildTransactionCsv(rows: ManagedTransaction[]): string {
  const cell = (value: string | number) => {
    let text = String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const header = [
    'Mã giao dịch',
    'Mã đơn',
    'Seller',
    'Loại giao dịch',
    'Số tiền',
    'Phí sàn',
    'Cổng thanh toán',
    'Ngày',
    'Trạng thái',
    'Ghi chú',
  ];
  return (
    '\uFEFF' +
    [
      header,
      ...rows.map((row) => [
        row.id,
        row.orderId,
        row.seller,
        transactionKindLabels[row.kind],
        row.amount,
        row.fee,
        row.gateway,
        row.createdAt,
        row.status === 'reconciled' ? 'Đã đối soát' : 'Chờ đối soát',
        row.note,
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  );
}

export default function TransactionHistory({ data, actions }: AdminTabProps) {
  const [params, setParams] = useSearchParams();
  const orderId = params.get('order');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const detail = data.transactions.find((row) => row.id === detailId);
  const invalidRange = !!from && !!to && from > to;
  const rows = invalidRange
    ? []
    : data.transactions.filter(
        (row) =>
          (!orderId || row.orderId === orderId) &&
          (!from || row.createdAt >= from) &&
          (!to || row.createdAt <= to),
      );
  const exportCsv = (visible: ManagedTransaction[]) => {
    const url = URL.createObjectURL(
      new Blob([buildTransactionCsv(visible)], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nexus-demo-transactions.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="space-y-5">
      <DemoNotice />
      <Panel
        title="Lịch sử giao dịch & đối soát"
        subtitle="Tra cứu khoản thu, phí sàn, hoàn tiền và khoản thanh toán Seller"
        icon={<Wallet size={19} />}
      >
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            Từ ngày
            <input
              type="date"
              value={from}
              aria-invalid={invalidRange}
              aria-describedby={invalidRange ? 'transaction-date-error' : undefined}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 p-2 text-slate-800"
            />
          </label>
          <label className="text-xs text-slate-500">
            Đến ngày
            <input
              type="date"
              value={to}
              aria-invalid={invalidRange}
              aria-describedby={invalidRange ? 'transaction-date-error' : undefined}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 p-2 text-slate-800"
            />
          </label>
          {(from || to || orderId) && (
            <Button
              variant="secondary"
              onClick={() => {
                setFrom('');
                setTo('');
                const next = new URLSearchParams(params);
                next.delete('order');
                setParams(next, { replace: true });
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
          {orderId && <p className="pb-2 text-xs text-primary">Đang xem đơn {orderId}</p>}
        </div>
        {invalidRange && (
          <p id="transaction-date-error" role="alert" className="mb-3 text-xs text-red-600">
            Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.
          </p>
        )}
        <ManagementTable
          rows={rows}
          searchPlaceholder="Tìm mã giao dịch, đơn hàng, seller hoặc cổng thanh toán..."
          searchText={(row) => `${row.id} ${row.orderId} ${row.seller} ${row.gateway}`}
          onExport={exportCsv}
          filters={[
            {
              key: 'kind',
              label: 'Mọi loại giao dịch',
              options: labelOptions(transactionKindLabels),
            },
            {
              key: 'status',
              label: 'Mọi trạng thái đối soát',
              options: labelOptions({ pending: 'Chờ đối soát', reconciled: 'Đã đối soát' }),
            },
          ]}
          columns={[
            {
              title: 'Giao dịch / Đơn hàng',
              render: (row) => (
                <>
                  <p className="font-semibold">{row.id}</p>
                  <p>{row.orderId}</p>
                  <span className="text-slate-400">{row.createdAt}</span>
                </>
              ),
            },
            {
              title: 'Loại / Seller',
              render: (row) => (
                <>
                  {transactionKindLabels[row.kind]}
                  <p className="text-slate-500">{row.seller}</p>
                </>
              ),
            },
            {
              title: 'Số tiền',
              render: (row) => <span className="font-semibold">{formatMoney(row.amount)}</span>,
            },
            { title: 'Phí sàn', render: (row) => formatMoney(row.fee) },
            { title: 'Cổng thanh toán', render: (row) => row.gateway },
            {
              title: 'Đối soát',
              render: (row) => (
                <StatusBadge
                  status={row.status}
                  label={row.status === 'reconciled' ? 'Đã đối soát' : 'Chờ đối soát'}
                />
              ),
            },
            {
              title: 'Thao tác',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setDetailId(row.id)}>
                    Chi tiết
                  </Button>
                  {row.status === 'pending' && (
                    <Button onClick={() => setDecisionId(row.id)}>Đối soát</Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Panel>
      <Popup
        isOpen={!!detail}
        onClose={() => setDetailId(null)}
        title="Chi tiết giao dịch"
        size="lg"
      >
        {detail && (
          <div className="space-y-5">
            <DetailFields
              fields={[
                ['Mã giao dịch', detail.id],
                ['Mã đơn', detail.orderId],
                ['Loại giao dịch', transactionKindLabels[detail.kind]],
                ['Seller', detail.seller],
                ['Số tiền', formatMoney(detail.amount)],
                ['Phí sàn', formatMoney(detail.fee)],
                ['Cổng thanh toán', detail.gateway],
                ['Ngày', detail.createdAt],
                ['Đối soát', detail.status === 'reconciled' ? 'Đã đối soát' : 'Chờ đối soát'],
                ['Ghi chú', detail.note],
              ]}
            />
            <Link
              className="text-sm font-semibold text-primary underline"
              to={`/admin/orders?order=${encodeURIComponent(detail.orderId)}`}
            >
              Xem đơn hàng liên quan
            </Link>
          </div>
        )}
      </Popup>
      {decisionId && (
        <DecisionDialog
          key={decisionId}
          title="Xác nhận đã đối soát"
          description={`${decisionId}. Chỉ xác nhận sau khi đối chiếu với cổng thanh toán. Thao tác mẫu này không gửi lệnh chuyển tiền hoặc hoàn tiền.`}
          onClose={() => setDecisionId(null)}
          onConfirm={(reason) => {
            actions.updateCommerce({
              entity: 'transactions',
              id: decisionId,
              status: 'reconciled',
              reason,
            });
            setDecisionId(null);
          }}
        />
      )}
    </div>
  );
}
