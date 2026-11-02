import { Outlet } from 'react-router-dom';
import Footer from '../components/footer';
import Header from '../components/Header';

function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}

export default AuthLayout;
