import { useEffect, useId, useRef } from 'react';
import { minEndDateTime } from '../../../utils/date-time';

type Props = {
  value: string;
  startTime: string;
  endTime: string;
  onChange: (value: string) => void;
};

export default function ConsignmentDeadlineField({ value, startTime, endTime, onChange }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const deadline = new Date(value).getTime();
  const hasSchedule = Number.isFinite(start) && Number.isFinite(end) && end > start;
  const min = minEndDateTime(startTime);
  const latest = new Date(end - 60_000);
  const max = Number.isFinite(end)
    ? new Date(latest.getTime() - latest.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    : undefined;
  const hasAvailableTime = hasSchedule && !!min && !!max && min <= max;
  const error =
    value && (!hasSchedule || !Number.isFinite(deadline) || deadline <= start || deadline >= end)
      ? 'Hạn ký gửi phải sau thời gian bắt đầu và trước thời gian kết thúc phiên.'
      : '';

  useEffect(() => {
    input.current?.setCustomValidity(error);
  }, [error]);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-medium">
        Hạn ký gửi <span className="font-normal text-slate-500">(không bắt buộc)</span>
      </label>
      <input
        ref={input}
        id={id}
        name="consignmentDeadline"
        type="datetime-local"
        step={60}
        value={value}
        min={min}
        max={max}
        disabled={!hasAvailableTime}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!!error}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-xs text-blue-600 hover:underline"
        >
          Bỏ hạn ký gửi
        </button>
      )}
      <p id={`${id}-hint`} className="text-xs text-slate-500">
        {!hasSchedule
          ? 'Chọn lịch bắt đầu và kết thúc phiên trước khi chọn hạn ký gửi.'
          : !hasAvailableTime
            ? 'Lịch phiên cần cách nhau ít nhất 2 phút để chọn hạn ký gửi ở giữa.'
            : 'Chọn hạn ký gửi sau giờ bắt đầu và trước giờ kết thúc phiên, tối thiểu 1 phút mỗi phía.'}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
