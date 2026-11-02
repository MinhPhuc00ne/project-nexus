import { useState } from 'react';
import {
  ArrowLeftOutlined,
  ShopOutlined,
  PlusOutlined,
  DeleteOutlined,
  TagOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { PageHeading, Panel, SellerButton, SellerLink } from '../../components/seller/SellerUI';
import SellerProductImages from '../../components/seller/SellerProductImages';
import useSellerProductForm from '../../components/seller/useSellerProductForm';
import { useParams } from 'react-router-dom';
import { useSellerSession } from '../../components/seller/SellerSession';
import { PRESET_OPTION_GROUPS, computeEffectiveSale } from '../../services/productExtras';

const inputClass =
  'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';

export default function SellerCreateProductPage() {
  const { id } = useParams<{ id: string }>();
  return <SellerProductFormPage key={id ?? 'new'} productId={id} />;
}

function SellerProductFormPage({ productId }: { productId?: string }) {
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
      ? `${effectiveSale.effectivePrice.toLocaleString('vi-VN')} ₫`
      : 'Chưa nhập giá bán';

  const handleAddPresetOption = (presetName: string, sampleValues: string[]) => {
    if (optionGroups.some((g) => g.name.toLowerCase() === presetName.toLowerCase())) return;
    setOptionGroups((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: presetName,
        values: [...sampleValues],
      },
    ]);
  };

  const handleAddCustomOptionGroup = () => {
    setOptionGroups((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
        g.id === groupId
          ? { ...g, values: Array.from(new Set([...g.values, ...parts])) }
          : g,
      ),
    );
    setNewOptionInput((prev) => ({ ...prev, [groupId]: '' }));
  };

  if (productLoading)
    return (
      <p role="status" className="p-8 text-sm text-slate-500">
        Đang tải sản phẩm…
      </p>
    );
  if (productError)
    return (
      <div role="alert" className="space-y-4 rounded-xl bg-red-50 p-5 text-sm text-red-700">
        <p>{productError}</p>
        <SellerButton secondary onClick={retryProduct}>
          Thử lại
        </SellerButton>
        <SellerLink to="/seller/products" secondary>
          Danh sách sản phẩm
        </SellerLink>
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeading
        title={editing ? 'Chỉnh sửa sản phẩm' : 'Đăng bán sản phẩm'}
        description="Chuẩn bị thông tin, phân loại tùy chọn (màu, size…), chương trình Sale và tồn kho cho sản phẩm."
        actions={
          <SellerLink to="/seller/products" secondary>
            <ArrowLeftOutlined />
            Danh sách sản phẩm
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
          Gian hàng đang bị đình chỉ hoặc chưa bật chế độ người bán nên chưa thể lưu sản phẩm.
        </p>
      )}
      {pending && (
        <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          {progress || 'Đang chuẩn bị đăng bán…'}
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
            <Panel title="Thông tin sản phẩm" subtitle="Thông tin hiển thị cho người mua">
              <div className="space-y-5">
                <label className="block text-sm font-medium text-slate-700">
                  Tên sản phẩm <span className="text-red-500">*</span>
                  <input
                    required
                    maxLength={160}
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    className={inputClass}
                    placeholder="Nhập tên sản phẩm muốn đăng bán"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Danh mục sản phẩm <span className="text-red-500">*</span>
                  <select
                    required
                    disabled={categoryLoading || Boolean(categoryError) || !categoryOptions.length}
                    value={form.categoryId}
                    onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                    className={inputClass}
                  >
                    <option value="">
                      {categoryLoading ? 'Đang tải danh mục…' : 'Chọn danh mục'}
                    </option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                {categoryError && (
                  <div role="alert" className="space-y-2 text-sm text-red-600">
                    <p>{categoryError}</p>
                    <SellerButton secondary onClick={retryCategories}>
                      Tải lại danh mục
                    </SellerButton>
                  </div>
                )}
                {!categoryLoading && !categoryError && !categoryOptions.length && (
                  <p role="status" className="text-sm text-amber-700">
                    Hệ thống chưa có danh mục. Vui lòng liên hệ quản trị viên để bổ sung trước khi
                    đăng bán.
                  </p>
                )}
                <label className="block text-sm font-medium text-slate-700">
                  Mô tả sản phẩm <span className="text-red-500">*</span>
                  <textarea
                    required
                    maxLength={5000}
                    rows={6}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    className={inputClass}
                    placeholder="Mô tả tình trạng, chất liệu, nguồn gốc, phụ kiện và chính sách bảo hành…"
                  />
                  <span className="mt-1 block text-right text-xs font-normal text-slate-400">
                    {form.description.length}/5.000 ký tự
                  </span>
                </label>
              </div>
            </Panel>

            <Panel title="Hình ảnh sản phẩm" subtitle="Ảnh đầu tiên được dùng làm ảnh bìa">
              <SellerProductImages
                files={files}
                onChange={setFiles}
                existingImages={existingImages}
                onExistingImagesChange={setExistingImages}
              />
            </Panel>

            {/* TÍNH NĂNG MỚI #5: PHÂN LOẠI HÀNG / TÙY CHỌN (MÀU SẮC, SIZE, PHIÊN BẢN...) */}
            <Panel
              title="Phân loại hàng & Tùy chọn cho người mua (Màu sắc, Size…)"
              subtitle="Cho phép người mua chọn Màu sắc, Kích thước (Size), Phiên bản khi đặt hàng"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Thêm nhanh nhóm tùy chọn:</span>
                  {PRESET_OPTION_GROUPS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleAddPresetOption(preset.name, preset.sampleValues)}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                    >
                      <PlusOutlined /> {preset.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddCustomOptionGroup}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <PlusOutlined /> Tùy chọn tự đặt
                  </button>
                </div>

                {optionGroups.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    Chưa có nhóm phân loại nào. Bấm vào các nút phía trên (VD: <strong>+ Màu sắc</strong>,{' '}
                    <strong>+ Kích thước (Size)</strong>) để người mua có thể chọn khi mua sản phẩm.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {optionGroups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-lg border border-blue-100 bg-blue-50/30 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              Tên nhóm tùy chọn (VD: Màu sắc, Size, Chất liệu)
                              <input
                                type="text"
                                value={group.name}
                                onChange={(e) =>
                                  setOptionGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id ? { ...g, name: e.target.value } : g,
                                    ),
                                  )
                                }
                                placeholder="Nhập tên nhóm (VD: Màu sắc)"
                                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-600"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setOptionGroups((prev) => prev.filter((g) => g.id !== group.id))
                            }
                            className="mt-5 inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <DeleteOutlined /> Xóa nhóm
                          </button>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Các lựa chọn cho khách hàng:
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
                                  onClick={() =>
                                    setOptionGroups((prev) =>
                                      prev.map((g) =>
                                        g.id === group.id
                                          ? { ...g, values: g.values.filter((v) => v !== val) }
                                          : g,
                                      ),
                                    )
                                  }
                                  className="text-slate-400 hover:text-red-600 font-bold"
                                  aria-label={`Xóa ${val}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newOptionInput[group.id] || ''}
                              onChange={(e) =>
                                setNewOptionInput((prev) => ({
                                  ...prev,
                                  [group.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddValueToGroup(group.id);
                                }
                              }}
                              placeholder="Nhập thêm lựa chọn (ngăn cách bằng dấu phẩy, VD: Đỏ, Xám) rồi bấm Thêm"
                              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-600"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddValueToGroup(group.id)}
                              className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              + Thêm lựa chọn
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="Giá bán và số lượng" subtitle="Thông tin giá gốc và tồn kho dự kiến">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Giá bán gốc (VND) <span className="text-red-500">*</span>
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
                    placeholder="Nhập giá bán gốc"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Số lượng tồn kho <span className="text-red-500">*</span>
                  <input
                    required
                    type="number"
                    min={editing ? 0 : 1}
                    step={1}
                    value={form.quantity}
                    onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                    className={inputClass}
                    placeholder="Nhập số lượng"
                  />
                </label>
              </div>
            </Panel>

            {/* TÍNH NĂNG MỚI #2: CHƯƠNG TRÌNH SALE / GIẢM GIÁ CHO SẢN PHẨM */}
            <Panel
              title="Chương trình Khuyến mãi / Giảm giá (Sale)"
              subtitle="Thiết lập mức giảm giá và nhãn Sale hiển thị nổi bật cho người mua"
            >
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <ThunderboltOutlined className="text-lg text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-[#1c3973]">
                        Bật chương trình Giảm giá (Sale) cho sản phẩm này
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Hiển thị giá khuyến mãi, giá gốc gạch ngang và huy hiệu giảm giá trên trang
                        sản phẩm.
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
                      Mức giảm giá (%)
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
                      Giá sau giảm (VNĐ)
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
                              ? Math.max(1, Math.min(95, Math.round(((base - customSale) / base) * 100)))
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
                      Nhãn chương trình Sale
                      <select
                        value={saleConfig.label || 'FLASH SALE'}
                        onChange={(e) =>
                          setSaleConfig((prev) => ({ ...prev, label: e.target.value }))
                        }
                        className={inputClass}
                      >
                        <option value="FLASH SALE">FLASH SALE</option>
                        <option value="GIẢM SỐC">GIẢM SỐC</option>
                        <option value="ƯU ĐÃI ĐẶC BIỆT">ƯU ĐÃI ĐẶC BIỆT</option>
                        <option value="XẢ KHO">XẢ KHO</option>
                      </select>
                    </label>

                    {Number(form.price) > 0 && (
                      <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-blue-50 px-3.5 py-2.5 text-xs">
                        <span className="text-slate-600">
                          Giá hiển thị cho người mua:{' '}
                          <strong className="text-blue-700 text-sm">
                            {effectiveSale.effectivePrice.toLocaleString('vi-VN')} ₫
                          </strong>{' '}
                          <span className="line-through text-slate-400 ml-1">
                            {Number(form.price).toLocaleString('vi-VN')} ₫
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
              title="Thông tin vận chuyển"
              subtitle="Khối lượng và kích thước sau khi đóng gói"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ['weight', 'Khối lượng (gram)'],
                    ['length', 'Chiều dài (cm)'],
                    ['width', 'Chiều rộng (cm)'],
                    ['height', 'Chiều cao (cm)'],
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
                      placeholder="Chưa nhập"
                    />
                  </label>
                ))}
              </div>
            </Panel>
            <div className="flex flex-wrap justify-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <SellerButton secondary onClick={reset}>
                {editing ? 'Khôi phục thông tin ban đầu' : 'Xóa thông tin đã nhập'}
              </SellerButton>
              <SellerButton
                type="submit"
                disabled={
                  pending || categoryLoading || Boolean(categoryError) || !categoryOptions.length
                }
              >
                <ShopOutlined />
                {pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Đăng bán sản phẩm'}
              </SellerButton>
            </div>
          </div>
          <aside className="space-y-5 xl:sticky xl:top-24">
            <Panel
              title="Thông tin đang nhập"
              subtitle={
                editing ? 'Xem lại thông tin trước khi lưu' : 'Chưa phải sản phẩm đã đăng bán'
              }
            >
              <div className="space-y-4">
                <div className="flex h-28 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                  <ShopOutlined className="text-4xl" />
                </div>
                <h2 className="break-words text-base font-semibold text-slate-900">
                  {form.title.trim() || 'Chưa nhập tên sản phẩm'}
                </h2>
                <div>
                  <p className="font-bold text-blue-700 text-lg">{priceLabel}</p>
                  {effectiveSale.isOnSale && (
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="line-through text-slate-400">
                        {effectiveSale.originalPrice.toLocaleString('vi-VN')} ₫
                      </span>
                      <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        -{effectiveSale.discountPercent}%
                      </span>
                    </div>
                  )}
                </div>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Ảnh đã chọn</dt>
                    <dd>{files.length + existingImages.length}/5</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Số lượng</dt>
                    <dd>{form.quantity || 'Chưa nhập'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Nhóm tùy chọn</dt>
                    <dd className="font-semibold text-blue-700">
                      {optionGroups.filter((g) => g.name && g.values.length).length} nhóm
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Khuyến mãi Sale</dt>
                    <dd className="font-semibold text-blue-700">
                      {effectiveSale.isOnSale ? `Đang bật (-${effectiveSale.discountPercent}%)` : 'Không bật'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Trạng thái</dt>
                    <dd className="text-blue-700">
                      {editing ? 'Đang chỉnh sửa' : 'Chưa đăng bán'}
                    </dd>
                  </div>
                </dl>
              </div>
            </Panel>
            <p className="px-1 text-xs leading-6 text-slate-500">
              {editing
                ? 'Chỉ lưu thay đổi khi bạn bấm Lưu thay đổi. Ảnh mới được tải lên trước khi cập nhật sản phẩm.'
                : 'Sản phẩm sẽ được mở bán sau khi máy chủ xác nhận thành công. Ảnh được tải lên khi bạn bấm đăng bán.'}
            </p>
          </aside>
        </fieldset>
      </form>
    </div>
  );
}
