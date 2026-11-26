import { lazy, Suspense } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import GuestLayout from '../../layouts/GuestLayout';

vi.mock('@/features/auth/services/auth', () => ({
  getStoredToken: () => null,
  getStoredUser: () => null,
}));

vi.mock('../../components/headers/HomeHeader', () => ({
  default: () => (
    <header>
      <input aria-label="Header search" defaultValue="" />
      <Link to="/catalog/item">Open child</Link>
      <Link to="/catalog">Back to parent</Link>
    </header>
  ),
}));

vi.mock('../../components/footer', () => ({ default: () => <footer>Persistent footer</footer> }));

describe('nested route loading', () => {
  it('keeps the header, footer and their state while a child route loads', async () => {
    let completeLoad!: (module: { default: () => React.JSX.Element }) => void;
    const Child = lazy(
      () =>
        new Promise<{ default: () => React.JSX.Element }>((resolve) => {
          completeLoad = resolve;
        }),
    );
    render(
      <MemoryRouter initialEntries={['/catalog/item']}>
        <Suspense fallback={<div>Full app loading</div>}>
          <Routes>
            <Route element={<GuestLayout />}>
              <Route path="/catalog" element={<div>Parent page</div>} />
              <Route path="/catalog/item" element={<Child />} />
            </Route>
          </Routes>
        </Suspense>
      </MemoryRouter>,
    );
    const headerSearch = screen.getByLabelText('Header search');
    const footer = screen.getByText('Persistent footer');
    fireEvent.change(headerSearch, { target: { value: 'Keep this query' } });

    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByText('Full app loading')).not.toBeInTheDocument();
    expect(headerSearch).toBeVisible();
    expect(footer).toBeVisible();

    await act(async () => completeLoad({ default: () => <div>Child page</div> }));
    expect(screen.getByText('Child page')).toBeVisible();
    expect(screen.getByLabelText('Header search')).toBe(headerSearch);
    expect(headerSearch).toHaveValue('Keep this query');

    fireEvent.click(screen.getByRole('link', { name: 'Back to parent' }));
    expect(screen.getByText('Parent page')).toBeVisible();
    expect(screen.getByLabelText('Header search')).toBe(headerSearch);
    expect(screen.getByText('Persistent footer')).toBe(footer);

    fireEvent.click(screen.getByRole('link', { name: 'Open child' }));
    expect(screen.getByText('Child page')).toBeVisible();
    expect(screen.getByLabelText('Header search')).toBe(headerSearch);
    expect(headerSearch).toHaveValue('Keep this query');
  });
});
