import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '@nexus/types';
import i18n from '../../i18n';
import BuyerLayout from '../BuyerLayout';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'buyer-1', role: Role.BUYER, fullName: 'Demo Buyer', email: 'buyer@example.com' },
    switchActiveMode: vi.fn(),
  }),
}));

vi.mock('../../components/headers/UpgradeSellerModal', () => ({ UpgradeSellerModal: () => null }));

function renderWorkspace() {
  return render(
    <MemoryRouter initialEntries={['/buyer/profile']}>
      <Routes>
        <Route path="/buyer" element={<BuyerLayout />}>
          <Route
            path="profile"
            element={
              <div>
                Profile content
                <Link to="/buyer/profile?tab=auction-offers">Profile offers tab</Link>
              </div>
            }
          />
          <Route path="orders" element={<div>Orders content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('BuyerLayout scroll ownership', () => {
  it('resets the page pane on navigation while preserving the sidebar and menu position', () => {
    renderWorkspace();
    const sidebar = screen.getByRole('complementary');
    const navigation = screen.getByRole('navigation', { name: i18n.t('common:nav.buyerPortal') });
    const content = screen.getByRole('region', { name: i18n.t('common:nav.buyerPortal') });
    navigation.scrollTop = 120;
    content.scrollTop = 500;

    fireEvent.click(screen.getByRole('link', { name: i18n.t('buyer:nav.orders') }));

    expect(screen.getByText('Orders content')).toBeVisible();
    expect(screen.getByRole('complementary')).toBe(sidebar);
    expect(navigation.scrollTop).toBe(120);
    expect(content.scrollTop).toBe(0);
  });

  it('keeps the content and menu scroll positions when switching profile query tabs', () => {
    renderWorkspace();
    const navigation = screen.getByRole('navigation', { name: i18n.t('common:nav.buyerPortal') });
    const content = screen.getByRole('region', { name: i18n.t('common:nav.buyerPortal') });
    navigation.scrollTop = 100;
    content.scrollTop = 240;

    fireEvent.click(screen.getByRole('link', { name: 'Profile offers tab' }));

    expect(content.scrollTop).toBe(240);
    expect(navigation.scrollTop).toBe(100);
    expect(screen.getByRole('link', { name: i18n.t('buyer:nav.profile') })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
