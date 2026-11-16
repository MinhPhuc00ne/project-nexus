import { ApiRequestError, apiRequest } from '../../services/api';

/**
 * Auction fields used to decide whether a seller can still submit a consignment.
 */
export interface ConsignmentEligibleAuction {
  status: string;
  isConsignmentLocked?: boolean | null;
  consignmentDeadline?: string | null;
}

/**
 * Checks whether an auction is scheduled, unlocked, and still accepting consignments.
 *
 * @param auction - Auction lifecycle and consignment deadline fields.
 * @returns True when the seller can submit an item to the auction.
 */
export function canSubmitConsignment(auction: ConsignmentEligibleAuction): boolean {
  const isScheduled = auction.status === 'SCHEDULED' || auction.status === 'scheduled';
  const deadline = auction.consignmentDeadline;
  return (
    isScheduled &&
    !auction.isConsignmentLocked &&
    (!deadline || new Date(deadline).getTime() > Date.now())
  );
}

/**
 * State container for consignment registration form inputs.
 */
export type ConsignmentFormState = {
  auctionId: string;
  title: string;
  description: string;
  proposedStartingPrice: string;
  proposedReservePrice: string;
  proposedBidIncrement: string;
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  appraisalCertificateNumber: string;
  appraisalAgency: string;
  certificateIssueDate: string;
};

/**
 * Initial empty state for the consignment registration form.
 */
export const initialConsignmentForm: ConsignmentFormState = {
  auctionId: '',
  title: '',
  description: '',
  proposedStartingPrice: '',
  proposedReservePrice: '',
  proposedBidIncrement: '100000',
  weightGrams: '500',
  lengthCm: '20',
  widthCm: '15',
  heightCm: '10',
  appraisalCertificateNumber: '',
  appraisalAgency: '',
  certificateIssueDate: '',
};

/**
 * Validates and converts consignment parcel sizing inputs for GHN shipping quotes.
 *
 * @param form - Current consignment form state.
 * @returns Validated integer parcel values or a localized validation error message.
 */
export function parseConsignmentParcel(
  form: Pick<ConsignmentFormState, 'weightGrams' | 'lengthCm' | 'widthCm' | 'heightCm'>,
):
  | {
      ok: true;
      parcel: { weightGrams: number; lengthCm: number; widthCm: number; heightCm: number };
    }
  | { ok: false; message: string } {
  const weightGrams = Number(form.weightGrams);
  const lengthCm = Number(form.lengthCm);
  const widthCm = Number(form.widthCm);
  const heightCm = Number(form.heightCm);
  if (!Number.isInteger(weightGrams) || weightGrams < 1 || weightGrams > 50000) {
    return { ok: false, message: 'Cân nặng đóng gói phải là số nguyên từ 1 đến 50.000 gram.' };
  }
  const dimensionsValid = [lengthCm, widthCm, heightCm].every(
    (value) => Number.isInteger(value) && value >= 1 && value <= 200,
  );
  if (!dimensionsValid) {
    return {
      ok: false,
      message: 'Kích thước Dài, Rộng, Cao phải là số nguyên từ 1 đến 200 cm.',
    };
  }
  return { ok: true, parcel: { weightGrams, lengthCm, widthCm, heightCm } };
}

/**
 * Formats ISO date-time string into Vietnamese regional medium date and short time format.
 *
 * @param value - ISO 8601 date string.
 * @returns Human-readable localized formatted date.
 */
export const formatConsignmentDate = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

/**
 * Normalizes unknown rejection or error instances into user-friendly message strings.
 *
 * @param error - Caught error or exception instance.
 * @returns User-facing error message with status codes if available.
 */
export function getConsignmentErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return `${error.message} (HTTP ${error.status})`;
  return error instanceof Error ? error.message : 'Có lỗi không xác định. Vui lòng thử lại.';
}

/**
 * Uploads a list of image files to the media storage service and returns their public URLs.
 *
 * @param files - Array of image files selected by the user.
 * @param label - Human-readable label for error messaging.
 * @returns Resolves with array of public hosted asset URLs.
 */
export async function uploadConsignmentFiles(files: File[], label: string): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const body = new FormData();
    body.append('file', file);
    const result = await apiRequest<{ url: string }>('/media/upload', {
      method: 'POST',
      body,
      isFormData: true,
      requireAuth: true,
    });
    if (!result?.url || !/^https?:\/\//i.test(result.url)) {
      throw new Error(`Máy chủ chưa trả URL hợp lệ cho ${label}.`);
    }
    urls.push(result.url);
  }
  return urls;
}
