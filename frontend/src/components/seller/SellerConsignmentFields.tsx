import { type ReactElement } from 'react';
import type { AuctionEntity } from '../../services/auction.service';
import { formatConsignmentDate, type ConsignmentFormState } from './sellerConsignmentHelpers';
import { Panel } from './SellerUI';

/**
 * Properties used to render and update the consignment item and package fields.
 */
export interface SellerConsignmentFieldsProps {
  form: ConsignmentFormState;
  eligibleAuctions: AuctionEntity[];
  isLoading: boolean;
  updateForm: (key: keyof ConsignmentFormState, value: string) => void;
}

/**
 * Renders the auction, item, pricing, and package fields for a consignment.
 *
 * @param props - Current form values, eligible sessions, loading state, and updater.
 * @returns Consignment details and package sizing panels.
 */
export default function SellerConsignmentFields({
  form,
  eligibleAuctions,
  isLoading,
  updateForm,
}: SellerConsignmentFieldsProps): ReactElement {
  return (
    <>
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
                  {auction.title} · Bắt đầu {formatConsignmentDate(auction.startTime)}
                </option>
              ))}
            </select>
            {!isLoading && !eligibleAuctions.length && (
              <small className="block font-normal text-amber-700">
                Hiện chưa có phiên ở trạng thái nhận ký gửi. Hãy chờ Admin mở phiên mới.
              </small>
            )}
            {form.auctionId &&
              (() => {
                const selectedAuction = eligibleAuctions.find(
                  (auction) => auction.id === form.auctionId,
                );
                return selectedAuction?.consignmentDeadline ? (
                  <small className="mt-1 block font-normal text-slate-500">
                    Hạn nhận ký gửi: {formatConsignmentDate(selectedAuction.consignmentDeadline)}
                  </small>
                ) : null;
              })()}
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
            Giá sàn (₫)
            <input
              min="10000"
              type="number"
              value={form.proposedReservePrice}
              onChange={(event) => updateForm('proposedReservePrice', event.target.value)}
              placeholder="Không bắt buộc"
            />
          </label>
        </div>
      </Panel>
      <Panel
        title="Kích thước đóng gói & vận chuyển GHN"
        subtitle="Nhập cân nặng và kích thước kiện hàng thực tế để tính cước Giao Hàng Nhanh chính xác khi bàn giao."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&_label]:space-y-1.5 [&_label]:text-sm [&_label]:font-medium [&_label]:text-slate-700 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm">
          <label>
            Cân nặng (gram) *
            <input
              required
              min="1"
              max="50000"
              step="1"
              type="number"
              value={form.weightGrams}
              onChange={(event) => updateForm('weightGrams', event.target.value)}
            />
          </label>
          <label>
            Dài (cm) *
            <input
              required
              min="1"
              max="200"
              step="1"
              type="number"
              value={form.lengthCm}
              onChange={(event) => updateForm('lengthCm', event.target.value)}
            />
          </label>
          <label>
            Rộng (cm) *
            <input
              required
              min="1"
              max="200"
              step="1"
              type="number"
              value={form.widthCm}
              onChange={(event) => updateForm('widthCm', event.target.value)}
            />
          </label>
          <label>
            Cao (cm) *
            <input
              required
              min="1"
              max="200"
              step="1"
              type="number"
              value={form.heightCm}
              onChange={(event) => updateForm('heightCm', event.target.value)}
            />
          </label>
        </div>
      </Panel>
    </>
  );
}
