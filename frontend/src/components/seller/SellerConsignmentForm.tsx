import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { registerAuctionItemApi, type AuctionEntity } from '../../services/auction.service';
import {
  getConsignmentErrorMessage,
  initialConsignmentForm,
  uploadConsignmentFiles,
  type ConsignmentFormState,
} from './sellerConsignmentHelpers';
import ConsignmentImagePicker from './ConsignmentImagePicker';
import SellerConsignmentCertificateFields from './SellerConsignmentCertificateFields';
import SellerConsignmentFields from './SellerConsignmentFields';
import { Panel, SellerButton, SellerLink } from './SellerUI';
import { useSellerWorkspace } from './SellerWorkspace';

export interface SellerConsignmentFormProps {
  eligibleAuctions: AuctionEntity[];
  isLoading: boolean;
  onSuccess: () => Promise<void> | void;
  preselectedAuctionId?: string;
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
  preselectedAuctionId,
}: SellerConsignmentFormProps): ReactElement {
  const { notify } = useSellerWorkspace();
  const [form, setForm] = useState<ConsignmentFormState>(initialConsignmentForm);
  const [itemImages, setItemImages] = useState<File[]>([]);
  const [certificateImages, setCertificateImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (
      !preselectedAuctionId ||
      !eligibleAuctions.some((auction) => auction.id === preselectedAuctionId)
    ) {
      return;
    }
    setForm((current) =>
      current.auctionId === preselectedAuctionId
        ? current
        : { ...current, auctionId: preselectedAuctionId },
    );
  }, [eligibleAuctions, preselectedAuctionId]);

  const updateForm = (key: keyof ConsignmentFormState, value: string): void => {
    setForm((current) => ({ ...current, [key]: value }));
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
    const bidIncrement = Number(form.proposedBidIncrement);
    const reservePrice = form.proposedReservePrice.trim()
      ? Number(form.proposedReservePrice)
      : undefined;
    if (!Number.isFinite(startingPrice) || startingPrice < 10000) {
      notify('Giá khởi điểm phải từ 10.000 ₫.', 'error');
      return;
    }
    if (!Number.isFinite(bidIncrement) || bidIncrement < 1000) {
      notify('Bước giá tối thiểu là 1.000 ₫.', 'error');
      return;
    }
    if (
      reservePrice !== undefined &&
      (!Number.isFinite(reservePrice) || reservePrice < 10000 || reservePrice > startingPrice)
    ) {
      notify('Giá sàn phải từ 10.000 ₫ và nhỏ hơn hoặc bằng giá khởi điểm.', 'error');
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
      <SellerConsignmentFields
        form={form}
        eligibleAuctions={eligibleAuctions}
        isLoading={isLoading}
        updateForm={updateForm}
      />
      <Panel title="Ảnh vật phẩm" subtitle="Tải 1–5 ảnh rõ nét từ nhiều góc để Admin thẩm định.">
        <ConsignmentImagePicker
          files={itemImages}
          onFilesChange={setItemImages}
          onError={(message) => notify(message, 'error')}
          label="Chọn ảnh vật phẩm *"
          previewLabel="ảnh vật phẩm"
          previewDescription="(ảnh đầu tiên là ảnh đại diện):"
        />
      </Panel>
      <SellerConsignmentCertificateFields
        form={form}
        updateForm={updateForm}
        certificateImages={certificateImages}
        onCertificateImagesChange={setCertificateImages}
        onError={(message) => notify(message, 'error')}
      />
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
