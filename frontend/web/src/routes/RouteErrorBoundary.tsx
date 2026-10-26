import { Component, type ReactNode } from 'react';

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
        <h1 className="text-xl font-semibold">Không thể tải trang</h1>
        <p>Vui lòng kiểm tra kết nối và tải lại trang để thử lại.</p>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Tải lại trang
        </button>
      </main>
    );
  }
}
