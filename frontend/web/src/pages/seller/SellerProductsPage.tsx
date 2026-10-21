import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  PictureOutlined,
  EditOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Badge,
  EmptyState,
  PageHeading,
  Panel,
  SellerButton,
  SellerLink,
  StatCard,
} from '../../components/seller/SellerUI';
import useSellerProducts from '../../components/seller/useSellerProducts';
import Popup from '../../components/Popup';

const statuses = { ACTIVE: 'Đang bán', INACTIVE: 'Ngừng bán', DRAFT: 'Bản nháp' };
export default function SellerProductsPage({ inventory = false }: { inventory?: boolean }) {
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const {
    products,
    loading,
    error,
    reload,
    hide,
    pendingId,
    actionError,
    notice,
    selectedProduct,
    closeHide,
    confirmHide,
  } = useSellerProducts();
  const location = useLocation();
  const updated = (location.state as { updatedProduct?: { title: string } } | null)?.updatedProduct;
  const published = (location.state as { publishedProduct?: { id: string; title: string } } | null)
    ?.publishedProduct;
  const filtered = products.filter(
    (product) =>
      (status === 'all' || product.status === status) &&
      product.title.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN')),
  );
  const available = products.reduce((sum, product) => sum + product.availableQty, 0);
  const unavailable = loading || Boolean(error);
  return (
    <div className="space-y-6">
      <PageHeading
        title={inventory ? 'Kho hàng & sản phẩm' : 'Quản lý sản phẩm'}
        description="Sản phẩm và số lượng tồn kho được tải từ hệ thống."
        actions={
          <SellerLink to="/seller/products/new">
            <PlusOutlined /> Đăng bán sản phẩm
          </SellerLink>
        }
      />
      {(notice || updated) && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice || `Đã cập nhật sản phẩm ${updated?.title}.`}
        </p>
      )}
      {actionError && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </p>
      )}
      {published?.id && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          Đã đăng bán sản phẩm {published.title} thành công.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Sản phẩm của gian hàng"
          value={unavailable ? '—' : products.length}
          detail="Tổng số sản phẩm"
          icon={<ShopOutlined />}
        />
        <StatCard
          label="Sản phẩm đang bán"
          value={
            unavailable ? '—' : products.filter((product) => product.status === 'ACTIVE').length
          }
          detail="Trạng thái đang bán"
          icon={<InboxOutlined />}
        />
        <StatCard
          label="Tồn kho khả dụng"
          value={unavailable ? '—' : available.toLocaleString('vi-VN')}
          detail="Tổng số lượng có thể bán"
          icon={<InboxOutlined />}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <SellerLink to="/seller/products" secondary={inventory}>
          Sản phẩm đăng bán
        </SellerLink>
        <SellerLink to="/seller/inventory" secondary={!inventory}>
          Kho hàng
        </SellerLink>
      </div>
      <Panel
        title={inventory ? 'Tồn kho theo sản phẩm' : 'Danh sách sản phẩm'}
        action={
          <SellerButton secondary disabled={loading} onClick={reload}>
            <ReloadOutlined /> Làm mới
          </SellerButton>
        }
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-400">
            <SearchOutlined />
            <input
              aria-label="Tìm sản phẩm của gian hàng"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên sản phẩm…"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none"
            />
          </label>
          <select
            aria-label="Trạng thái sản phẩm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p role="status" className="p-8 text-center text-sm text-slate-500">
            Đang tải sản phẩm…
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <SellerButton secondary onClick={reload}>
              Thử lại
            </SellerButton>
          </div>
        ) : !filtered.length ? (
          <EmptyState
            title={products.length ? 'Không có sản phẩm phù hợp' : 'Chưa có sản phẩm'}
            description={
              products.length
                ? 'Thử đổi từ khóa hoặc trạng thái lọc.'
                : 'Đăng bán sản phẩm đầu tiên để bắt đầu quản lý gian hàng.'
            }
            action={
              !products.length ? (
                <SellerLink to="/seller/products/new">
                  <PlusOutlined /> Đăng bán sản phẩm
                </SellerLink>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Sản phẩm',
                    'Giá bán',
                    'Trạng thái',
                    'Tổng tồn kho',
                    'Khả dụng',
                    'Thao tác',
                  ].map((label) => (
                    <th key={label} scope="col" className="px-3 py-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        {product.images[0]?.imageUrl ? (
                          <img
                            src={product.images[0].imageUrl}
                            alt={product.title}
                            className="h-14 w-14 rounded-lg border border-slate-100 object-contain"
                          />
                        ) : (
                          <PictureOutlined className="p-3 text-2xl text-slate-300" />
                        )}
                        <div>
                          <Link
                            to={`/product/${product.id}`}
                            className="font-semibold text-blue-700 hover:underline"
                          >
                            {product.title}
                          </Link>
                          <p className="mt-1 text-slate-400">{product.category?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 font-semibold">
                      {Number(product.basePrice).toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="px-3 py-4">
                      <Badge tone={product.status === 'ACTIVE' ? 'green' : 'gray'}>
                        {statuses[product.status] ?? product.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-4">{product.totalQty}</td>
                    <td className="px-3 py-4">{product.availableQty}</td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <SellerLink to={`/seller/products/${product.id}/edit`} secondary>
                          <EditOutlined /> Sửa
                        </SellerLink>
                        <SellerButton
                          secondary
                          disabled={Boolean(pendingId) || product.status === 'INACTIVE'}
                          onClick={() => void hide(product)}
                        >
                          <StopOutlined />{' '}
                          {pendingId === product.id ? 'Đang ngừng bán…' : 'Ngừng bán'}
                        </SellerButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Popup
        isOpen={Boolean(selectedProduct)}
        onClose={closeHide}
        title="Xác nhận ngừng bán sản phẩm"
        closeOnOverlay={!pendingId}
        closeOnEsc={!pendingId}
        showCloseButton={!pendingId}
        footer={
          <>
            <SellerButton secondary disabled={Boolean(pendingId)} onClick={closeHide}>
              Hủy
            </SellerButton>
            <SellerButton disabled={Boolean(pendingId)} onClick={() => void confirmHide()}>
              <StopOutlined />
              {pendingId ? 'Đang ngừng bán…' : 'Xác nhận ngừng bán'}
            </SellerButton>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          Bạn có muốn ngừng bán sản phẩm{' '}
          <strong className="break-words">{selectedProduct?.title}</strong>?
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Sản phẩm sẽ chuyển sang trạng thái ngừng bán và vẫn được giữ trong danh sách quản lý.
        </p>
        {pendingId && (
          <p role="status" className="mt-3 text-sm text-blue-600">
            Đang xử lý yêu cầu…
          </p>
        )}
        {actionError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {actionError}
          </p>
        )}
      </Popup>
    </div>
  );
}
