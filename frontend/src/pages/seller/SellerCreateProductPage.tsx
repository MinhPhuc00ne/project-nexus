import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { ArrowLeft as ArrowLeftOutlined } from 'lucide-react';
import {
  Store as ShopOutlined,
  Plus as PlusOutlined,
  Trash2 as DeleteOutlined,
  Tag as TagOutlined,
  Zap as ThunderboltOutlined,
} from 'lucide-react';
import { PageHeading, Panel, SellerButton, SellerLink } from '../../components/seller/SellerUI';
import SellerProductImages from '../../components/seller/SellerProductImages';
import SellerCategoryPicker from '../../components/seller/SellerCategoryPicker';
import useSellerProductForm from '../../components/seller/useSellerProductForm';
import { useParams } from 'react-router-dom';
import { useSellerSession } from '../../components/seller/SellerSession';
import {
  PRESET_OPTION_GROUPS,
  computeEffectiveSale,
} from '@/features/catalog/services/productExtras';

const inputClass =
  'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';

export default function SellerCreateProductPage() {
  const { id } = useParams<{ id: string }>();
  return <SellerProductFormPage key={id ?? 'new'} productId={id} />;
}

function SellerProductFormPage({ productId }: { productId?: string }) {
  const { t } = useTranslation('seller');
  const user = useSellerSession();
  const editing = Boolean(productId);
  const {
    form,
    setForm,
    saleConfig,
    setSaleConfig,
    optionGroups,
    setOptionGroups,
    files,
    setFiles,
    existingImages,
    setExistingImages,
    productLoading,
    productError,
    retryProduct,
    categoryOptions,
    categoryLoading,
    categoryError,
    retryCategories,
    pending,
    progress,
    error,
    reset,
    submit,
  } = useSellerProductForm(productId);

  const [newOptionInput, setNewOptionInput] = useState<Record<string, string>>({});

  const price = Number(form.price);
  const effectiveSale = computeEffectiveSale(price, saleConfig);
  const priceLabel =
    Number.isFinite(price) && price > 0
      ? formatCurrency(effectiveSale.effectivePrice)
      : t('productForm.noPrice');

  const handleAddPresetOption = (presetName: string, sampleValues: string[]) => {
    if (optionGroups.some((g) => g.name.toLowerCase() === presetName.toLowerCase())) return;
    setOptionGroups((prev) => [
      ...prev,
      {
        id: `opt-${crypto.randomUUID()}`,
        name: presetName,
        values: [...sampleValues],
      },
    ]);
  };

  const handleAddCustomOptionGroup = () => {
    setOptionGroups((prev) => [
      ...prev,
      {
        id: `opt-${crypto.randomUUID()}`,
        name: '',
        values: [],
      },
    ]);
  };

  const handleAddValueToGroup = (groupId: string) => {
    const raw = (newOptionInput[groupId] || '').trim();
    if (!raw) return;
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setOptionGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, values: Array.from(new Set([...g.values, ...parts])) } : g,
      ),
    );
    setNewOptionInput((prev) => ({ ...prev, [groupId]: '' }));
  };

  function handleRemoveValue(groupId: string, value: string) {
    setOptionGroups((groups) =>
      groups.map((group) => {
        if (group.id !== groupId) return group;
        return { ...group, values: group.values.filter((entry) => entry !== value) };
      }),
    );
  }

  if (productLoading)
    return (
      <p role="status" className="p-8 text-sm text-slate-500">
        {t('productForm.loadingProduct')}
      </p>
    );
  if (productError)
    return (
      <div role="alert" className="space-y-4 rounded-xl bg-red-50 p-5 text-sm text-red-700">
        <p>{productError}</p>
        <SellerButton secondary onClick={retryProduct}>
          {t('productForm.retry')}
        </SellerButton>
        <SellerLink to="/seller/products" secondary>
          {t('productForm.backToList')}
        </SellerLink>
      </div>
    );

  function getSubmitLabel() {
    if (pending) {
      return t('productForm.saving');
    }
    if (editing) {
      return t('productForm.saveChanges');
    }
    return t('productForm.submitPublish');
  }
  return (
    <div className="space-y-6">
      <PageHeading
        title={editing ? t('productForm.editTitle') : t('productForm.createTitle')}
        description={t('productForm.pageDesc')}
        actions={
          <SellerLink to="/seller/products" secondary>
            <ArrowLeftOutlined />
            {t('productForm.backToList')}
          </SellerLink>
        }
      />
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {(!user.isSellerActive || user.isShopSuspended) && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {t('productForm.suspendedBanner')}
        </p>
      )}
      {pending && (
        <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          {progress || t('productForm.preparingBanner')}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        aria-busy={pending}
      >
        <fieldset
          disabled={pending || user.isShopSuspended || !user.isSellerActive}
          className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]"
        >
          <div className="min-w-0 space-y-5">
            <Panel title={t('productForm.infoTitle')} subtitle={t('productForm.infoSubtitle')}>
              <div className="space-y-5">
                <label className="block text-sm font-medium text-slate-700">
                  {t('productForm.titleLabel')} <span className="text-red-500">*</span>
                  <input
                    required
                    maxLength={160}
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    className={inputClass}
                    placeholder={t('productForm.titlePlaceholder')}
                  />
                </label>
                <SellerCategoryPicker
                  options={categoryOptions}
                  value={form.categoryId}
                  onChange={(categoryId) => setForm((current) => ({ ...current, categoryId }))}
                  loading={categoryLoading}
                  disabled={
                    pending ||
                    user.isShopSuspended ||
                    !user.isSellerActive ||
                    categoryLoading ||
                    Boolean(categoryError) ||
                    !categoryOptions.length
                  }
                />
                {categoryError && (
                  <div role="alert" className="space-y-2 text-sm text-red-600">
                    <p>{categoryError}</p>
                    <SellerButton secondary onClick={retryCategories}>
                      {t('productForm.reloadCategories')}
                    </SellerButton>
                  </div>
                )}
                {!categoryLoading && !categoryError && !categoryOptions.length && (
                  <p role="status" className="text-sm text-amber-700">
                    {t('productForm.noCategories')}
                  </p>
                )}
                <label className="block text-sm font-medium text-slate-700">
                  {t('productForm.descLabel')} <span className="text-red-500">*</span>
                  <textarea
                    required
                    maxLength={5000}
                    rows={6}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    className={inputClass}
                    placeholder={t('productForm.descPlaceholder')}
                  />
                  <span className="mt-1 block text-right text-xs font-normal text-slate-400">
                    {t('productForm.charCount', { count: form.description.length })}
                  </span>
                </label>
              </div>
            </Panel>

            <Panel title={t('productForm.imagesTitle')} subtitle={t('productForm.imagesSubtitle')}>
              <SellerProductImages
                files={files}
                onChange={setFiles}
                existingImages={existingImages}
                onExistingImagesChange={setExistingImages}
              />
            </Panel>

            {/* TÍNH NĂNG MỚI #5: PHÂN LOẠI HÀNG / TÙY CHỌN (MÀU SẮC, SIZE, PHIÊN BẢN...) */}
            <Panel
              title={t('productForm.optionsTitle')}
              subtitle={t('productForm.optionsSubtitle')}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {t('productForm.quickAddLabel')}
                  </span>
                  {PRESET_OPTION_GROUPS.map((preset, idx) => {
                    const localizedName = t(`productForm.presetGroups.${idx}.name`, {
                      defaultValue: preset.name,
                    });
                    const localizedValues = preset.sampleValues.map((val, valIdx) =>
                      t(`productForm.presetGroups.${idx}.sampleValues.${valIdx}`, {
                        defaultValue: val,
                      }),
                    );
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleAddPresetOption(localizedName, localizedValues)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        <PlusOutlined /> {localizedName}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleAddCustomOptionGroup}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <PlusOutlined /> {t('productForm.customOptionBtn')}
                  </button>
                </div>

                {optionGroups.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    {t('productForm.noOptionsHint')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {optionGroups.map((group, groupIndex) => {
                      const groupId = group.id ?? `option-${groupIndex}`;
                      return (
                        <div
                          key={groupId}
                          className="rounded-lg border border-blue-100 bg-blue-50/30 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-slate-700">
                                {t('productForm.groupNameLabel')}
                                <input
                                  type="text"
                                  value={group.name}
                                  onChange={(e) =>
                                    setOptionGroups((prev) =>
                                      prev.map((g) =>
                                        g.id === groupId ? { ...g, name: e.target.value } : g,
                                      ),
                                    )
                                  }
                                  placeholder={t('productForm.groupNamePlaceholder')}
                                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-600"
                                />
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setOptionGroups((prev) => prev.filter((g) => g.id !== groupId))
                              }
                              className="mt-5 inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              <DeleteOutlined /> {t('productForm.deleteGroup')}
                            </button>
                          </div>

                          <div>
                            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {t('productForm.choicesLabel')}
                            </span>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {group.values.map((val) => (
                                <span
                                  key={val}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#1c3973]"
                                >
                                  <TagOutlined className="text-blue-600 text-[11px]" />
                                  {val}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveValue(groupId, val)}
                                    className="text-slate-400 hover:text-red-600 font-bold"
                                    aria-label={t('productForm.removeChoiceAria', { val })}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newOptionInput[groupId] || ''}
                                onChange={(e) =>
                                  setNewOptionInput((prev) => ({
                                    ...prev,
                                    [groupId]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddValueToGroup(groupId);
                                  }
                                }}
                                placeholder={t('productForm.choicePlaceholder')}
                                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-600"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddValueToGroup(groupId)}
                                className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                {t('productForm.addChoiceBtn')}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>

            <Panel
              title={t('productForm.pricingTitle')}
              subtitle={t('productForm.pricingSubtitle')}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  {t('productForm.basePriceLabel')} <span className="text-red-500">*</span>
                  <input
                    required
                    type="number"
                    min={1000}
                    max={999999999999}
                    step={1}
                    value={form.price}
                    onChange={(event) => {
                      const nextPrice = event.target.value;
                      setForm({ ...form, price: nextPrice });
                      const numPrice = Number(nextPrice);
                      if (saleConfig.enabled && Number.isFinite(numPrice) && numPrice > 0) {
                        const nextSalePrice = Math.max(
                          1000,
                          Math.round((numPrice * (100 - saleConfig.discountPercent)) / 100),
                        );
                        setSaleConfig((prev) => ({ ...prev, salePrice: nextSalePrice }));
                      }
                    }}
                    className={inputClass}
                    placeholder={t('productForm.basePricePlaceholder')}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('productForm.stockLabel')} <span className="text-red-500">*</span>
                  <input
                    required
                    type="number"
                    min={editing ? 0 : 1}
                    step={1}
                    value={form.quantity}
                    onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                    className={inputClass}
                    placeholder={t('productForm.stockPlaceholder')}
                  />
                </label>
              </div>
            </Panel>

            {/* TÍNH NĂNG MỚI #2: CHƯƠNG TRÌNH SALE / GIẢM GIÁ CHO SẢN PHẨM */}
            <Panel title={t('productForm.saleTitle')} subtitle={t('productForm.saleSubtitle')}>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <ThunderboltOutlined className="text-lg text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-[#1c3973]">
                        {t('productForm.enableSaleTitle')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {t('productForm.enableSaleDesc')}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={saleConfig.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      const base = Number(form.price) || 0;
                      const pct = saleConfig.discountPercent || 10;
                      const calcPrice =
                        base > 0 ? Math.max(1000, Math.round((base * (100 - pct)) / 100)) : 0;
                      setSaleConfig((prev) => ({
                        ...prev,
                        enabled,
                        discountPercent: pct,
                        salePrice: calcPrice,
                      }));
                    }}
                    className="h-4 w-4 accent-blue-600 cursor-pointer"
                  />
                </label>

                {saleConfig.enabled && (
                  <div className="grid gap-4 sm:grid-cols-3 rounded-lg border border-slate-200 bg-white p-4">
                    <label className="text-xs font-semibold text-slate-700">
                      {t('productForm.discountPercent')}
                      <input
                        type="number"
                        min={1}
                        max={95}
                        step={1}
                        value={saleConfig.discountPercent}
                        onChange={(e) => {
                          const pct = Math.max(1, Math.min(95, Number(e.target.value) || 0));
                          const base = Number(form.price) || 0;
                          const calcSalePrice =
                            base > 0 ? Math.max(1000, Math.round((base * (100 - pct)) / 100)) : 0;
                          setSaleConfig((prev) => ({
                            ...prev,
                            discountPercent: pct,
                            salePrice: calcSalePrice,
                          }));
                        }}
                        className={inputClass}
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-700">
                      {t('productForm.salePriceLabel')}
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={
                          saleConfig.salePrice ||
                          (Number(form.price) > 0
                            ? Math.round(
                                (Number(form.price) * (100 - saleConfig.discountPercent)) / 100,
                              )
                            : '')
                        }
                        onChange={(e) => {
                          const customSale = Number(e.target.value) || 0;
                          const base = Number(form.price) || 0;
                          const pct =
                            base > 0 && customSale > 0 && customSale < base
                              ? Math.max(
                                  1,
                                  Math.min(95, Math.round(((base - customSale) / base) * 100)),
                                )
                              : saleConfig.discountPercent;
                          setSaleConfig((prev) => ({
                            ...prev,
                            salePrice: customSale,
                            discountPercent: pct,
                          }));
                        }}
                        className={inputClass}
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-700">
                      {t('productForm.saleBadgeLabel')}
                      <select
                        value={saleConfig.label || 'FLASH SALE'}
                        onChange={(e) =>
                          setSaleConfig((prev) => ({ ...prev, label: e.target.value }))
                        }
                        className={inputClass}
                      >
                        <option value="FLASH SALE">
                          {t('products.saleModal.badges.FLASH_SALE')}
                        </option>
                        <option value="GIẢM SỐC">{t('products.saleModal.badges.HOT_DEAL')}</option>
                        <option value="ƯU ĐÃI ĐẶC BIỆT">
                          {t('products.saleModal.badges.SPECIAL_OFFER')}
                        </option>
                        <option value="XẢ KHO">{t('products.saleModal.badges.CLEARANCE')}</option>
                      </select>
                    </label>

                    {Number(form.price) > 0 && (
                      <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-blue-50 px-3.5 py-2.5 text-xs">
                        <span className="text-slate-600">
                          {t('productForm.buyerPreview')}{' '}
                          <strong className="text-blue-700 text-sm">
                            {formatCurrency(effectiveSale.effectivePrice)}
                          </strong>{' '}
                          <span className="line-through text-slate-400 ml-1">
                            {formatCurrency(Number(form.price))}
                          </span>
                        </span>
                        <span className="rounded bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
                          {saleConfig.label || 'FLASH SALE'} -{effectiveSale.discountPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Panel>

            <Panel
              title={t('productForm.shippingTitle')}
              subtitle={t('productForm.shippingSubtitle')}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ['weight', t('productForm.weight')],
                    ['length', t('productForm.length')],
                    ['width', t('productForm.width')],
                    ['height', t('productForm.height')],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-sm font-medium text-slate-700">
                    {label}
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form[key]}
                      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                      className={inputClass}
                      placeholder={t('productForm.dimensionPlaceholder')}
                    />
                  </label>
                ))}
              </div>
            </Panel>
            <div className="flex flex-wrap justify-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <SellerButton secondary onClick={reset}>
                {editing ? t('productForm.resetEdit') : t('productForm.resetCreate')}
              </SellerButton>
              <SellerButton
                type="submit"
                disabled={
                  pending || categoryLoading || Boolean(categoryError) || !categoryOptions.length
                }
              >
                <ShopOutlined />
                {getSubmitLabel()}
              </SellerButton>
            </div>
          </div>
          <aside className="space-y-5 xl:sticky xl:top-24">
            <Panel
              title={t('productForm.previewTitle')}
              subtitle={
                editing ? t('productForm.previewEditSub') : t('productForm.previewCreateSub')
              }
            >
              <div className="space-y-4">
                <div className="flex h-28 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                  <ShopOutlined className="text-4xl" />
                </div>
                <h2 className="break-words text-base font-semibold text-slate-900">
                  {form.title.trim() || t('productForm.untitled')}
                </h2>
                <div>
                  <p className="font-bold text-blue-700 text-lg">{priceLabel}</p>
                  {effectiveSale.isOnSale && (
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="line-through text-slate-400">
                        {formatCurrency(effectiveSale.originalPrice)}
                      </span>
                      <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        -{effectiveSale.discountPercent}%
                      </span>
                    </div>
                  )}
                </div>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t('productForm.selectedImages')}</dt>
                    <dd>{files.length + existingImages.length}/5</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t('productForm.quantity')}</dt>
                    <dd>{form.quantity || t('productForm.dimensionPlaceholder')}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t('productForm.optionGroupsCount')}</dt>
                    <dd className="font-semibold text-blue-700">
                      {t('productForm.groupsUnit', {
                        count: optionGroups.filter((g) => g.name && g.values.length).length,
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t('productForm.saleStatus')}</dt>
                    <dd className="font-semibold text-blue-700">
                      {effectiveSale.isOnSale
                        ? t('productForm.saleActive', { pct: effectiveSale.discountPercent })
                        : t('productForm.saleInactive')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{t('productForm.statusLabel')}</dt>
                    <dd className="text-blue-700">
                      {editing ? t('productForm.statusEditing') : t('productForm.statusDraft')}
                    </dd>
                  </div>
                </dl>
              </div>
            </Panel>
            <p className="px-1 text-xs leading-6 text-slate-500">
              {editing ? t('productForm.asideEditNote') : t('productForm.asideCreateNote')}
            </p>
          </aside>
        </fieldset>
      </form>
    </div>
  );
}
