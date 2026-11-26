import type { ReactNode } from 'react';

export default function BuyerPageHeader({
  title,
  description,
  icon,
  actions,
  heading = 'h1',
  className = '',
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  heading?: 'h1' | 'h2';
  className?: string;
}) {
  const Heading = heading;
  return (
    <header className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 flex-1 basis-full items-start gap-3 sm:basis-auto">
        {icon && (
          <span
            aria-hidden="true"
            className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary sm:flex"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <Heading className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {title}
          </Heading>
          {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
