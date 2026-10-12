import { useState, useEffect } from 'react';
import Login from './pages/Login/Login';
import HomeHeader from './components/headers/HomeHeader';
import HomePage from './pages/home/HomePage';
import SearchPage from './pages/search/SearchPage';
import './index.css';
import RegisterPage from './pages/register/RegisterPage';
import AuctionPage from './pages/auction/AuctionPage';
import {
  clearAuthSession,
  consumeOAuthCallbackFromUrl,
  getStoredUser,
  type AuthUser,
} from './services/auth';

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return consumeOAuthCallbackFromUrl() ?? getStoredUser();
  });

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    const syncAuth = () => setCurrentUser(getStoredUser());
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('nexus:auth-change', syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('nexus:auth-change', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
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
        isLoggedIn={Boolean(currentUser)}
        userName={currentUser?.fullName || currentUser?.email}
        userEmail={currentUser?.email}
        userAvatar={currentUser?.avatarUrl}
        onLogoutClick={() => {
          clearAuthSession();
          setCurrentUser(null);
        }}
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
