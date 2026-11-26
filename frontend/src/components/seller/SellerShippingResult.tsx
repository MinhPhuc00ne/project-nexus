import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import type { DistanceResult, ShippingQuote } from '../../types/shipping.types';
import { Panel } from './SellerUI';

export default function SellerShippingResult({
  quote,
  distance,
}: {
  quote: ShippingQuote | null;
  distance: DistanceResult | null;
}): ReactElement | null {
  const { t } = useTranslation('seller');
  const metrics =
    quote?.metrics ?? (distance && { ...distance, calculationMethod: distance.method });
  const total = quote?.rates.finalShippingFee ?? distance?.totalFee;
  if (!metrics || total === undefined) return null;
  return (
    <Panel title={t('shipping.result.title')}>
      <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries({
          [t('shipping.result.distance')]: `${metrics.distanceKm} km`,
          [t('shipping.result.duration')]: t('shipping.result.durationValue', {
            minutes: metrics.durationMinutes,
          }),
          [t('shipping.result.weight')]:
            `${'actualWeightKg' in metrics ? metrics.actualWeightKg : (metrics.chargeableWeightKg ?? 0)} kg`,
          [t('shipping.result.estimatedFee')]: formatCurrency(total),
        }).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-blue-50 p-4">
            <dt className="text-slate-500">{label}</dt>
            <dd className="mt-2 font-semibold text-blue-800">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-slate-500">
        {metrics.calculationMethod === 'OSRM_ROUTING'
          ? t('shipping.result.osrmRoute')
          : t('shipping.result.straightEstimate')}{' '}
        {t('shipping.result.durationDisclaimer')}
      </p>
      {quote && (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            {t('shipping.result.origin', {
              name: quote.origin.name,
              address: quote.origin.addressText,
            })}
          </p>
          <p>
            {t('shipping.result.distanceFee', {
              fee: formatCurrency(quote.rates.finalShippingFee),
            })}
          </p>
          <p>
            {t('shipping.result.ghnFee')}{' '}
            {quote.rates.ghnCarrierFee === null
              ? t('shipping.result.ghnFallback')
              : formatCurrency(quote.rates.ghnCarrierFee)}
          </p>
        </div>
      )}
    </Panel>
  );
}
