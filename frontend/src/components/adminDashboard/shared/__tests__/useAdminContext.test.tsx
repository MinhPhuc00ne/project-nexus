import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AdminTabProps } from '../adminTypes';
import { useAdminContext } from '../useAdminContext';

function ChildConsumer() {
  const ctx = useAdminContext();
  return (
    <div data-testid="admin-ctx">{`${ctx.pendingRefundCount ?? 0}:${ctx.data.auctions.length}`}</div>
  );
}

function LayoutWrapper({ value }: { value: AdminTabProps }) {
  return <Outlet context={value} />;
}

describe('useAdminContext', () => {
  it('reads shared admin outlet context from parent layout', () => {
    const contextValue: AdminTabProps = {
      pendingRefundCount: 3,
      data: {
        products: [],
        orders: [],
        stores: [],
        reports: [],
        transactions: [],
        auctions: [],
      },
      actions: {
        updateCommerce: vi.fn(),
        navigate: vi.fn(),
        showDetail: vi.fn(),
        notify: vi.fn(),
      },
    };

    render(
      <MemoryRouter initialEntries={['/admin/overview']}>
        <Routes>
          <Route element={<LayoutWrapper value={contextValue} />}>
            <Route path="/admin/overview" element={<ChildConsumer />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('admin-ctx')).toHaveTextContent('3:0');
  });
});
