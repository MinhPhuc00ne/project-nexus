import type { HomeBenefitProps } from './home.types';

export function HomeBenefit({ icon, title }: HomeBenefitProps) {
  return (
    <div className="flex min-h-[80px] items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <div className="text-orange-500">{icon}</div>
      <span className="text-xs font-bold text-slate-700">{title}</span>
    </div>
  );
}
