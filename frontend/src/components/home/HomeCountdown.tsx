export function TimerBox({ value }: { value: string }) {
  return (
    <span className="min-w-[2.25em] rounded bg-slate-800 px-2 py-1 text-center font-mono text-xs font-bold tabular-nums text-white">
      {value}
    </span>
  );
}

export interface HomeCountdownProps {
  values?: [string, string, string];
}

export function HomeCountdown({ values = ['02', '45', '17'] }: HomeCountdownProps) {
  return (
    <div className="flex items-center gap-1">
      <TimerBox value={values[0]} />
      <span>:</span>
      <TimerBox value={values[1]} />
      <span>:</span>
      <TimerBox value={values[2]} />
    </div>
  );
}
