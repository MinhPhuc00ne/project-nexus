import { ArrowLeftOutlined, ShopOutlined } from '@ant-design/icons';
import { PageHeading, Panel, SellerButton, SellerLink } from '../../components/seller/SellerUI';
import SellerProductImages from '../../components/seller/SellerProductImages';
import useSellerProductForm from '../../components/seller/useSellerProductForm';
import { useParams } from 'react-router-dom';
import { useSellerSession } from '../../components/seller/SellerSession';
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
  const price = Number(form.price);
  const priceLabel =
    Number.isFinite(price) && price > 0
      ? `${price.toLocaleString('vi-VN')} ₫`
      : 'Chưa nhập giá bán';
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
        description="Chuẩn bị thông tin, hình ảnh và tồn kho cho sản phẩm của gian hàng."
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
          className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"
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
            <Panel title="Giá bán và số lượng" subtitle="Thông tin giá và tồn kho dự kiến">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Giá bán (VND) <span className="text-red-500">*</span>
                  <input
                    required
                    type="number"
                    min={1000}
                    max={999999999999}
                    step={1}
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                    className={inputClass}
                    placeholder="Nhập giá bán"
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
                <p className="font-bold text-blue-700">{priceLabel}</p>
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
