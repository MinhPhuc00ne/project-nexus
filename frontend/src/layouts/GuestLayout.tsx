import PageTransition from '../components/common/PageTransition';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Role } from '@nexus/types';
import Footer from '../components/footer';
import HomeHeader from '../components/headers/HomeHeader';
import { getStoredToken, getStoredUser } from '@/features/auth/services/auth';

function GuestLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname === '/' && getStoredToken() && getStoredUser()?.role === Role.SUPPORT_STAFF) {
    return <Navigate to="/staff/inbox" replace />;
  }

  return (
    <div className="nexus-shell min-h-screen">
      <HomeHeader
        onLoginClick={() => navigate('/login')}
        onRegisterClick={() => navigate('/register')}
        onSearch={(query) => {
          const params = new URLSearchParams();
          if (query.trim()) params.set('q', query.trim());
          navigate(`/search${params.size ? `?${params.toString()}` : ''}`);
        }}
      />
      {pathname.startsWith('/buyer') ? (
        <Outlet />
      ) : (
        <PageTransition>
          <Outlet />
        </PageTransition>
      )}
      <Footer />
    </div>
  );
}

export default GuestLayout;
