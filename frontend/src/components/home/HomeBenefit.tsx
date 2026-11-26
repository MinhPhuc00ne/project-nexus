import type { HomeBenefitProps } from './home.types';

export function HomeBenefit({ icon, title }: HomeBenefitProps) {
  return (
    <div className="flex min-h-[80px] items-center justify-center gap-3 rounded-xl bg-slate-50 p-3 text-center">
      <div className="text-primary">{icon}</div>
      <span className="text-sm font-medium text-slate-700">{title}</span>
    </div>
  );
}
