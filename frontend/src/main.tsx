import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App.tsx';
import { consumeOAuthCallbackFromUrl } from './services/auth';
import './index.css';

const ROLE_DESTINATIONS: Record<string, string> = {
  ADMIN: '/admin',
  SUPPORT_STAFF: '/staff',
  SELLER: '/seller',
};

const oauthUser = consumeOAuthCallbackFromUrl();
if (oauthUser) {
  try {
    sessionStorage.setItem('nexus:login-toast', oauthUser.fullName || oauthUser.email);
  } catch {
    // Ignore storage errors
  }
  const role = oauthUser.role;
  const destination = (role && ROLE_DESTINATIONS[role]) || '/';
  const url = new URL(window.location.href);
  url.pathname = destination;
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
