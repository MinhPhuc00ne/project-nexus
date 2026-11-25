import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import ConsignmentImagePicker from './ConsignmentImagePicker';
import type { ConsignmentFormState } from './sellerConsignmentHelpers';
import { Panel } from './SellerUI';

/**
 * Properties for the appraisal certificate details and image panel.
 */
export interface SellerConsignmentCertificateFieldsProps {
  form: ConsignmentFormState;
  updateForm: (key: keyof ConsignmentFormState, value: string) => void;
  certificateImages: File[];
  onCertificateImagesChange: (files: File[]) => void;
  onError: (message: string) => void;
}

/**
 * Renders appraisal metadata and required certificate image controls.
 *
 * @param props - Certificate form values, file state, and update callbacks.
 * @returns Certificate details and upload panel.
 */
export default function SellerConsignmentCertificateFields({
  form,
  updateForm,
  certificateImages,
  onCertificateImagesChange,
  onError,
}: SellerConsignmentCertificateFieldsProps): ReactElement {
  const { t } = useTranslation('seller');
  return (
    <Panel
      title={t('auctions.consignment.certTitle')}
      subtitle={t('auctions.consignment.certSubtitle')}
    >
      <div className="grid gap-4 md:grid-cols-2 [&_label]:space-y-1.5 [&_label]:text-sm [&_label]:font-medium [&_label]:text-slate-700 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm">
        <label>
          {t('auctions.consignment.certNumberLabel')}
          <input
            value={form.appraisalCertificateNumber}
            onChange={(event) => updateForm('appraisalCertificateNumber', event.target.value)}
            placeholder={t('auctions.consignment.certNumberPlaceholder')}
          />
        </label>
        <label>
          {t('auctions.consignment.certAgencyLabel')}
          <input
            value={form.appraisalAgency}
            onChange={(event) => updateForm('appraisalAgency', event.target.value)}
            placeholder={t('auctions.consignment.certAgencyPlaceholder')}
          />
        </label>
        <label>
          {t('auctions.consignment.certDateLabel')}
          <input
            type="date"
            value={form.certificateIssueDate}
            onChange={(event) => updateForm('certificateIssueDate', event.target.value)}
          />
        </label>
      </div>
      <ConsignmentImagePicker
        files={certificateImages}
        onFilesChange={onCertificateImagesChange}
        onError={onError}
        label={t('auctions.consignment.chooseCertPhotos')}
        previewLabel={t('auctions.consignment.certPhotosLabel')}
        previewDescription=""
      />
    </Panel>
  );
}
