import { useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { FileImage, ImagePlus, LoaderCircle, Send } from 'lucide-react';
import { registerAuctionItemApi, type AuctionEntity } from '../../services/auction.service';
import {
  formatConsignmentDate,
  getConsignmentErrorMessage,
  initialConsignmentForm,
  uploadConsignmentFiles,
  type ConsignmentFormState,
} from './sellerConsignmentHelpers';
import { Panel, SellerButton, SellerLink } from './SellerUI';
import { useSellerWorkspace } from './SellerWorkspace';

export interface SellerConsignmentFormProps {
  eligibleAuctions: AuctionEntity[];
  isLoading: boolean;
  onSuccess: () => Promise<void> | void;
}

/**
 * Form component enabling sellers to input item specifications, appraisal details, and submit for auction inclusion.
 *
 * @param props - Component configuration including available auctions and success callbacks.
 * @returns Rendered consignment registration form.
 */
export default function SellerConsignmentForm({
  eligibleAuctions,
  isLoading,
  onSuccess,
}: SellerConsignmentFormProps): ReactElement {
  const { notify } = useSellerWorkspace();
  const [form, setForm] = useState<ConsignmentFormState>(initialConsignmentForm);
  const [itemImages, setItemImages] = useState<File[]>([]);
  const [certificateImages, setCertificateImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateForm = (key: keyof ConsignmentFormState, value: string): void => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectFiles = (
    event: ChangeEvent<HTMLInputElement>,
    setFiles: (files: File[]) => void,
  ): void => {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) return;
    if (selected.some((file) => !file.type.startsWith('image/'))) {
      notify('Chỉ nhận tệp hình ảnh cho hồ sơ đấu giá.', 'error');
      event.target.value = '';
      return;
    }
    if (selected.length > 5) {
      notify('Mỗi nhóm chỉ được tải tối đa 5 ảnh.', 'error');
      event.target.value = '';
      return;
    }
    setFiles(selected);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!form.auctionId || !form.title.trim() || !form.description.trim()) {
      notify('Hãy chọn phiên đấu giá, nhập tên và mô tả vật phẩm.', 'error');
      return;
    }
    if (!itemImages.length || !certificateImages.length) {
      notify('Cần tối thiểu một ảnh vật phẩm và một ảnh chứng thư để Admin thẩm định.', 'error');
      return;
    }
    const startingPrice = Number(form.proposedStartingPrice);
    const reservePrice = form.proposedReservePrice ? Number(form.proposedReservePrice) : undefined;
    const bidIncrement = Number(form.proposedBidIncrement);
    if (!Number.isFinite(startingPrice) || startingPrice < 10000) {
      notify('Giá khởi điểm phải từ 10.000 ₫.', 'error');
      return;
    }
    if (
      reservePrice !== undefined &&
      (!Number.isFinite(reservePrice) || reservePrice < startingPrice)
    ) {
      notify('Giá giữ lại phải lớn hơn hoặc bằng giá khởi điểm.', 'error');
      return;
    }
    if (!Number.isFinite(bidIncrement) || bidIncrement < 1000) {
      notify('Bước giá tối thiểu là 1.000 ₫.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      notify('Đang tải ảnh vật phẩm…');
      const images = await uploadConsignmentFiles(itemImages, 'ảnh vật phẩm');
      notify('Đang tải chứng thư thẩm định…');
      const certificates = await uploadConsignmentFiles(certificateImages, 'ảnh chứng thư');
      const response = await registerAuctionItemApi(form.auctionId, {
        title: form.title.trim(),
        description: form.description.trim(),
        images,
        ...(form.threeModelKey.trim() ? { threeModelKey: form.threeModelKey.trim() } : {}),
        proposedStartingPrice: startingPrice,
        ...(reservePrice !== undefined ? { proposedReservePrice: reservePrice } : {}),
        proposedBidIncrement: bidIncrement,
        ...(form.appraisalCertificateNumber.trim()
          ? { appraisalCertificateNumber: form.appraisalCertificateNumber.trim() }
          : {}),
        ...(form.appraisalAgency.trim() ? { appraisalAgency: form.appraisalAgency.trim() } : {}),
        certificateImages: certificates,
        ...(form.certificateIssueDate
          ? { certificateIssueDate: new Date(form.certificateIssueDate).toISOString() }
          : {}),
      });
      notify(response.message || 'Đã gửi vật phẩm để Admin duyệt.', 'success');
      setForm(initialConsignmentForm);
      setItemImages([]);
      setCertificateImages([]);
      await onSuccess();
    } catch (error) {
      notify(getConsignmentErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      <Panel
        title="Thông tin ký gửi"
        subtitle="Các trường có dấu * là bắt buộc cho bước thẩm định."
      >
        <div className="grid gap-4 md:grid-cols-2 [&_label]:space-y-1.5 [&_label]:text-sm [&_label]:font-medium [&_label]:text-slate-700 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm">
          <label className="md:col-span-2">
            Phiên đấu giá nhận ký gửi *
            <select
              required
              value={form.auctionId}
              onChange={(event) => updateForm('auctionId', event.target.value)}
              disabled={isLoading || !eligibleAuctions.length}
            >
              <option value="">
                {isLoading ? 'Đang tải phiên đấu giá…' : 'Chọn phiên đấu giá'}
              </option>
              {eligibleAuctions.map((auction) => (
                <option key={auction.id} value={auction.id}>
                  {auction.title} · {formatConsignmentDate(auction.startTime)}
                </option>
              ))}
            </select>
            {!isLoading && !eligibleAuctions.length && (
              <small className="block font-normal text-amber-700">
                Hiện chưa có phiên ở trạng thái nhận ký gửi. Hãy chờ Admin mở phiên mới.
              </small>
            )}
          </label>
          <label className="md:col-span-2">
            Tên vật phẩm *
            <input
              required
              maxLength={160}
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              placeholder="Ví dụ: Đồng hồ cơ vintage, đầy đủ hộp và giấy tờ"
            />
          </label>
          <label className="md:col-span-2">
            Mô tả, nguồn gốc và tình trạng *
            <textarea
              required
              rows={5}
              maxLength={5000}
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              placeholder="Mô tả chi tiết tình trạng, năm sản xuất, phụ kiện, nguồn gốc và các điểm cần lưu ý…"
            />
          </label>
          <label>
            Giá khởi điểm (₫) *
            <input
              required
              min="10000"
              type="number"
              value={form.proposedStartingPrice}
              onChange={(event) => updateForm('proposedStartingPrice', event.target.value)}
              placeholder="10000000"
            />
          </label>
          <label>
            Giá giữ lại (₫)
            <input
              min="10000"
              type="number"
              value={form.proposedReservePrice}
              onChange={(event) => updateForm('proposedReservePrice', event.target.value)}
              placeholder="Không bắt buộc"
            />
          </label>
          <label>
            Bước giá (₫) *
            <input
              required
              min="1000"
              type="number"
              value={form.proposedBidIncrement}
              onChange={(event) => updateForm('proposedBidIncrement', event.target.value)}
            />
          </label>
          <label>
            Mã mô hình 3D
            <input
              value={form.threeModelKey}
              onChange={(event) => updateForm('threeModelKey', event.target.value)}
              placeholder="models/vat-pham.glb"
            />
          </label>
        </div>
      </Panel>

      <Panel title="Ảnh vật phẩm" subtitle="Tải 1–5 ảnh rõ nét từ nhiều góc để Admin thẩm định.">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-5 py-7 text-center text-sm text-slate-600 hover:bg-blue-50">
          <ImagePlus className="text-blue-600" size={28} aria-hidden="true" />
          <span className="font-medium text-blue-700">Chọn ảnh vật phẩm *</span>
          <span className="text-xs text-slate-500">PNG, JPG, WEBP · tối đa 5 ảnh</span>
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => selectFiles(event, setItemImages)}
          />
        </label>
        {itemImages.length > 0 && (
          <p className="mt-3 text-sm text-emerald-700">Đã chọn {itemImages.length} ảnh vật phẩm.</p>
        )}
      </Panel>

      <Panel
        title="Chứng thư thẩm định"
        subtitle="Chứng thư, hóa đơn hoặc giấy xác thực sẽ được Admin kiểm tra."
      >
        <div className="grid gap-4 md:grid-cols-2 [&_label]:space-y-1.5 [&_label]:text-sm [&_label]:font-medium [&_label]:text-slate-700 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm">
          <label>
            Số chứng thư
            <input
              value={form.appraisalCertificateNumber}
              onChange={(event) => updateForm('appraisalCertificateNumber', event.target.value)}
              placeholder="Ví dụ: GIA-2026-001"
            />
          </label>
          <label>
            Đơn vị thẩm định
            <input
              value={form.appraisalAgency}
              onChange={(event) => updateForm('appraisalAgency', event.target.value)}
              placeholder="Ví dụ: GIA"
            />
          </label>
          <label>
            Ngày cấp chứng thư
            <input
              type="date"
              value={form.certificateIssueDate}
              onChange={(event) => updateForm('certificateIssueDate', event.target.value)}
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1.5 block">Ảnh chứng thư / giấy tờ *</span>
            <span className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-4 text-sm font-normal text-slate-600 hover:bg-blue-50">
              <FileImage className="shrink-0 text-blue-600" size={24} aria-hidden="true" />
              <span>
                <span className="block font-medium text-blue-700">Chọn ảnh chứng thư</span>
                <span className="text-xs text-slate-500">Tối đa 5 ảnh</span>
              </span>
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => selectFiles(event, setCertificateImages)}
              />
            </span>
          </label>
        </div>
        {certificateImages.length > 0 && (
          <p className="mt-3 text-sm text-emerald-700">
            Đã chọn {certificateImages.length} ảnh chứng thư.
          </p>
        )}
      </Panel>

      <div className="flex justify-end gap-3">
        <SellerLink secondary to="/seller/auctions">
          Hủy
        </SellerLink>
        <SellerButton
          type="submit"
          disabled={isSubmitting || isLoading || !eligibleAuctions.length}
        >
          {isSubmitting ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
          {isSubmitting ? 'Đang gửi hồ sơ…' : 'Gửi Admin thẩm định'}
        </SellerButton>
      </div>
    </form>
  );
}
