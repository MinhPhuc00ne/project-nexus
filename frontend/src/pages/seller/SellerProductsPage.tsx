import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { getIntlLocale } from '../../i18n/config';
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

const statusKeys = {
  ACTIVE: 'products.statuses.ACTIVE',
  INACTIVE: 'products.statuses.INACTIVE',
  DRAFT: 'products.statuses.DRAFT',
} as const;

export default function SellerProductsPage({ inventory = false }: { inventory?: boolean }) {
  const { t, i18n } = useTranslation('seller');
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
          ? t('products.saleToastOn', { pct, title: saleModalProduct.title })
          : t('products.saleToastOff', { title: saleModalProduct.title }),
      );
      setSaleModalProduct(null);
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t('products.saleToastErr'));
    } finally {
      setSaleSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title={inventory ? t('products.inventoryTitle') : t('products.manageTitle')}
        description={t('products.pageDesc')}
        actions={
          <SellerLink to="/seller/products/new">
            <PlusOutlined /> {t('products.publishNew')}
          </SellerLink>
        }
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label={t('products.statTotal')}
          value={unavailable ? '—' : products.length}
          detail={t('products.statTotalDetail')}
          icon={<ShopOutlined />}
        />
        <StatCard
          label={t('products.statActive')}
          value={
            unavailable ? '—' : products.filter((product) => product.status === 'ACTIVE').length
          }
          detail={t('products.statActiveDetail')}
          icon={<InboxOutlined />}
        />
        <StatCard
          label={t('products.statOnSale')}
          value={unavailable ? '—' : onSaleCount}
          detail={t('products.statOnSaleDetail')}
          icon={<ThunderboltOutlined />}
        />
        <StatCard
          label={t('products.statStock')}
          value={unavailable ? '—' : available.toLocaleString(getIntlLocale(i18n.language))}
          detail={t('products.statStockDetail')}
          icon={<InboxOutlined />}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <SellerLink to="/seller/products" secondary={inventory}>
          {t('products.tabProducts')}
        </SellerLink>
        <SellerLink to="/seller/inventory" secondary={!inventory}>
          {t('products.tabInventory')}
        </SellerLink>
      </div>
      <Panel
        title={inventory ? t('products.panelInventory') : t('products.panelList')}
        action={
          <SellerButton secondary disabled={loading} onClick={reload}>
            <ReloadOutlined /> {t('products.refresh')}
          </SellerButton>
        }
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-400">
            <SearchOutlined />
            <input
              aria-label={t('products.searchAria')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('products.searchPlaceholder')}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none"
            />
          </label>
          <select
            aria-label={t('products.statusAria')}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600"
          >
            <option value="all">{t('products.allStatuses')}</option>
            {Object.entries(statusKeys).map(([value, labelKey]) => (
              <option key={value} value={value}>
                {t(labelKey)}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p role="status" className="p-8 text-center text-sm text-slate-500">
            {t('products.loading')}
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <SellerButton secondary onClick={reload}>
              {t('products.retry')}
            </SellerButton>
          </div>
        ) : !filtered.length ? (
          <EmptyState
            title={products.length ? t('products.emptyMatchTitle') : t('products.emptyTitle')}
            description={products.length ? t('products.emptyMatchDesc') : t('products.emptyDesc')}
            action={
              !products.length ? (
                <SellerLink to="/seller/products/new">
                  <PlusOutlined /> {t('products.publishNew')}
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
                    t('products.cols.productVariants'),
                    t('products.cols.priceSale'),
                    t('products.cols.status'),
                    t('products.cols.totalQty'),
                    t('products.cols.availableQty'),
                    t('products.cols.actions'),
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
                                {formatCurrency(sale.effectivePrice)}
                              </span>
                              <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                -{sale.discountPercent}%
                              </span>
                            </div>
                            <span className="text-[11px] line-through text-slate-400">
                              {formatCurrency(sale.originalPrice)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(Number(product.basePrice))}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <Badge tone={product.status === 'ACTIVE' ? 'green' : 'gray'}>
                          {statusKeys[product.status]
                            ? t(statusKeys[product.status])
                            : product.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-4">{product.totalQty}</td>
                      <td className="px-3 py-4">{product.availableQty}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          {canManage && (
                            <SellerButton secondary onClick={() => openSaleModal(product)}>
                              <ThunderboltOutlined /> {t('products.saleBtn')}
                            </SellerButton>
                          )}
                          {canManage && (
                            <SellerLink to={`/seller/products/${product.id}/edit`} secondary>
                              <EditOutlined /> {t('products.editBtn')}
                            </SellerLink>
                          )}
                          <SellerButton
                            secondary
                            disabled={Boolean(pendingId) || !canManage}
                            onClick={() => void hide(product)}
                          >
                            <StopOutlined />{' '}
                            {pendingId === product.id
                              ? t('products.processing')
                              : product.status === 'ACTIVE'
                                ? t('products.stopSelling')
                                : t('products.relist')}
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
        title={t('products.saleModal.title', { title: saleModalProduct?.title ?? '' })}
        footer={
          <>
            <SellerButton secondary onClick={() => setSaleModalProduct(null)}>
              {t('products.saleModal.cancel')}
            </SellerButton>
            <SellerButton disabled={saleSaving} onClick={() => void handleSaveSaleModal()}>
              <ThunderboltOutlined />{' '}
              {saleSaving ? t('products.saleModal.saving') : t('products.saleModal.save')}
            </SellerButton>
          </>
        }
      >
        {saleModalProduct && (
          <div className="space-y-4 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex justify-between items-center">
              <span className="text-slate-600">{t('products.saleModal.basePriceLabel')}</span>
              <strong className="text-sm text-slate-900">
                {formatCurrency(Number(saleModalProduct.basePrice))}
              </strong>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3 cursor-pointer">
              <span className="font-bold text-[#1c3973]">
                {t('products.saleModal.enableLabel')}
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
                  {t('products.saleModal.discountPercent')}
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
                  {t('products.saleModal.salePrice')}
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
                  {t('products.saleModal.badgeLabel')}
                  <select
                    value={saleDraft.label || 'FLASH SALE'}
                    onChange={(e) => setSaleDraft((prev) => ({ ...prev, label: e.target.value }))}
                    className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="FLASH SALE">{t('products.saleModal.badges.FLASH_SALE')}</option>
                    <option value="GIẢM SỐC">{t('products.saleModal.badges.HOT_DEAL')}</option>
                    <option value="ƯU ĐÃI ĐẶC BIỆT">
                      {t('products.saleModal.badges.SPECIAL_OFFER')}
                    </option>
                    <option value="XẢ KHO">{t('products.saleModal.badges.CLEARANCE')}</option>
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
        title={
          stopping ? t('products.toggleModal.stopTitle') : t('products.toggleModal.relistTitle')
        }
        closeOnOverlay={!pendingId}
        closeOnEsc={!pendingId}
        showCloseButton={!pendingId}
        footer={
          <>
            <SellerButton secondary disabled={Boolean(pendingId)} onClick={closeHide}>
              {t('products.toggleModal.cancel')}
            </SellerButton>
            <SellerButton
              disabled={Boolean(pendingId) || !canManage}
              onClick={() => void confirmHide()}
            >
              <StopOutlined />
              {pendingId
                ? t('products.toggleModal.processing')
                : stopping
                  ? t('products.toggleModal.confirmStop')
                  : t('products.toggleModal.confirmRelist')}
            </SellerButton>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {stopping ? t('products.toggleModal.bodyStop') : t('products.toggleModal.bodyRelist')}
          <strong className="break-words">{selectedProduct?.title}</strong>?
        </p>
        <p className="mt-3 text-sm text-slate-500">
          {stopping ? t('products.toggleModal.descStop') : t('products.toggleModal.descRelist')}
        </p>
        {pendingId && (
          <p role="status" className="mt-3 text-sm text-blue-600">
            {t('products.toggleModal.processingRequest')}
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
