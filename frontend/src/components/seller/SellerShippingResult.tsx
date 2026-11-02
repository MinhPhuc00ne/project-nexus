import type { ReactElement } from 'react';
import type { DistanceResult, ShippingQuote } from '../../types/shipping.types';
import { Panel } from './SellerUI';

export default function SellerShippingResult({
  quote,
  distance,
}: {
  quote: ShippingQuote | null;
  distance: DistanceResult | null;
}): ReactElement | null {
  const metrics =
    quote?.metrics ?? (distance && { ...distance, calculationMethod: distance.method });
  const total = quote?.rates.finalShippingFee ?? distance?.totalFee;
  if (!metrics || total === undefined) return null;
  const currency = (value: number): string => `${value.toLocaleString('vi-VN')} ₫`;
  return (
    <Panel title="Kết quả tra cứu">
      <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries({
          'Khoảng cách': `${metrics.distanceKm} km`,
          'Thời gian di chuyển dự kiến': `${metrics.durationMinutes} phút`,
          'Khối lượng tính cước': `${metrics.chargeableWeightKg} kg`,
          'Cước dự kiến': currency(total),
        }).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-blue-50 p-4">
            <dt className="text-slate-500">{label}</dt>
            <dd className="mt-2 font-semibold text-blue-800">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-slate-500">
        {metrics.calculationMethod === 'OSRM_ROUTING'
          ? 'Khoảng cách theo tuyến đường bộ.'
          : 'Khoảng cách ước tính; chưa lấy được tuyến đường bộ.'}{' '}
        Thời gian trên là thời gian di chuyển ước tính, chưa phải cam kết thời gian giao hàng.
      </p>
      {quote && (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            Điểm gửi: {quote.origin.name} · {quote.origin.addressText}
          </p>
          <p>Cước theo khoảng cách: {currency(quote.rates.distanceTotalFee)}</p>
          <p>
            Cước GHN:{' '}
            {quote.rates.ghnCarrierFee === null
              ? 'Chưa có báo giá GHN; đang dùng cước theo khoảng cách.'
              : currency(quote.rates.ghnCarrierFee)}
          </p>
        </div>
      )}
    </Panel>
  );
}
