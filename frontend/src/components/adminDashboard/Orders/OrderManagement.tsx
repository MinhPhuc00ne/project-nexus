import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import Popup from '../../Popup';
import { Button, Panel } from '../shared/AdminUI';
import {
  DecisionDialog,
  DemoNotice,
  DetailFields,
  labelOptions,
  ManagementTable,
  StatusBadge,
} from '../shared/CommerceUI';
import { formatMoney } from '../shared/adminData';
import type { AdminTabProps } from '../shared/adminTypes';
import { orderLabels, saleTypeLabels } from '../shared/commerceTypes';

const paymentLabels = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
};

export default function OrderManagement({ data, actions }: AdminTabProps) {
  const [params, setParams] = useSearchParams();
  const detailId = params.get('order');
  const openDetail = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('order', id);
    setParams(next);
  };
  const [cancelId, setCancelId] = useState<string | null>(null);
  const detail = data.orders.find((item) => item.id === detailId);
  const closeDetail = () => {
    if (params.has('order')) {
      const next = new URLSearchParams(params);
      next.delete('order');
      setParams(next, { replace: true });
    }
  };
  return (
    <div className="space-y-5">
      <DemoNotice />
      <Panel
        title="Đơn hàng toàn sàn"
        subtitle="Theo dõi đơn bán thường, đơn trúng đấu giá, thanh toán và giao hàng"
        icon={<ShoppingBag size={19} />}
      >
        <ManagementTable
          rows={data.orders}
          searchText={(row) => `${row.id} ${row.product} ${row.buyer} ${row.seller}`}
          searchPlaceholder="Tìm mã đơn, sản phẩm, buyer hoặc seller..."
          filters={[
            { key: 'type', label: 'Mọi hình thức bán', options: labelOptions(saleTypeLabels) },
            { key: 'status', label: 'Tất cả trạng thái đơn', options: labelOptions(orderLabels) },
            { key: 'payment', label: 'Mọi thanh toán', options: labelOptions(paymentLabels) },
          ]}
          columns={[
            {
              title: 'Đơn hàng',
              render: (row) => (
                <>
                  <p className="font-semibold">{row.id}</p>
                  <p>{row.product}</p>
                  <span className="text-slate-400">{row.createdAt}</span>
                </>
              ),
            },
            {
              title: 'Buyer / Seller',
              render: (row) => (
                <>
                  {row.buyer}
                  <p className="text-slate-500">{row.seller}</p>
                </>
              ),
            },
            {
              title: 'Loại / Tổng tiền',
              render: (row) => (
                <>
                  {saleTypeLabels[row.type]}
                  <p className="font-semibold">{formatMoney(row.total)}</p>
                </>
              ),
            },
            {
              title: 'Thanh toán',
              render: (row) => (
                <StatusBadge status={row.payment} label={paymentLabels[row.payment]} />
              ),
            },
            {
              title: 'Trạng thái đơn',
              render: (row) => <StatusBadge status={row.status} label={orderLabels[row.status]} />,
            },
            {
              title: 'Thao tác',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openDetail(row.id)}>
                    Chi tiết
                  </Button>
                  {['pending', 'confirmed'].includes(row.status) && (
                    <Button variant="danger" onClick={() => setCancelId(row.id)}>
                      Hủy đơn
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Panel>
      {params.get('order') && !detail && (
        <p role="status" className="text-sm text-slate-500">
          Không có đơn {params.get('order')} trong dữ liệu hiện tại.
        </p>
      )}
      <Popup isOpen={!!detail} onClose={closeDetail} title="Chi tiết đơn hàng" size="lg">
        {detail && (
          <div className="space-y-5">
            <DetailFields
              fields={[
                ['Mã đơn', detail.id],
                ['Sản phẩm', detail.product],
                ['Buyer', detail.buyer],
                ['Seller', detail.seller],
                ['Hình thức', saleTypeLabels[detail.type]],
                ['Tổng tiền', formatMoney(detail.total)],
                ['Thanh toán', paymentLabels[detail.payment]],
                ['Trạng thái đơn', orderLabels[detail.status]],
                ['Vận chuyển', detail.shipment],
                ['Ghi chú xử lý', detail.note],
              ]}
            />
            <Link
              className="inline-block text-sm font-semibold text-primary underline"
              to={`/admin/finance?order=${encodeURIComponent(detail.id)}`}
            >
              Xem giao dịch của đơn
            </Link>
          </div>
        )}
      </Popup>
      {cancelId && (
        <DecisionDialog
          key={cancelId}
          title="Hủy đơn hàng"
          description={`${cancelId}. Chỉ hủy đơn chưa giao cho vận chuyển. Nếu đã thanh toán, việc hủy đơn không tự động hoàn tiền; cần xử lý ở mục Hoàn tiền.`}
          onClose={() => setCancelId(null)}
          onConfirm={(reason) => {
            actions.updateCommerce({ entity: 'orders', id: cancelId, status: 'cancelled', reason });
            setCancelId(null);
          }}
        />
      )}
    </div>
  );
}
