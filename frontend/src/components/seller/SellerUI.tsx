import { Button, buttonVariants } from '../ui/button';
import { cn } from '../../lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight as RightOutlined,
  Database as DatabaseOutlined,
  Inbox as InboxOutlined,
  ShieldCheck as SafetyCertificateOutlined,
} from 'lucide-react';
export function SellerButton({
  children,
  secondary = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return (
    <Button
      type="button"
      variant={secondary ? 'outline' : 'default'}
      className={cn(className)}
      data-seller={secondary ? 'button button-secondary' : 'button'}
      {...props}
    >
      {children}
    </Button>
  );
}
export function SellerLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={cn(buttonVariants({ variant: secondary ? 'outline' : 'default' }))}
      data-seller="button button-secondary"
      to={to}
    >
      {children}
    </Link>
  );
}
export function Badge({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'gray' | 'red';
}) {
  const colors = {
    blue: 'border-blue-100 bg-blue-50 text-primary',
    green: 'border-[#d5f1e5] bg-[#ecfaf4] text-[#0c9978]',
    amber: 'border-[#fbebc9] bg-[#fff8eb] text-[#bf8b26]',
    gray: 'border-[#e8edf5] bg-[#f2f5fa] text-[#7c8ba4]',
    red: 'border-[#f9dfe5] bg-[#fff0f2] text-[#ce596b]',
  };
  return (
    <span
      className={cn(
        `inline-flex items-center gap-1 rounded-lg py-1 px-2.5 text-xs font-semibold leading-[1.4] border border-solid border-transparent w-[fit-content] ${colors[tone]}`,
      )}
      data-seller="badge"
    >
      {children}
    </span>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        `nexus-panel p-5 sm:p-6 min-w-0 [&>[data-seller~=text-button]]:mt-4.5 [&>[data-seller~=button]]:mt-4.5 min-[1600px]:p-[25px] max-[1050px]:p-4.5 max-[540px]:p-[17px] ${className}`,
      )}
      data-seller="panel"
    >
      <div
        className="mb-5 flex items-start justify-between gap-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted"
        data-seller="panel-heading"
      >
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function PageHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const { t } = useTranslation('seller');
  return (
    <header className="space-y-3">
      <nav
        className="flex flex-wrap items-center gap-2 text-xs text-muted [&>span]:text-ink"
        data-seller="breadcrumb"
        aria-label={t('ui.breadcrumbAria')}
      >
        <Link to="/seller">{t('ui.sellerCenter')}</Link>
        <RightOutlined className="text-[13px]" aria-hidden="true" />
        <span>{title}</span>
      </nav>
      <div
        className="flex flex-wrap items-start justify-between gap-4 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-ink sm:[&_h1]:text-3xl [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted"
        data-seller="page-heading"
      >
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className="flex items-center gap-[9px] flex-wrap" data-seller="actions">
          {actions}
        </div>
      </div>
    </header>
  );
}
/**
 * Says where a panel's figures come from.
 *
 * This used to offer a "view sample data" button that swapped the panels for
 * invented figures — a revenue of 348,6M, three pending orders, two live lots.
 * The panels read the shop's own figures now, so there is nothing to swap to,
 * and a button that fills a dashboard with numbers nobody earned is worse than
 * an empty one.
 */
export function ModuleNotice({ label }: { label: string }) {
  const { t } = useTranslation('seller');
  return (
    <div
      className="flex items-center gap-2 text-[#8b98ad] text-[10px] py-0 px-0.5 my-[-6px] mx-0 [&>svg]:text-[#93a4be]! [&>svg]:shrink-0 max-[540px]:items-start max-[540px]:text-[9px] max-[540px]:gap-1.5 max-[540px]:flex-wrap max-[540px]:[&>span]:flex-1"
      data-seller="module-notice"
    >
      <DatabaseOutlined className="text-[16px]" aria-hidden="true" />
      <span>{t('ui.liveData', { label })}</span>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useTranslation('seller');
  return (
    <div
      className="flex min-h-52 flex-col items-center justify-center gap-3 px-4 py-12 text-center [&_h3]:text-sm [&_h3]:font-semibold [&_p]:max-w-sm [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted"
      data-seller="empty"
    >
      <div
        className="mb-1 grid size-14 place-items-center rounded-2xl bg-blue-50 text-primary"
        data-seller="empty-icon"
      >
        <InboxOutlined className="text-[28px]" aria-hidden="true" />
      </div>
      <h3>{title || t('ui.emptyTitle')}</h3>
      <p>{description || t('ui.emptyDesc')}</p>
      {action}
    </div>
  );
}
export function StatCard({
  label,
  value,
  detail,
  icon,
  note,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div
      className="nexus-panel min-w-0 px-5 pt-5 [&>strong]:mt-4 [&>strong]:block [&>strong]:text-3xl [&>strong]:font-semibold [&>strong]:tracking-tight [&>strong]:text-ink [&>strong]:[overflow-wrap:anywhere]"
      data-seller="stat"
    >
      <div
        className="flex min-h-9 items-center justify-between gap-2 text-sm font-semibold text-muted [&_i]:grid [&_i]:size-9 [&_i]:shrink-0 [&_i]:place-items-center [&_i]:rounded-xl [&_i]:bg-blue-50 [&_i]:text-primary"
        data-seller="stat-top"
      >
        <span>{label}</span>
        <i>{icon}</i>
      </div>
      <strong>{value}</strong>
      <div
        className="my-3 min-h-5 text-xs text-muted [&>span]:flex [&>span]:items-center [&>span]:gap-1.5"
        data-seller="stat-detail"
      >
        {detail}
      </div>
      {note && (
        <div
          className="min-h-10 border-t border-line py-3 text-xs text-muted [&_a]:flex [&_a]:items-center [&_a]:justify-between [&_a]:text-primary"
          data-seller="stat-note"
        >
          {note}
        </div>
      )}
    </div>
  );
}
export function PolicyCards() {
  const { t } = useTranslation('seller');
  return (
    <div
      className="grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-4.5 max-[1050px]:gap-3 max-[540px]:[grid-template-columns:1fr]"
      data-seller="policy-grid"
    >
      {[
        [t('ui.policies.escrowTitle'), t('ui.policies.escrowBody')],
        [t('ui.policies.packagingTitle'), t('ui.policies.packagingBody')],
        [t('ui.policies.reputationTitle'), t('ui.policies.reputationBody')],
      ].map(([title, body]) => (
        <div
          className="nexus-panel p-5 [&>svg]:mb-3 [&>svg]:text-primary [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted"
          data-seller="policy"
          key={title}
        >
          <SafetyCertificateOutlined className="text-[21px]" aria-hidden="true" />
          <h3>{title}</h3>
          <p>{body}</p>
        </div>
      ))}
    </div>
  );
}
export function exportCsv(filename: string, rows: (string | number)[][]) {
  const escape = (value: string | number) =>
    `"${String(value)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replace(/"/g, '""')}"`;
  const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(escape).join(',')).join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
