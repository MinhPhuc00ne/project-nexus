import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Store } from 'lucide-react';
import Popup from '../Popup';
import { getSellerRequests } from '../../services/admin';
import type { PaginatedResult } from '../../types/admin.types';
import type { SellerUpgradeRequest } from '../../services/users';
import type { AdminTabProps } from './adminTypes';
import { Badge, Button, Panel } from './AdminUI';
import {
  DecisionDialog,
  DemoNotice,
  DetailFields,
  labelOptions,
  ManagementTable,
  StatusBadge,
} from './CommerceUI';
import type { ManagedStore } from './commerceTypes';

function ApprovedSellerDirectory() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<PaginatedResult<SellerUpgradeRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<SellerUpgradeRequest | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setResult(null);
    void getSellerRequests({ status: 'APPROVED', page, limit: 8 })
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách Seller.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, revision]);
  return (
    <Panel
      title="Seller đã được phê duyệt"
      subtitle="Hồ sơ thật từ hệ thống. Trạng thái phê duyệt không đồng nghĩa cửa hàng đang hoạt động."
      icon={<Store size={19} />}
      action={
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={14} /> Làm mới
        </Button>
      }
    >
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Đang tải danh sách Seller…
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </Button>
        </div>
      ) : (
        result && (
          <>
            <ManagementTable
              paginate={false}
              key={page}
              rows={result.items}
              searchPlaceholder="Tìm trong trang hồ sơ hiện tại..."
              searchText={(row) =>
                `${row.storeName} ${row.user?.fullName ?? ''} ${row.user?.email ?? ''} ${row.businessEmail ?? ''}`
              }
              columns={[
                {
                  title: 'Cửa hàng',
                  render: (row) => (
                    <>
                      <p className="font-semibold">{row.storeName}</p>
                      <span className="text-slate-400">{row.id}</span>
                    </>
                  ),
                },
                {
                  title: 'Chủ tài khoản',
                  render: (row) => (
                    <>
                      {row.user?.fullName ?? '—'}
                      <p className="text-slate-500">{row.user?.email ?? '—'}</p>
                    </>
                  ),
                },
                {
                  title: 'Liên hệ',
                  render: (row) => (
                    <>
                      {row.phone}
                      <p>{row.businessEmail ?? '—'}</p>
                    </>
                  ),
                },
                { title: 'Hồ sơ', render: () => <Badge tone="green">Đã duyệt</Badge> },
                {
                  title: 'Thao tác',
                  render: (row) => (
                    <Button variant="secondary" onClick={() => setDetail(row)}>
                      Xem cửa hàng
                    </Button>
                  ),
                },
              ]}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>
                Tổng {result.total} hồ sơ • Trang API {page}/{Math.max(1, result.totalPages)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Trang trước
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= result.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </>
        )
      )}
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Đình chỉ bán hàng trên dữ liệu thật chưa khả dụng. Màn này không dùng trạng thái bật/tắt
        Seller Mode để thay cho trạng thái đình chỉ.
      </p>
      <Popup
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Hồ sơ cửa hàng đã duyệt"
        size="lg"
      >
        {detail && (
          <div className="space-y-5">
            <DetailFields
              fields={[
                ['Tên cửa hàng', detail.storeName],
                ['Chủ tài khoản', detail.user?.fullName],
                ['Email tài khoản', detail.user?.email],
                ['Email kinh doanh', detail.businessEmail],
                ['Điện thoại', detail.phone],
                ['Mô tả cửa hàng', detail.storeDescription],
                [
                  'Ngày duyệt',
                  detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleDateString('vi-VN') : '—',
                ],
                ['Người duyệt', detail.reviewedBy?.fullName],
              ]}
            />
            <Link to="/admin/sellers" className="text-sm font-semibold text-primary underline">
              Đến hồ sơ phê duyệt Seller
            </Link>
          </div>
        )}
      </Popup>
    </Panel>
  );
}

export default function SellerStoreManagement({ data, actions }: AdminTabProps) {
  const [tab, setTab] = useState<'approved' | 'demo'>('approved');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ id: string; status: ManagedStore['status'] } | null>(
    null,
  );
  const detail = data.stores.find((item) => item.id === detailId);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Nguồn dữ liệu cửa hàng">
        <Button
          variant={tab === 'approved' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'approved'}
          onClick={() => setTab('approved')}
        >
          Seller đã duyệt từ hệ thống
        </Button>
        <Button
          variant={tab === 'demo' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'demo'}
          onClick={() => setTab('demo')}
        >
          Thử quản lý cửa hàng mẫu
        </Button>
      </div>
      {tab === 'approved' ? (
        <ApprovedSellerDirectory />
      ) : (
        <>
          <DemoNotice />
          <Panel
            title="Quản lý cửa hàng mẫu"
            subtitle="Xem thông tin và thử quy trình đình chỉ / khôi phục bán hàng"
            icon={<Store size={19} />}
          >
            <ManagementTable
              rows={data.stores}
              searchText={(row) => `${row.id} ${row.name} ${row.owner} ${row.email}`}
              filters={[
                {
                  key: 'status',
                  label: 'Tất cả trạng thái',
                  options: labelOptions({
                    active: 'Đang hoạt động',
                    suspended: 'Đình chỉ bán hàng',
                  }),
                },
              ]}
              columns={[
                {
                  title: 'Cửa hàng',
                  render: (row) => (
                    <>
                      <p className="font-semibold">{row.name}</p>
                      <span className="text-slate-400">{row.id}</span>
                    </>
                  ),
                },
                { title: 'Chủ cửa hàng', render: (row) => row.owner },
                {
                  title: 'Liên hệ',
                  render: (row) => (
                    <>
                      {row.email}
                      <p>{row.phone}</p>
                    </>
                  ),
                },
                {
                  title: 'Trạng thái',
                  render: (row) => (
                    <StatusBadge
                      status={row.status}
                      label={row.status === 'active' ? 'Đang hoạt động' : 'Đình chỉ bán hàng'}
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
                      <Button
                        variant={row.status === 'active' ? 'danger' : 'secondary'}
                        onClick={() =>
                          setDecision({
                            id: row.id,
                            status: row.status === 'active' ? 'suspended' : 'active',
                          })
                        }
                      >
                        {row.status === 'active' ? 'Đình chỉ' : 'Khôi phục'}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </Panel>
        </>
      )}
      <Popup
        isOpen={!!detail && tab === 'demo'}
        onClose={() => setDetailId(null)}
        title="Thông tin cửa hàng mẫu"
        size="lg"
      >
        {detail && (
          <DetailFields
            fields={[
              ['Cửa hàng', detail.name],
              ['Chủ cửa hàng', detail.owner],
              ['Email', detail.email],
              ['Điện thoại', detail.phone],
              ['Trạng thái', detail.status === 'active' ? 'Đang hoạt động' : 'Đình chỉ bán hàng'],
              ['Ghi chú xử lý', detail.note],
            ]}
          />
        )}
      </Popup>
      {decision && (
        <DecisionDialog
          key={decision.id}
          title={decision.status === 'suspended' ? 'Đình chỉ bán hàng' : 'Khôi phục bán hàng'}
          description={`${decision.id}. Thao tác chỉ cập nhật cửa hàng mẫu, không khóa tài khoản Seller thật.`}
          onClose={() => setDecision(null)}
          onConfirm={(reason) => {
            actions.updateCommerce({
              entity: 'stores',
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
