import { TrendingUp } from 'lucide-react';
import { Badge, Panel } from '../shared/AdminUI';
import {
  mockBidFrequencyValues,
  mockBidFrequencyLabels,
  mockBidFrequencySummary,
} from './mockData/dashboard';

export default function BidFrequency() {
  return (
    <Panel
      title="Tần suất khớp lệnh theo giờ"
      subtitle={mockBidFrequencySummary.subtitle}
      icon={<TrendingUp size={19} />}
      action={<Badge>● LIVE</Badge>}
    >
      <div className="flex h-28 items-end gap-1.5 rounded-xl bg-blue-50/70 px-3 pt-3">
        {mockBidFrequencyValues.map((value, index) => (
          <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2">
            <div
              className={`min-h-1 rounded-t ${index === 6 || index === 7 ? 'bg-primary' : 'bg-blue-300'}`}
              style={{ height: `${value * 0.8}%` }}
              title={`${mockBidFrequencyLabels[index]}: ${value * mockBidFrequencySummary.bidsPerUnit} lượt trả giá (demo)`}
            />
            <span className="pb-2 text-center text-[8px] text-slate-500">
              {mockBidFrequencyLabels[index]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2 text-[11px]">
        <p className="text-slate-500">
          Khung {mockBidFrequencySummary.peakWindow} đạt:
          <br />
          <strong className="text-primary">
            {mockBidFrequencySummary.peakBidsPerMinute.toLocaleString('vi-VN')} bids/phút
          </strong>
        </p>
        <Badge>{mockBidFrequencySummary.health}</Badge>
      </div>
    </Panel>
  );
}
