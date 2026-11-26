import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuctionEntity } from '@/features/auction/services/auction.service';
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
  const { t } = useTranslation('seller');
  return (
    <>
      <Panel
        title={t('auctions.consignment.fieldsTitle')}
        subtitle={t('auctions.consignment.fieldsSubtitle')}
      >
        <div className="grid gap-4 md:grid-cols-2 [&_label]:space-y-1.5 [&_label]:text-sm [&_label]:font-medium [&_label]:text-slate-700 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm">
          <label className="md:col-span-2">
            {t('auctions.consignment.sessionLabel')}
            <select
              required
              value={form.auctionId}
              onChange={(event) => updateForm('auctionId', event.target.value)}
              disabled={isLoading || !eligibleAuctions.length}
            >
              <option value="">
                {isLoading
                  ? t('auctions.consignment.loadingSessions')
                  : t('auctions.consignment.selectSession')}
              </option>
              {eligibleAuctions.map((auction) => (
                <option key={auction.id} value={auction.id}>
                  {t('auctions.consignment.sessionOption', {
                    title: auction.title,
                    date: formatConsignmentDate(auction.startTime),
                  })}
                </option>
              ))}
            </select>
            {!isLoading && !eligibleAuctions.length && (
              <small className="block font-normal text-amber-700">
                {t('auctions.consignment.noEligibleSessions')}
              </small>
            )}
            {form.auctionId &&
              (() => {
                const selectedAuction = eligibleAuctions.find(
                  (auction) => auction.id === form.auctionId,
                );
                return selectedAuction?.consignmentDeadline ? (
                  <small className="mt-1 block font-normal text-slate-500">
                    {t('auctions.consignment.deadline', {
                      date: formatConsignmentDate(selectedAuction.consignmentDeadline),
                    })}
                  </small>
                ) : null;
              })()}
          </label>
          <label className="md:col-span-2">
            {t('auctions.consignment.itemTitleLabel')}
            <input
              required
              maxLength={160}
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              placeholder={t('auctions.consignment.itemTitlePlaceholder')}
            />
          </label>
          <label className="md:col-span-2">
            {t('auctions.consignment.itemDescLabel')}
            <textarea
              required
              rows={5}
              maxLength={5000}
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              placeholder={t('auctions.consignment.itemDescPlaceholder')}
            />
          </label>
          <label>
            {t('auctions.consignment.startPriceLabel')}
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
            {t('auctions.consignment.incrementLabel')}
            <input
              required
              min="1000"
              type="number"
              value={form.proposedBidIncrement}
              onChange={(event) => updateForm('proposedBidIncrement', event.target.value)}
            />
          </label>
          <label>
            {t('auctions.consignment.reservePriceLabel')}
            <input
              min="10000"
              type="number"
              value={form.proposedReservePrice}
              onChange={(event) => updateForm('proposedReservePrice', event.target.value)}
              placeholder={t('auctions.consignment.optionalPlaceholder')}
            />
          </label>
        </div>
      </Panel>
      <Panel
        title={t('auctions.consignment.parcelTitle')}
        subtitle={t('auctions.consignment.parcelSubtitle')}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&_label]:space-y-1.5 [&_label]:text-sm [&_label]:font-medium [&_label]:text-slate-700 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm">
          <label>
            {t('auctions.consignment.weightGrams')}
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
            {t('auctions.consignment.lengthCm')}
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
            {t('auctions.consignment.widthCm')}
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
            {t('auctions.consignment.heightCm')}
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
