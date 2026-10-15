import { Outlet, useNavigate } from 'react-router-dom';
import Footer from '../components/footer';
import HomeHeader from '../components/headers/HomeHeader';

function GuestLayout() {
  const navigate = useNavigate();

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
