import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { HomeRecommendationCard } from '../HomeRecommendationCard';
import { HomeAuctionCard } from '../HomeAuctionCard';
import Footer from '../../footer';

function LocationProbe() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}

describe('internal navigation links', () => {
  it('opens a recommended product with client-side navigation', () => {
    render(
      <MemoryRouter>
        <HomeRecommendationCard product={{ id: 'product-1', name: 'Demo watch', price: 100 }} />
        <LocationProbe />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Demo watch' });
    expect(fireEvent.click(link)).toBe(false);
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/product/product-1');
  });

  it('opens the auction detail overlay through its enclosing router link', () => {
    const { container } = render(
      <MemoryRouter>
        <HomeAuctionCard product={{ id: 'product-2', name: 'Auction watch', price: 100 }} />
        <LocationProbe />
      </MemoryRouter>,
    );
    const detailLabel = container.querySelector('span[aria-label]');
    expect(detailLabel).not.toBeNull();
    expect(fireEvent.click(detailLabel!)).toBe(false);
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/product/product-2');
  });

  it('opens footer pages without a document navigation', () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
        <LocationProbe />
      </MemoryRouter>,
    );
    const aboutLink = container.querySelector('a[href="/about"]');
    expect(aboutLink).not.toBeNull();
    expect(fireEvent.click(aboutLink!)).toBe(false);
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/about');
  });
});
