import { useCallback, useState, type FormEvent, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getSellerOrders } from '../../services/sellerOrders';
import type { SellerOrderStatus } from '../../types/order.types';
import useProductResource from '../../components/productDetail/useProductResource';
import { useSellerSession } from '../../components/seller/SellerSession';
import {
  Badge,
  EmptyState,
  PageHeading,
  Panel,
  SellerButton,
  SellerLink,
} from '../../components/seller/SellerUI';
import SellerResourceState from '../../components/seller/SellerResourceState';
import SellerOrderActions from '../../components/seller/SellerOrderActions';
import SellerPagination from '../../components/seller/SellerPagination';
import { sellerOrderLabels } from '../../components/seller/orderPresentation';
import { financeDate, financeMoney } from '../../components/seller/financeFormat';

export default function SellerOrdersPage(): ReactElement {
  const user = useSellerSession();
  const { token } = useAuth();
  return <OrdersWorkspace key={`${user.id}:${token}`} />;
}
function OrdersWorkspace(): ReactElement {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SellerOrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = (): void => setRevision((value) => value + 1);
  const load = useCallback(() => {
    void revision;
    return getSellerOrders({ page, limit: 10, status: status || undefined, search });
  }, [page, status, search, revision]);
  const resource = useProductResource(load);
  function submit(event: FormEvent): void {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  }
  return (
    <div className="space-y-5">
      <PageHeading
        title="Đơn hàng & vận chuyển GHN"
        description="Xác nhận đơn, chuẩn bị kiện hàng và theo dõi vận đơn của gian hàng."
        actions={
          <>
            <SellerLink secondary to="/seller/shipping">
              Tính phí vận chuyển
            </SellerLink>
            <SellerButton secondary onClick={refresh} disabled={resource.loading}>
              <ReloadOutlined />
              Làm mới
            </SellerButton>
          </>
        }
      />
      <Panel
        title="Đơn bán của gian hàng"
        subtitle="Tìm theo mã đơn, tên hoặc số điện thoại người mua"
      >
        <form onSubmit={submit} className="mb-5 flex flex-wrap gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <SearchOutlined className="text-slate-400" />
            <input
              className="min-w-0 flex-1 text-sm outline-none"
              aria-label="Tìm đơn hàng"
              placeholder="Mã đơn, tên hoặc số điện thoại..."
              maxLength={150}
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Trạng thái đơn hàng"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as SellerOrderStatus | '');
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(sellerOrderLabels).map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
          <SellerButton type="submit">Tìm kiếm</SellerButton>
        </form>
        <SellerResourceState
          loading={resource.loading}
          error={resource.error}
          retry={resource.retry}
        >
          {resource.data && (
            <>
              <div className="mb-5 flex flex-wrap gap-2 text-xs text-blue-800">
                {[
                  ['Tất cả', resource.data.counters.all],
                  ['Chờ xác nhận', resource.data.counters.paid],
                  ['Chờ bàn giao', resource.data.counters.preparing],
                  ['Đang giao', resource.data.counters.shipping],
                ].map(([label, count]) => (
                  <span className="rounded-lg bg-blue-50 px-3 py-2" key={label}>
                    {label}: <b>{count}</b>
                  </span>
                ))}
              </div>
              {resource.data.items.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="border-y border-blue-100 bg-blue-50/60 text-slate-500">
                      <tr>
                        {[
                          'Đơn hàng / Người mua',
                          'Sản phẩm',
                          'Thanh toán',
                          'Trạng thái',
                          'Thao tác',
                        ].map((label) => (
                          <th key={label} className="px-3 py-3 font-medium">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resource.data.items.map((order) => (
                        <tr key={order.id} className="align-top hover:bg-blue-50/30">
                          <td className="px-3 py-4">
                            <Link
                              className="font-semibold text-blue-700"
                              to={`/seller/orders/${order.id}`}
                            >
                              #{order.id.slice(0, 8)}
                            </Link>
                            <p className="mt-2 font-medium">{order.buyer.fullName}</p>
                            <p className="mt-1 text-slate-500">
                              {order.buyer.phoneNumber || 'Chưa có SĐT'}
                            </p>
                            <small className="mt-2 block text-slate-400">
                              {financeDate(order.createdAt)}
                            </small>
                          </td>
                          <td className="max-w-[240px] px-3 py-4">
                            <ul className="space-y-2">
                              {order.items.map((item) => (
                                <li key={item.id} className="flex items-center gap-2">
                                  {item.thumbnail && (
                                    <img
                                      className="size-10 shrink-0 rounded object-contain"
                                      src={item.thumbnail}
                                      alt=""
                                    />
                                  )}
                                  <span className="break-words leading-5">
                                    {item.title} × {item.quantity}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            {!order.items.length && (
                              <span className="text-slate-500">Chưa có sản phẩm</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 font-semibold text-blue-700">
                            {financeMoney(order.totalAmount)}
                          </td>
                          <td className="px-3 py-4">
                            <Badge
                              tone={
                                order.status === 'CANCELLED' || order.status === 'REFUNDED'
                                  ? 'gray'
                                  : order.status === 'PAID' || order.status === 'PREPARING'
                                    ? 'amber'
                                    : 'blue'
                              }
                            >
                              {sellerOrderLabels[order.status] || order.status}
                            </Badge>
                            {order.shipment?.waybillCode && (
                              <p className="mt-2 break-all text-slate-500">
                                Mã lưu trên đơn: {order.shipment.waybillCode}
                              </p>
                            )}
                          </td>
                          <td className="min-w-[180px] px-3 py-4">
                            <SellerOrderActions
                              id={order.id}
                              status={order.status}
                              hasShipment={!!order.shipment}
                              onChanged={refresh}
                            />
                            <Link
                              className="mt-3 inline-block text-blue-600 hover:underline"
                              to={`/seller/orders/${order.id}`}
                            >
                              Xem chi tiết
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Không có đơn hàng phù hợp"
                  description="Đơn bán sẽ xuất hiện khi có người mua đặt hàng."
                />
              )}
              <SellerPagination
                page={resource.data.page}
                total={resource.data.total}
                totalPages={resource.data.totalPages}
                onPage={setPage}
              />
            </>
          )}
        </SellerResourceState>
      </Panel>
    </div>
  );
}
