import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag } from 'lucide-react';
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
import type { AdminTabProps } from './adminTypes';
import { reportLabels, reportTypeLabels, type ManagedReport } from './commerceTypes';

export default function ReportsManagement({ data, actions }: AdminTabProps) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ id: string; status: ManagedReport['status'] } | null>(
    null,
  );
  const detail = data.reports.find((item) => item.id === detailId);
  return (
    <div className="space-y-5">
      <DemoNotice />
      <Panel
        title="Tiếp nhận khiếu nại & báo cáo"
        subtitle="Sản phẩm, seller, gian lận trả giá và tranh chấp đơn hàng"
        icon={<Flag size={19} />}
      >
        <ManagementTable
          rows={data.reports}
          searchText={(row) => `${row.id} ${row.target} ${row.reporter} ${row.description}`}
          filters={[
            { key: 'type', label: 'Mọi loại báo cáo', options: labelOptions(reportTypeLabels) },
            { key: 'status', label: 'Tất cả trạng thái', options: labelOptions(reportLabels) },
          ]}
          columns={[
            {
              title: 'Báo cáo',
              render: (row) => (
                <>
                  <p className="font-semibold">{row.id}</p>
                  {reportTypeLabels[row.type]}
                </>
              ),
            },
            {
              title: 'Đối tượng',
              render: (row) => (
                <>
                  <p>{row.target}</p>
                  <span className="text-slate-400">Người báo cáo: {row.reporter}</span>
                </>
              ),
            },
            { title: 'Nội dung', render: (row) => <p className="max-w-xs">{row.description}</p> },
            {
              title: 'Trạng thái',
              render: (row) => <StatusBadge status={row.status} label={reportLabels[row.status]} />,
            },
            {
              title: 'Thao tác',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setDetailId(row.id)}>
                    Xem báo cáo
                  </Button>
                  {row.status === 'open' && (
                    <Button onClick={() => setDecision({ id: row.id, status: 'investigating' })}>
                      Tiếp nhận
                    </Button>
                  )}
                  {['open', 'investigating'].includes(row.status) && (
                    <>
                      <Button onClick={() => setDecision({ id: row.id, status: 'resolved' })}>
                        Kết luận
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setDecision({ id: row.id, status: 'dismissed' })}
                      >
                        Bác bỏ
                      </Button>
                    </>
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
        title="Chi tiết báo cáo & bằng chứng"
        size="lg"
      >
        {detail && (
          <div className="space-y-5">
            <DetailFields
              fields={[
                ['Mã báo cáo', detail.id],
                ['Loại báo cáo', reportTypeLabels[detail.type]],
                ['Đối tượng', detail.target],
                ['Người báo cáo', detail.reporter],
                ['Trạng thái', reportLabels[detail.status]],
                ['Nội dung', detail.description],
                ['Bằng chứng / thông tin xác minh', detail.evidence],
                ['Kết luận / ghi chú', detail.note],
              ]}
            />
            {detail.orderId && (
              <div className="flex flex-wrap gap-4 text-sm font-semibold text-primary">
                <Link
                  className="underline"
                  to={`/admin/orders?order=${encodeURIComponent(detail.orderId)}`}
                >
                  Xem đơn liên quan
                </Link>
                {data.refunds.some((item) => item.id === detail.orderId) ? (
                  <Link
                    className="underline"
                    to={`/admin/refunds?order=${encodeURIComponent(detail.orderId)}`}
                  >
                    Xem yêu cầu hoàn tiền
                  </Link>
                ) : (
                  <span className="font-normal text-slate-500">
                    Chưa có yêu cầu hoàn tiền cho đơn này.
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </Popup>
      {decision && (
        <DecisionDialog
          key={`${decision.id}-${decision.status}`}
          title={reportLabels[decision.status]}
          description={`${decision.id}. Ghi lại kết quả hoặc hướng xử lý. Kết luận báo cáo không tự động hoàn tiền, ẩn sản phẩm hay đình chỉ Seller.`}
          onClose={() => setDecision(null)}
          onConfirm={(reason) => {
            actions.updateCommerce({
              entity: 'reports',
              id: decision.id,
              status: decision.status,
              reason,
            });
            setDecision(null);
          }}
        />
      )}
    </div>
  );
}
