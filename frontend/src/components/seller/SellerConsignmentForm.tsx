import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  registerAuctionItemApi,
  type AuctionEntity,
} from '@/features/auction/services/auction.service';
import {
  getConsignmentErrorMessage,
  initialConsignmentForm,
  parseConsignmentParcel,
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
  const { t } = useTranslation('seller');
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
      notify(t('auctions.consignment.missingFieldsErr'), 'error');
      return;
    }
    if (!itemImages.length || !certificateImages.length) {
      notify(t('auctions.consignment.missingImagesErr'), 'error');
      return;
    }
    const startingPrice = Number(form.proposedStartingPrice);
    const bidIncrement = Number(form.proposedBidIncrement);
    const reservePrice = form.proposedReservePrice.trim()
      ? Number(form.proposedReservePrice)
      : undefined;
    if (!Number.isFinite(startingPrice) || startingPrice < 10000) {
      notify(t('auctions.consignment.minStartPriceErr'), 'error');
      return;
    }
    if (!Number.isFinite(bidIncrement) || bidIncrement < 1000) {
      notify(t('auctions.consignment.minIncrementErr'), 'error');
      return;
    }
    if (
      reservePrice !== undefined &&
      (!Number.isFinite(reservePrice) || reservePrice < 10000 || reservePrice > startingPrice)
    ) {
      notify(t('auctions.consignment.reserveRangeErr'), 'error');
      return;
    }
    const parcelCheck = parseConsignmentParcel(form);
    if (!parcelCheck.ok) {
      notify(parcelCheck.message, 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      notify(t('auctions.consignment.uploadingItems'));
      const images = await uploadConsignmentFiles(
        itemImages,
        t('auctions.consignment.itemPhotosLabel'),
      );
      notify(t('auctions.consignment.uploadingCerts'));
      const certificates = await uploadConsignmentFiles(
        certificateImages,
        t('auctions.consignment.certPhotosLabel'),
      );
      const response = await registerAuctionItemApi(form.auctionId, {
        title: form.title.trim(),
        description: form.description.trim(),
        images,
        proposedStartingPrice: startingPrice,
        ...(reservePrice !== undefined ? { proposedReservePrice: reservePrice } : {}),
        proposedBidIncrement: bidIncrement,
        weightGrams: parcelCheck.parcel.weightGrams,
        lengthCm: parcelCheck.parcel.lengthCm,
        widthCm: parcelCheck.parcel.widthCm,
        heightCm: parcelCheck.parcel.heightCm,
        ...(form.appraisalCertificateNumber.trim()
          ? { appraisalCertificateNumber: form.appraisalCertificateNumber.trim() }
          : {}),
        ...(form.appraisalAgency.trim() ? { appraisalAgency: form.appraisalAgency.trim() } : {}),
        certificateImages: certificates,
        ...(form.certificateIssueDate
          ? { certificateIssueDate: new Date(form.certificateIssueDate).toISOString() }
          : {}),
      });
      notify(response.message || t('auctions.consignment.submitSuccess'), 'success');
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
      <Panel
        title={t('auctions.consignment.itemPhotosTitle')}
        subtitle={t('auctions.consignment.itemPhotosSubtitle')}
      >
        <ConsignmentImagePicker
          files={itemImages}
          onFilesChange={setItemImages}
          onError={(message) => notify(message, 'error')}
          label={t('auctions.consignment.chooseItemPhotos')}
          previewLabel={t('auctions.consignment.itemPhotosLabel')}
          previewDescription={t('auctions.consignment.previewDescCover')}
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
          {t('auctions.consignment.cancel')}
        </SellerLink>
        <SellerButton
          type="submit"
          disabled={isSubmitting || isLoading || !eligibleAuctions.length}
        >
          {isSubmitting ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
          {isSubmitting
            ? t('auctions.consignment.submitting')
            : t('auctions.consignment.submitBtn')}
        </SellerButton>
      </div>
    </form>
  );
}
