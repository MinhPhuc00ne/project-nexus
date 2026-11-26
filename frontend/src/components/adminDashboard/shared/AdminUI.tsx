import { Search, Inbox } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button as ShadcnButton } from '../../ui/button';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';

export function Panel({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`min-w-0 p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
              {icon}
            </span>
          )}
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm leading-relaxed text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const colors = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-blue-50 text-primary hover:bg-blue-100',
    danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
  };

  return (
    <ShadcnButton
      variant={
        variant === 'danger' ? 'destructive' : variant === 'secondary' ? 'secondary' : 'default'
      }
      className={`h-auto min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold focus-visible:outline-primary disabled:cursor-not-allowed ${colors[variant]} ${className}`}
      {...props}
    >
      {children}
    </ShadcnButton>
  );
}

export function Badge({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: 'blue' | 'green' | 'red' | 'amber' | 'gray';
}) {
  const colors = {
    blue: 'bg-blue-50 text-primary',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-slate-100 text-slate-600',
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${colors[tone]}`}
    >
      {children}
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation('admin');
  const resolvedPlaceholder = placeholder ?? t('shared.searchPlaceholder');
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-slate-50/60 px-3.5 py-2.5 text-slate-400 transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
      <Search size={16} />
      <Input
        className="h-auto w-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-sm text-ink shadow-none outline-none placeholder:text-slate-400 focus-visible:outline-none"
        aria-label={resolvedPlaceholder}
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function EmptyState({ text }: { text?: string }) {
  const { t } = useTranslation('admin');
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-14 text-center text-sm text-muted">
      <span className="grid size-14 place-items-center rounded-2xl bg-blue-50 text-primary">
        <Inbox size={26} strokeWidth={1.5} />
      </span>
      <p className="max-w-sm leading-relaxed">{text ?? t('shared.emptyDefault')}</p>
    </div>
  );
}
