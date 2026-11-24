import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { clearAuthSession } from '../../../services/auth';
import UserDropdownMenu from '../UserDropdownMenu';

vi.mock('../../../services/auth', () => ({ clearAuthSession: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ switchActiveMode: vi.fn() }),
}));
vi.mock('../../ToastNotification', () => ({ useToast: () => ({ success: vi.fn() }) }));

function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <MemoryRouter>
      <UserDropdownMenu
        isOpen={open}
        onClose={() => setOpen(false)}
        profile={null}
        displayUserName="Test Account"
        onLogoutClick={onLogout}
      />
    </MemoryRouter>
  );
}

describe('account menu logout confirmation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('closes the account menu while keeping one confirmation open, and cancellation preserves the session', () => {
    const onLogout = vi.fn();
    render(<AccountMenu onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common:nav.logout') }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(clearAuthSession).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('ends the session only after confirming logout', () => {
    const onLogout = vi.fn();
    render(<AccountMenu onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common:nav.logout') }));
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(clearAuthSession).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
