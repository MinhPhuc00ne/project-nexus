import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox as InboxOutlined } from 'lucide-react';
import {
  Plus as PlusOutlined,
  RefreshCw as ReloadOutlined,
  Search as SearchOutlined,
  Store as ShopOutlined,
  Image as PictureOutlined,
  Pencil as EditOutlined,
  CircleStop as StopOutlined,
  Zap as ThunderboltOutlined,
  Tag as TagOutlined,
} from 'lucide-react';
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
import { useSellerSession } from '../../components/seller/SellerSession';
import { useToast } from '../../components/ToastNotification';
import {
  computeEffectiveSale,
  saleConfigFromApi,
  type ProductSaleConfig,
} from '../../services/productExtras';
import { updateProductSale, type SellerProduct } from '../../services/sellerProducts';

const statuses = { ACTIVE: 'Đang bán', INACTIVE: 'Ngừng bán', DRAFT: 'Bản nháp' };

export default function SellerProductsPage({ inventory = false }: { inventory?: boolean }) {
  const user = useSellerSession();
  const toast = useToast();
  const canManage = user.isSellerActive && !user.isShopSuspended;
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [saleSaving, setSaleSaving] = useState(false);
  const [saleModalProduct, setSaleModalProduct] = useState<SellerProduct | null>(null);
  const [saleDraft, setSaleDraft] = useState<ProductSaleConfig>({
    enabled: true,
    discountPercent: 15,
    salePrice: 0,
    label: 'FLASH SALE',
  });

  const {
    products,
    loading,
    error,
    reload,
    hide,
    pendingId,
    actionError,
    selectedProduct,
    closeHide,
    confirmHide,
  } = useSellerProducts();

  const filtered = products.filter(
    (product) =>
      (status === 'all' || product.status === status) &&
      product.title.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN')),
  );
  const available = products.reduce((sum, product) => sum + product.availableQty, 0);
  const onSaleCount = products.filter((p) => {
    return computeEffectiveSale(
      Number(p.basePrice),
      saleConfigFromApi(p.basePrice, p.salePrice, p.saleStartsAt, p.saleEndsAt),
    ).isOnSale;
  }).length;
  const unavailable = loading || Boolean(error);
  const stopping = selectedProduct?.status === 'ACTIVE';

  const openSaleModal = (product: SellerProduct) => {
    const base = Number(product.basePrice) || 0;
    const existingSale = saleConfigFromApi(
      base,
      product.salePrice,
      product.saleStartsAt,
      product.saleEndsAt,
    );
    const pct = existingSale?.discountPercent || 15;
    setSaleDraft({
      enabled: existingSale ? existingSale.enabled : true,
      discountPercent: pct,
      salePrice:
        existingSale?.salePrice && existingSale.salePrice > 0
          ? existingSale.salePrice
          : Math.max(1000, Math.round((base * (100 - pct)) / 100)),
      label: existingSale?.label || 'FLASH SALE',
    });
    setSaleModalProduct(product);
  };

  const handleSaveSaleModal = async () => {
    if (!saleModalProduct) return;
    const base = Number(saleModalProduct.basePrice) || 0;
    const pct = Math.max(1, Math.min(95, Number(saleDraft.discountPercent) || 10));
    const computedSalePrice =
      saleDraft.salePrice > 0 && saleDraft.salePrice < base
        ? Math.round(saleDraft.salePrice)
        : Math.max(1000, Math.round((base * (100 - pct)) / 100));

    setSaleSaving(true);
    try {
      await updateProductSale(saleModalProduct.id, {
        salePrice: saleDraft.enabled ? computedSalePrice : null,
      });
      toast.success(
        saleDraft.enabled
          ? `Đã bật chương trình Sale (-${pct}%) cho "${saleModalProduct.title}".`
          : `Đã tắt chương trình Sale cho "${saleModalProduct.title}".`,
      );
      setSaleModalProduct(null);
      reload();
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'KhÃ´ng thá»ƒ cáº­p nháº­t chÆ°Æ¡ng trÃ¬nh Sale.',
      );
    } finally {
      setSaleSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title={inventory ? 'Kho hàng & sản phẩm' : 'Quản lý sản phẩm & Khuyến mãi Sale'}
        description="Quản lý danh sách sản phẩm, phân loại tùy chọn (màu, size) và chương trình giảm giá Sale."
        actions={
          <SellerLink to="/seller/products/new">
            <PlusOutlined /> Đăng bán sản phẩm
          </SellerLink>
        }
      />
      <div className="grid gap-4 sm:grid-cols-4">
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
          label="Đang chạy Sale"
          value={unavailable ? '—' : onSaleCount}
          detail="Sản phẩm đang giảm giá"
          icon={<ThunderboltOutlined />}
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
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Sản phẩm & Phân loại',
                    'Giá bán / Sale',
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
                {filtered.map((product) => {
                  const sale = computeEffectiveSale(
                    Number(product.basePrice),
                    saleConfigFromApi(
                      product.basePrice,
                      product.salePrice,
                      product.saleStartsAt,
                      product.saleEndsAt,
                    ),
                  );
                  const options = product.options ?? [];

                  return (
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
                          <div className="min-w-0">
                            <Link
                              to={`/product/${product.id}`}
                              className="font-semibold text-blue-700 hover:underline"
                            >
                              {product.title}
                            </Link>
                            <p className="mt-1 text-slate-400">{product.category?.name}</p>
                            {options.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {options.map((opt) => (
                                  <span
                                    key={opt.id ?? opt.name}
                                    className="inline-flex items-center gap-1 rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
                                  >
                                    <TagOutlined /> {opt.name}: {opt.values.join(', ')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        {sale.isOnSale ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-blue-700">
                                {sale.effectivePrice.toLocaleString('vi-VN')} ₫
                              </span>
                              <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                -{sale.discountPercent}%
                              </span>
                            </div>
                            <span className="text-[11px] line-through text-slate-400">
                              {sale.originalPrice.toLocaleString('vi-VN')} ₫
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-800">
                            {Number(product.basePrice).toLocaleString('vi-VN')} ₫
                          </span>
                        )}
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
                          {canManage && (
                            <SellerButton secondary onClick={() => openSaleModal(product)}>
                              <ThunderboltOutlined /> Sale
                            </SellerButton>
                          )}
                          {canManage && (
                            <SellerLink to={`/seller/products/${product.id}/edit`} secondary>
                              <EditOutlined /> Sửa
                            </SellerLink>
                          )}
                          <SellerButton
                            secondary
                            disabled={Boolean(pendingId) || !canManage}
                            onClick={() => void hide(product)}
                          >
                            <StopOutlined />{' '}
                            {pendingId === product.id
                              ? 'Đang xử lý…'
                              : product.status === 'ACTIVE'
                                ? 'Ngừng bán'
                                : 'Bán lại'}
                          </SellerButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Modal thiết lập nhanh chương trình Sale cho sản phẩm */}
      <Popup
        isOpen={Boolean(saleModalProduct)}
        onClose={() => setSaleModalProduct(null)}
        title={`Thiết lập Khuyến mãi / Sale: ${saleModalProduct?.title ?? ''}`}
        footer={
          <>
            <SellerButton secondary onClick={() => setSaleModalProduct(null)}>
              Hủy
            </SellerButton>
            <SellerButton disabled={saleSaving} onClick={() => void handleSaveSaleModal()}>
              <ThunderboltOutlined /> {saleSaving ? 'Đang lưu…' : 'Lưu chương trình Sale'}
            </SellerButton>
          </>
        }
      >
        {saleModalProduct && (
          <div className="space-y-4 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex justify-between items-center">
              <span className="text-slate-600">Giá bán gốc hiện tại:</span>
              <strong className="text-sm text-slate-900">
                {Number(saleModalProduct.basePrice).toLocaleString('vi-VN')} ₫
              </strong>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3 cursor-pointer">
              <span className="font-bold text-[#1c3973]">
                Kích hoạt chương trình Giảm giá (Sale) cho sản phẩm này
              </span>
              <input
                type="checkbox"
                checked={saleDraft.enabled}
                onChange={(e) => setSaleDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 accent-blue-600"
              />
            </label>

            {saleDraft.enabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="font-semibold text-slate-700">
                  Mức giảm giá (%)
                  <input
                    type="number"
                    min={1}
                    max={95}
                    value={saleDraft.discountPercent}
                    onChange={(e) => {
                      const pct = Math.max(1, Math.min(95, Number(e.target.value) || 0));
                      const base = Number(saleModalProduct.basePrice) || 0;
                      setSaleDraft((prev) => ({
                        ...prev,
                        discountPercent: pct,
                        salePrice: Math.max(1000, Math.round((base * (100 - pct)) / 100)),
                      }));
                    }}
                    className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-600"
                  />
                </label>

                <label className="font-semibold text-slate-700">
                  Giá khuyến mãi sau giảm (VNĐ)
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={saleDraft.salePrice}
                    onChange={(e) => {
                      const nextSale = Number(e.target.value) || 0;
                      const base = Number(saleModalProduct.basePrice) || 0;
                      const pct =
                        base > 0 && nextSale > 0 && nextSale < base
                          ? Math.max(1, Math.min(95, Math.round(((base - nextSale) / base) * 100)))
                          : saleDraft.discountPercent;
                      setSaleDraft((prev) => ({
                        ...prev,
                        salePrice: nextSale,
                        discountPercent: pct,
                      }));
                    }}
                    className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-600"
                  />
                </label>

                <label className="sm:col-span-2 font-semibold text-slate-700">
                  Nhãn hiển thị
                  <select
                    value={saleDraft.label || 'FLASH SALE'}
                    onChange={(e) => setSaleDraft((prev) => ({ ...prev, label: e.target.value }))}
                    className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="FLASH SALE">FLASH SALE</option>
                    <option value="GIẢM SỐC">GIẢM SỐC</option>
                    <option value="ƯU ĐÃI ĐẶC BIỆT">ƯU ĐÃI ĐẶC BIỆT</option>
                    <option value="XẢ KHO">XẢ KHO</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        )}
      </Popup>

      <Popup
        isOpen={Boolean(selectedProduct)}
        onClose={closeHide}
        title={stopping ? 'Xác nhận ngừng bán sản phẩm' : 'Xác nhận bán lại sản phẩm'}
        closeOnOverlay={!pendingId}
        closeOnEsc={!pendingId}
        showCloseButton={!pendingId}
        footer={
          <>
            <SellerButton secondary disabled={Boolean(pendingId)} onClick={closeHide}>
              Hủy
            </SellerButton>
            <SellerButton
              disabled={Boolean(pendingId) || !canManage}
              onClick={() => void confirmHide()}
            >
              <StopOutlined />
              {pendingId ? 'Đang xử lý…' : stopping ? 'Xác nhận ngừng bán' : 'Xác nhận bán lại'}
            </SellerButton>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          Bạn có muốn {stopping ? 'ngừng bán' : 'bán lại'} sản phẩm{' '}
          <strong className="break-words">{selectedProduct?.title}</strong>?
        </p>
        <p className="mt-3 text-sm text-slate-500">
          {stopping
            ? 'Sản phẩm sẽ chuyển sang trạng thái ngừng bán và vẫn được giữ trong danh sách quản lý.'
            : 'Sản phẩm sẽ được công khai trở lại cho người mua.'}
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
