import { type ReactElement } from 'react';
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
  return (
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
      </div>
      <ConsignmentImagePicker
        files={certificateImages}
        onFilesChange={onCertificateImagesChange}
        onError={onError}
        label="Chọn ảnh chứng thư / giấy tờ *"
        previewLabel="ảnh chứng thư"
        previewDescription=""
      />
    </Panel>
  );
}
