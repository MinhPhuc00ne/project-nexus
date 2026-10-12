import { useState, useEffect } from 'react';
import Login from './pages/Login/Login';
import HomeHeader from './components/headers/HomeHeader';
import HomePage from './pages/home/HomePage';
import SearchPage from './pages/SearchPage';
import './index.css';
import RegisterPage from './pages/register/RegisterPage';
import AuctionPage from './pages/auction/AuctionPage';

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (pathname === '/login') return <Login />;
  if (pathname === '/search') return <SearchPage />;
  if (pathname === '/register') return <RegisterPage />;
  if (pathname === '/auction' || pathname === '/dau-gia' || pathname.startsWith('/auction/')) {
    return <AuctionPage />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <HomeHeader
        onLoginClick={() => window.location.assign('/login')}
        onRegisterClick={() => window.location.assign('/register')}
        onSearch={(query, floor) => {
          const params = new URLSearchParams({ q: query, floor });
          window.location.assign(`/search?${params.toString()}`);
        }}
      />
      <HomePage />
    </div>
  );
}

export default App;
