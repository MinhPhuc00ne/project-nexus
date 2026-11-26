import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScrollToTop from '../ScrollToTop';

describe('route scroll reset', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps scroll position for query tabs and filters, and resets for a different page', () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(
      <MemoryRouter initialEntries={['/buyer/profile']}>
        <ScrollToTop />
        <Link to="/buyer/profile?tab=auction-offers">Profile tab</Link>
        <Link to="/buyer/profile?tab=auction-offers&status=active">Filter</Link>
        <Link to="/buyer/orders">Orders</Link>
      </MemoryRouter>,
    );
    expect(scroll).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('link', { name: 'Profile tab' }));
    fireEvent.click(screen.getByRole('link', { name: 'Filter' }));
    expect(scroll).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('link', { name: 'Orders' }));
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(scroll).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });
});
