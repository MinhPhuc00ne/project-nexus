import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import RouteContent from '../../routes/RouteContent';

/** Animate the content on navigation without remounting forms or page state. */
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const animation = ref.current?.animate?.(
      [
        { opacity: 0, translate: '0 6px' },
        { opacity: 1, translate: '0 0' },
      ],
      { duration: 200, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
    );
    return () => animation?.cancel();
  }, [pathname]);

  return (
    <div ref={ref} className="nexus-page">
      <RouteContent>{children}</RouteContent>
    </div>
  );
}
