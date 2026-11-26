import { useEffect, useState } from 'react';

export function TimerBox({ value }: { value: string }) {
  return (
    <span className="min-w-[2.25em] rounded bg-slate-800 px-2 py-1 text-center font-mono text-xs font-bold tabular-nums text-white">
      {value}
    </span>
  );
}

export interface HomeCountdownProps {
  /** When the soonest discount in the section ends, as the API reports it. */
  endsAt?: string | null;
}

/** Hours, minutes and seconds left, or null once there is nothing left. */
function remainingParts(endsAt: string): [string, string, string] | null {
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;
  const milliseconds = end - Date.now();
  if (milliseconds <= 0) return null;
  const totalSeconds = Math.floor(milliseconds / 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    pad(Math.floor(totalSeconds / 3600)),
    pad(Math.floor(totalSeconds / 60) % 60),
    pad(totalSeconds % 60),
  ];
}

/**
 * Counts down to the end of the discount on show.
 *
 * This used to render a fixed `02:45:17`. It never moved and it counted down to
 * nothing: there was no sale window behind it, so the urgency it created was
 * invented. Products carry the end of their discount, so the section passes the
 * soonest one and this ticks towards it — and renders nothing at all when no
 * discount on the page has an end date.
 *
 * @param props - When the soonest discount ends.
 */
export function HomeCountdown({ endsAt }: HomeCountdownProps) {
  const [parts, setParts] = useState(() => (endsAt ? remainingParts(endsAt) : null));

  useEffect(() => {
    if (!endsAt) {
      setParts(null);
      return;
    }
    setParts(remainingParts(endsAt));
    const timer = setInterval(() => setParts(remainingParts(endsAt)), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (!parts) return null;

  return (
    <div className="flex items-center gap-1">
      <TimerBox value={parts[0]} />
      <span>:</span>
      <TimerBox value={parts[1]} />
      <span>:</span>
      <TimerBox value={parts[2]} />
    </div>
  );
}
