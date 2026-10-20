import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Role } from '@nexus/types';
import Footer from '../components/footer';
import HomeHeader from '../components/headers/HomeHeader';
import { getStoredToken, getStoredUser } from '../services/auth';

function GuestLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname === '/' && getStoredToken() && getStoredUser()?.role === Role.SUPPORT_STAFF) {
    return <Navigate to="/staff/inbox" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <HomeHeader
        onLoginClick={() => navigate('/login')}
        onRegisterClick={() => navigate('/register')}
      />
      <Outlet />
      <Footer />
    </div>
  );
}

export default GuestLayout;
