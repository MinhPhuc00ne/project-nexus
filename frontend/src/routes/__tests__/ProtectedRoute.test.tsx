import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Role } from '@nexus/types';
import ProtectedRoute from '../ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('redirects unauthenticated users to /login', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      user: null,
      storedUser: null,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/buyer']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={[Role.BUYER]} />}>
            <Route path="/buyer" element={<div>Buyer Portal</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects users without required role to /', () => {
    mockUseAuth.mockReturnValue({
      token: 'valid-token',
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

  it('renders protected content when role is allowed', () => {
    mockUseAuth.mockReturnValue({
      token: 'valid-token',
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
});
