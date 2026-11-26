import PageTransition from '../components/common/PageTransition';
import { Outlet } from 'react-router-dom';
import Footer from '../components/footer';
import Header from '../components/Header';

function AuthLayout() {
  return (
    <div className="nexus-shell flex min-h-screen flex-col [&>.nexus-page]:flex-1">
      <Header />
      <PageTransition>
        <Outlet />
      </PageTransition>
      <Footer />
    </div>
  );
}

export default AuthLayout;
