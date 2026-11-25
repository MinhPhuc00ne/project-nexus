import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { minEndDateTime } from '../../../utils/date-time';

type Props = {
  value: string;
  startTime: string;
  endTime: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export default function ConsignmentDeadlineField({
  value,
  startTime,
  endTime,
  onChange,
  required = false,
}: Props) {
  const { t } = useTranslation('admin');
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
      ? t('auctions.create.errDeadline')
      : '';

  useEffect(() => {
    input.current?.setCustomValidity(error);
  }, [error]);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-medium">
        {t('auctions.create.deadline.label')}{' '}
        {required ? (
          <span className="text-red-600">*</span>
        ) : (
          <span className="font-normal text-slate-500">
            {t('auctions.create.deadline.optional')}
          </span>
        )}
      </label>
      <input
        ref={input}
        id={id}
        name="consignmentDeadline"
        type="datetime-local"
        step={60}
        required={required}
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
          {t('auctions.create.deadline.clear')}
        </button>
      )}
      <p id={`${id}-hint`} className="text-xs text-slate-500">
        {!hasSchedule
          ? t('auctions.create.deadline.hintNoSchedule')
          : !hasAvailableTime
            ? t('auctions.create.deadline.hintTooShort')
            : t('auctions.create.deadline.hintValid')}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
