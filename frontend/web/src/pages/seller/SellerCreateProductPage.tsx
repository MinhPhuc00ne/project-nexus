import { useState } from 'react';
import { ArrowLeftOutlined, InfoCircleOutlined, ShopOutlined } from '@ant-design/icons';
import { PageHeading, Panel, SellerButton, SellerLink } from '../../components/seller/SellerUI';
import SellerProductImages from '../../components/seller/SellerProductImages';

const emptyForm = {
  title: '',
  description: '',
  price: '',
  quantity: '',
  weight: '',
  length: '',
  width: '',
  height: '',
};
const inputClass =
  'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';

export default function SellerCreateProductPage() {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const price = Number(form.price);
  const priceLabel =
    Number.isFinite(price) && price > 0
      ? `${price.toLocaleString('vi-VN')} ₫`
      : 'Chưa nhập giá bán';
  function reset(): void {
    setForm(emptyForm);
    setFiles([]);
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Đăng bán sản phẩm"
        description="Chuẩn bị thông tin, hình ảnh và tồn kho cho sản phẩm của gian hàng."
        actions={
          <SellerLink to="/seller/products" secondary>
            <ArrowLeftOutlined />
            Danh sách sản phẩm
          </SellerLink>
        }
      />
      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900"
      >
        <InfoCircleOutlined className="mt-1" />
        <p>
          Đang chờ API đăng bán, danh mục và upload ảnh từ BE. Bạn có thể nhập thông tin và xem
          trước ảnh; dữ liệu chưa được lưu hoặc gửi lên hệ thống.
        </p>
      </div>
      <form
        onSubmit={(event) => event.preventDefault()}
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
                <select disabled value="" className={inputClass}>
                  <option value="">Đang chờ API danh mục từ BE</option>
                </select>
              </label>
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
            <SellerProductImages files={files} onChange={setFiles} />
          </Panel>
          <Panel title="Giá bán và số lượng" subtitle="Thông tin giá và tồn kho dự kiến">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Giá bán (VND) <span className="text-red-500">*</span>
                <input
                  required
                  type="number"
                  min={1}
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
                  min={1}
                  step={1}
                  value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                  className={inputClass}
                  placeholder="Nhập số lượng"
                />
              </label>
            </div>
          </Panel>
          <Panel title="Thông tin vận chuyển" subtitle="Khối lượng và kích thước sau khi đóng gói">
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
              Xóa thông tin đã nhập
            </SellerButton>
            <SellerButton disabled>
              <ShopOutlined />
              Chờ API đăng bán
            </SellerButton>
          </div>
        </div>
        <aside className="space-y-5 xl:sticky xl:top-24">
          <Panel title="Thông tin đang nhập" subtitle="Chưa phải sản phẩm đã đăng bán">
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
                  <dd>{files.length}/8</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Số lượng</dt>
                  <dd>{form.quantity || 'Chưa nhập'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Trạng thái</dt>
                  <dd className="text-blue-700">Chưa đăng bán</dd>
                </div>
              </dl>
            </div>
          </Panel>
          <p className="px-1 text-xs leading-6 text-slate-500">
            Chỉ tài khoản có quyền Seller được vào trang này. Khi có API, thao tác đăng bán sẽ dùng
            Axios client chung của dự án.
          </p>
        </aside>
      </form>
    </div>
  );
}
