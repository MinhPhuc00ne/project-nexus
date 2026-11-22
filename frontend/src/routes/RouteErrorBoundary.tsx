import { Component, type ReactNode } from 'react';
import i18n from '../i18n';

export default class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center text-slate-700"
      >
        <h1 className="text-xl font-semibold">{i18n.t('common:errorBoundary.title')}</h1>
        <p>{i18n.t('common:errorBoundary.description')}</p>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          {i18n.t('common:errorBoundary.reload')}
        </button>
      </main>
    );
  }
}
