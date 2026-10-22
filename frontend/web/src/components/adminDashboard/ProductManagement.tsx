import { useState } from 'react';
import { Package } from 'lucide-react';
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
import { productLabels, saleTypeLabels, type ProductStatus } from './commerceTypes';

export default function ProductManagement({ data, actions }: AdminTabProps) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{
    id: string;
    status: ProductStatus;
    title: string;
  } | null>(null);
  const detail = data.products.find((item) => item.id === detailId);
  return (
    <div className="space-y-5">
      <DemoNotice />
      <Panel
        title="Sản phẩm của Seller"
        subtitle="Duyệt nội dung, kiểm tra thông tin và ẩn sản phẩm vi phạm"
        icon={<Package size={19} />}
      >
        <ManagementTable
          rows={data.products}
          searchText={(row) => `${row.id} ${row.name} ${row.seller} ${row.category}`}
          searchPlaceholder="Tìm mã sản phẩm, tên, seller hoặc danh mục..."
          filters={[
            { key: 'status', label: 'Tất cả trạng thái', options: labelOptions(productLabels) },
            { key: 'type', label: 'Mọi hình thức bán', options: labelOptions(saleTypeLabels) },
          ]}
          columns={[
            {
              title: 'Sản phẩm',
              render: (row) => (
                <>
                  <p className="font-semibold">{row.name}</p>
                  <span className="text-slate-400">
                    {row.id} • {row.category}
                  </span>
                </>
              ),
            },
            { title: 'Seller', render: (row) => row.seller },
            { title: 'Hình thức', render: (row) => saleTypeLabels[row.type] },
            { title: 'Giá / khởi điểm', render: (row) => formatMoney(row.price) },
            {
              title: 'Trạng thái',
              render: (row) => (
                <StatusBadge status={row.status} label={productLabels[row.status]} />
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
                    <>
                      <Button
                        onClick={() =>
                          setDecision({ id: row.id, status: 'active', title: 'Duyệt sản phẩm' })
                        }
                      >
                        Duyệt
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() =>
                          setDecision({ id: row.id, status: 'rejected', title: 'Từ chối sản phẩm' })
                        }
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  {row.status === 'active' && (
                    <Button
                      variant="danger"
                      onClick={() =>
                        setDecision({ id: row.id, status: 'hidden', title: 'Ẩn sản phẩm' })
                      }
                    >
                      Ẩn
                    </Button>
                  )}
                  {row.status === 'hidden' && (
                    <Button
                      onClick={() =>
                        setDecision({ id: row.id, status: 'active', title: 'Hiện lại sản phẩm' })
                      }
                    >
                      Hiện lại
                    </Button>
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
        title="Chi tiết sản phẩm"
        size="lg"
      >
        {detail && (
          <DetailFields
            fields={[
              ['Mã sản phẩm', detail.id],
              ['Tên sản phẩm', detail.name],
              ['Seller', detail.seller],
              ['Danh mục', detail.category],
              ['Hình thức bán', saleTypeLabels[detail.type]],
              ['Giá / giá khởi điểm', formatMoney(detail.price)],
              ['Trạng thái', productLabels[detail.status]],
              ['Mô tả', detail.description],
              ['Ghi chú kiểm duyệt', detail.note],
            ]}
          />
        )}
      </Popup>
      {decision && (
        <DecisionDialog
          key={`${decision.id}-${decision.status}`}
          title={decision.title}
          description={`${decision.id}. Quyết định chỉ áp dụng cho dữ liệu mẫu, không thay đổi lịch đấu giá.`}
          requireReason={decision.status !== 'active'}
          onClose={() => setDecision(null)}
          onConfirm={(reason) => {
            actions.updateCommerce({
              entity: 'products',
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
