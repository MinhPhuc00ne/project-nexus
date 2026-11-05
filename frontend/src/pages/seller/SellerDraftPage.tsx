import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft as ArrowLeftOutlined } from 'lucide-react';
import {
  Box as CodeSandboxOutlined,
  Check as CheckOutlined,
  FileText as FileTextOutlined,
  Image as PictureOutlined,
  ShieldCheck as SafetyCertificateOutlined,
} from 'lucide-react';
import { useSellerWorkspace } from '../../components/seller/SellerWorkspace';
import { PageHeading, Panel, SellerButton, SellerLink } from '../../components/seller/SellerUI';
import { type SellerDraft } from '../../components/seller/sellerData';

export default function SellerDraftPage({ auction = false }: { auction?: boolean }) {
  const { saveDraft } = useSellerWorkspace();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('Đồng hồ & Trang sức');
  const [model, setModel] = useState('watch');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [increment, setIncrement] = useState('100000');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (
      !title.trim() ||
      !description.trim() ||
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0 ||
      Number(price) > 999999999999
    ) {
      setError('Vui lòng nhập tên, mô tả và giá hợp lệ.');
      return;
    }
    if (!auction && (!Number.isInteger(Number(quantity)) || Number(quantity) < 1)) {
      setError('Số lượng phải là số nguyên lớn hơn 0.');
      return;
    }
    if (auction) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < Date.now()) {
        setError('Chọn thời gian bắt đầu trong tương lai.');
        return;
      }
      if (end - start < 3600000 || end - start > 7 * 86400000) {
        setError('Thời lượng phiên phải từ 1 giờ đến 7 ngày.');
        return;
      }
      if (!Number.isFinite(Number(increment)) || Number(increment) <= 0) {
        setError('Bước giá phải lớn hơn 0.');
        return;
      }
    }
    const draft: SellerDraft = {
      id: crypto.randomUUID(),
      kind: auction ? 'auction' : 'product',
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      quantity: Number(quantity),
      category,
      model,
      startTime,
      endTime,
      increment: Number(increment),
      createdAt: new Date().toISOString(),
    };
    if (saveDraft(draft)) navigate(auction ? '/seller/auctions' : '/seller/products');
  };
  return (
    <div
      className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
      data-seller="page-stack"
    >
      <PageHeading
        title={auction ? 'Tạo bản nháp phiên đấu giá' : 'Thêm sản phẩm mới'}
        description="Chuẩn bị thông tin đầy đủ để sẵn sàng cho hoạt động bán hàng."
        actions={
          <SellerLink secondary to={auction ? '/seller/auctions' : '/seller/products'}>
            <ArrowLeftOutlined className="text-[15px]" aria-hidden="true" />
            Quay lại
          </SellerLink>
        }
      />
      <div
        className="flex gap-2.5 items-center p-[15px] [border:1px_solid_#e3ebfa] bg-[#f4f8ff] rounded-[9px] text-[#8194b1] text-[11px] leading-[1.8] [&>.anticon]:shrink-0 [&>.anticon]:text-[#7194db]! [&>[data-seller~=text-button]]:ml-auto [&>[data-seller~=text-button]]:whitespace-nowrap max-[540px]:text-[10px] max-[540px]:flex-wrap max-[540px]:[&>span:not(.anticon)]:flex-1 max-[540px]:[&_[data-seller~=text-button]]:ml-[27px]"
        data-seller="info-note"
      >
        <FileTextOutlined className="text-[18px]" aria-hidden="true" />
        Bản nháp chỉ lưu trên trình duyệt này, chưa đăng bán hoặc tạo phiên trên hệ thống.
      </div>
      <form
        className="grid [grid-template-columns:minmax(0,_1.7fr)_minmax(260px,_1fr)] gap-5 [align-items:start] max-[1050px]:[grid-template-columns:1fr] max-[1050px]:[&>aside]:[order:2]"
        data-seller="form-grid"
        onSubmit={submit}
      >
        <div
          className="flex flex-col gap-5.5 min-w-0 [&>[data-seller~=page-stack]]:gap-4 [&_h1]:mt-0 [&_h2]:mt-0 [&_h3]:mt-0 max-[540px]:gap-[17px]"
          data-seller="page-stack"
        >
          <Panel title="Thông tin cơ bản" subtitle="Mô tả chi tiết giúp người mua hiểu rõ vật phẩm">
            <div
              className="flex flex-col gap-4.5 [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#667d9e] [&_label]:font-medium [&_input]:w-full [&_input]:[border:1px_solid_#e1e8f4] [&_input]:rounded-[7px] [&_input]:py-2.5 [&_input]:px-3 [&_input]:bg-[#fbfcff] [&_input]:text-[#3c5274] [&_input]:text-[12px] [&_input]:min-w-0 [&_textarea]:w-full [&_textarea]:[border:1px_solid_#e1e8f4] [&_textarea]:rounded-[7px] [&_textarea]:py-2.5 [&_textarea]:px-3 [&_textarea]:bg-[#fbfcff] [&_textarea]:text-[#3c5274] [&_textarea]:text-[12px] [&_textarea]:min-w-0 [&_textarea]:resize-y [&_textarea]:min-h-[110px] [&_select]:w-full [&_select]:[border:1px_solid_#e1e8f4] [&_select]:rounded-[7px] [&_select]:py-2.5 [&_select]:px-3 [&_select]:bg-[#fbfcff] [&_select]:text-[#3c5274] [&_select]:text-[12px] [&_select]:min-w-0 [&_input[readonly]]:bg-[#f5f7fb] [&_input[readonly]]:text-[#8b9cb6] [&_input::placeholder]:text-[#a8b5c9] [&_textarea::placeholder]:text-[#a8b5c9] [&_small]:text-[#9aa9be] [&_small]:text-[9px] [&_small]:font-normal [&_[data-seller~=form-row]]:grid [&_[data-seller~=form-row]]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [&_[data-seller~=form-row]]:gap-4 max-[540px]:[&_[data-seller~=form-row]]:[grid-template-columns:1fr]"
              data-seller="form"
            >
              <label>
                Tên {auction ? 'phiên / vật phẩm' : 'sản phẩm'} *
                <input
                  required
                  maxLength={160}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ví dụ: Đồng hồ cơ Royal Oak Chronograph"
                />
              </label>
              <label>
                Mô tả sản phẩm *
                <textarea
                  required
                  maxLength={5000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Giới thiệu vật phẩm, tình trạng, chất liệu, xuất xứ và phụ kiện đi kèm..."
                />
              </label>
              <div className="" data-seller="form-row">
                <label>
                  Danh mục
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {[
                      'Đồng hồ & Trang sức',
                      'Thiết bị công nghệ',
                      'Nghệ thuật & Đồ cổ',
                      'Mô hình & Sưu tầm',
                      'Thời trang',
                      'Khác',
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {auction ? 'Giá khởi điểm' : 'Giá bán'} (VND) *
                  <input
                    required
                    type="number"
                    min="1"
                    max="999999999999"
                    step="1"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>
              {auction ? (
                <>
                  <div className="" data-seller="form-row">
                    <label>
                      Bắt đầu *
                      <input
                        required
                        type="datetime-local"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                      />
                    </label>
                    <label>
                      Kết thúc *
                      <input
                        required
                        type="datetime-local"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="" data-seller="form-row">
                    <label>
                      Bước giá (VND) *
                      <input
                        required
                        type="number"
                        min="1"
                        value={increment}
                        onChange={(event) => setIncrement(event.target.value)}
                      />
                    </label>
                    <label>
                      Mô hình dự kiến
                      <select value={model} onChange={(event) => setModel(event.target.value)}>
                        <option value="watch">Đồng hồ</option>
                        <option value="painting">Tranh nghệ thuật</option>
                        <option value="car">Xe</option>
                        <option value="fallback-pedestal">Bệ trưng bày</option>
                      </select>
                    </label>
                  </div>
                </>
              ) : (
                <label>
                  Số lượng dự kiến *
                  <input
                    required
                    type="number"
                    min="1"
                    max="999999"
                    step="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </label>
              )}
              {error && (
                <p
                  className="flex items-center justify-between gap-3 py-[13px] px-[17px] [border:1px_solid_#f6d9df] bg-[#fff3f5] rounded-[9px] text-[#bb5265] mb-4 text-[12px] [&_button]:bg-transparent [&_button]:[border:0] [&_button]:text-inherit"
                  data-seller="error"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <div
                className="flex items-center justify-end gap-2.5 pt-4.5 [border-top:1px_solid_#eef2f8] max-[540px]:flex-wrap max-[540px]:[&_[data-seller~=button]]:flex-1"
                data-seller="form-actions"
              >
                <SellerLink to={auction ? '/seller/auctions' : '/seller/products'} secondary>
                  Hủy
                </SellerLink>
                <SellerButton type="submit">
                  <CheckOutlined className="text-[15px]" aria-hidden="true" />
                  Lưu bản nháp
                </SellerButton>
              </div>
            </div>
          </Panel>
        </div>
        <aside>
          <Panel title="Trước khi lưu bản nháp">
            <div
              className="h-[170px] [background:linear-gradient(140deg,_#eef4ff,_#f8faff)] grid [place-items:center] [border:1px_dashed_#ccdbf8] rounded-[10px] text-[#9cb3df] mb-5"
              data-seller="form-preview"
            >
              <CodeSandboxOutlined className="text-[55px]" aria-hidden="true" />
            </div>
            <div
              className="flex flex-col gap-3.5 [&>div]:flex [&>div]:items-start [&>div]:gap-2.5 [&>div]:p-[13px] [&>div]:[border:1px_solid_#ecf1f9] [&>div]:rounded-[9px] [&>div]:bg-[#f9fbff] [&_.anticon]:w-4.5 [&_.anticon]:shrink-0 [&_.anticon]:text-[#7295e4]! [&_.anticon]:mt-[1px] [&_strong]:text-[11px] [&_strong]:font-[550] [&_p]:text-[10px] [&_p]:text-[#91a0b8] [&_p]:[margin:4px_0_0] [&_p]:leading-[1.8]"
              data-seller="checklist"
            >
              <div>
                <SafetyCertificateOutlined className="text-[18px]" aria-hidden="true" />
                <span>
                  <strong>Thông tin chính xác</strong>
                  <p>Kiểm tra kỹ mô tả và giá trước khi phát hành.</p>
                </span>
              </div>
              <div>
                <PictureOutlined className="text-[18px]" aria-hidden="true" />
                <span>
                  <strong>Chuẩn bị hình ảnh</strong>
                  <p>Ảnh và mô hình sẽ được tải lên khi dịch vụ đăng bán sẵn sàng.</p>
                </span>
              </div>
              <div>
                <FileTextOutlined className="text-[18px]" aria-hidden="true" />
                <span>
                  <strong>Lưu riêng trên thiết bị</strong>
                  <p>Bản nháp gắn với tài khoản hiện tại và trình duyệt này.</p>
                </span>
              </div>
            </div>
          </Panel>
        </aside>
      </form>
    </div>
  );
}
