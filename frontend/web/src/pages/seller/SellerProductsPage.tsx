import { useState } from 'react';
import { InboxOutlined, PlusOutlined, SearchOutlined, ShopOutlined } from '@ant-design/icons';
import {
  EmptyState,
  PageHeading,
  Panel,
  SellerLink,
  StatCard,
} from '../../components/seller/SellerUI';

export default function SellerProductsPage({ inventory = false }: { inventory?: boolean }) {
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  return (
    <div className="space-y-6">
      <PageHeading
        title={inventory ? 'Kho hàng & sản phẩm' : 'Quản lý sản phẩm'}
        description="Quản lý sản phẩm đăng bán và thông tin tồn kho của gian hàng."
        actions={
          <SellerLink to="/seller/products/new">
            <PlusOutlined />
            Đăng bán sản phẩm
          </SellerLink>
        }
      />
      <div
        role="status"
        className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900"
      >
        Đang chờ API danh sách sản phẩm và kho hàng từ BE. Chưa có dữ liệu từ hệ thống; các thao tác
        đăng bán, cập nhật và xóa sản phẩm chưa được kích hoạt.
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Sản phẩm của gian hàng"
          value="—"
          detail="Đang chờ API sản phẩm"
          icon={<ShopOutlined />}
        />
        <StatCard
          label="Sản phẩm đang bán"
          value="—"
          detail="Đang chờ dữ liệu trạng thái"
          icon={<InboxOutlined />}
        />
        <StatCard
          label="Tồn kho khả dụng"
          value="—"
          detail="Đang chờ API kho hàng"
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
        subtitle="Dữ liệu sẽ được tải từ API của backend"
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
            <option value="ACTIVE">Đang bán</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="INACTIVE">Ngừng bán</option>
          </select>
        </div>
        <EmptyState
          title="Đang chờ kết nối API"
          description={
            inventory
              ? 'Số lượng khả dụng và nhật ký tồn kho sẽ được hiển thị khi có API kho hàng.'
              : 'Danh sách sản phẩm sẽ hiển thị khi BE cung cấp API. Bạn có thể chuẩn bị thông tin trên form đăng bán.'
          }
          action={
            <SellerLink to="/seller/products/new">
              <PlusOutlined />
              Đăng bán sản phẩm
            </SellerLink>
          }
        />
      </Panel>
    </div>
  );
}
