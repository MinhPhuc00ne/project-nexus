import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useAdminContext } from '../useAdminContext';

function ChildConsumer() {
  const ctx = useAdminContext();
  return <div data-testid="admin-ctx">{`${ctx.searchQuery}:${ctx.activeTab}`}</div>;
}

function LayoutWrapper({ value }: { value: Record<string, unknown> }) {
  return <Outlet context={value} />;
}

describe('useAdminContext', () => {
  it('reads shared admin outlet context from parent layout', () => {
    render(
      <MemoryRouter initialEntries={['/admin/overview']}>
        <Routes>
          <Route
            element={<LayoutWrapper value={{ searchQuery: 'watch', activeTab: 'overview' }} />}
          >
            <Route path="/admin/overview" element={<ChildConsumer />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('admin-ctx')).toHaveTextContent('watch:overview');
  });
});
