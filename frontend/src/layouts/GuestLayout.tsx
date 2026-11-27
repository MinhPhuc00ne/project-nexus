import PageTransition from '../components/common/PageTransition';
import RouteContent from '../routes/RouteContent';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Role } from '@nexus/types';
import Footer from '../components/footer';
import HomeHeader from '../components/headers/HomeHeader';
import { getStoredToken, getStoredUser } from '@/features/auth/services/auth';

function GuestLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isBuyerWorkspace = pathname === '/buyer' || pathname.startsWith('/buyer/');

  if (pathname === '/' && getStoredToken() && getStoredUser()?.role === Role.SUPPORT_STAFF) {
    return <Navigate to="/staff/inbox" replace />;
  }

  return (
    <div
      className={`nexus-shell storefront-shell ${isBuyerWorkspace ? 'buyer-shell' : 'min-h-screen'}`}
    >
      <HomeHeader
        onLoginClick={() => navigate('/login')}
        onRegisterClick={() => navigate('/register')}
        onSearch={(query) => {
          const params = new URLSearchParams();
          if (query.trim()) params.set('q', query.trim());
          navigate(`/search${params.size ? `?${params.toString()}` : ''}`);
        }}
      />
      {isBuyerWorkspace ? (
        <RouteContent>
          <Outlet />
        </RouteContent>
      ) : (
        <PageTransition>
          <Outlet />
        </PageTransition>
      )}
      <Footer className={isBuyerWorkspace ? 'buyer-footer' : undefined} />
    </div>
  );
}

export default GuestLayout;
