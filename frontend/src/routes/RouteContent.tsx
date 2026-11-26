import { Suspense, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Keep the workspace chrome mounted while a child route's code loads. */
export default function RouteContent({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-48 items-center justify-center gap-3 p-6 text-sm text-muted"
        >
          <span
            aria-hidden="true"
            className="size-5 rounded-full border-2 border-blue-100 border-t-primary motion-safe:animate-spin"
          />
          {t('states.loadingPage')}
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
