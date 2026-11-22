import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Role } from '@nexus/types';
import ProtectedRoute from '../ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const BUYER_PORTAL_LABEL = 'Buyer Portal';
const VALID_TOKEN = 'valid-token';

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? 'none';
  return <div>{`Login Page (from: ${from})`}</div>;
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('redirects unauthenticated users to /login and preserves source path', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      user: null,
      storedUser: null,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/buyer/orders']}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<ProtectedRoute allowedRoles={[Role.BUYER]} />}>
            <Route path="/buyer/orders" element={<div>{BUYER_PORTAL_LABEL}</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page (from: /buyer/orders)')).toBeInTheDocument();
  });

  it('renders loading status while auth profile is resolving', () => {
    mockUseAuth.mockReturnValue({
      token: VALID_TOKEN,
      user: null,
      storedUser: null,
      isLoading: true,
    });

    render(
      <MemoryRouter initialEntries={['/buyer']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={[Role.BUYER]} />}>
            <Route path="/buyer" element={<div>{BUYER_PORTAL_LABEL}</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('redirects users without required role to /', () => {
    mockUseAuth.mockReturnValue({
      token: VALID_TOKEN,
      user: { role: Role.BUYER },
      storedUser: { role: Role.BUYER },
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN]} />}>
            <Route path="/admin" element={<div>Admin Portal</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders protected Outlet content when role is allowed', () => {
    mockUseAuth.mockReturnValue({
      token: VALID_TOKEN,
      user: { role: Role.SELLER },
      storedUser: { role: Role.SELLER },
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/seller']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={[Role.SELLER]} />}>
            <Route path="/seller" element={<div>Seller Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Seller Dashboard')).toBeInTheDocument();
  });

  it('renders explicit children when provided without Outlet', () => {
    mockUseAuth.mockReturnValue({
      token: VALID_TOKEN,
      user: { role: Role.BUYER },
      storedUser: { role: Role.BUYER },
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <ProtectedRoute allowedRoles={[Role.BUYER]}>
          <div>Checkout Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Checkout Content')).toBeInTheDocument();
  });
});
