import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { consumeOAuthCallbackFromUrl } from './services/auth';
import './index.css';

const oauthUser = consumeOAuthCallbackFromUrl();
if (oauthUser) {
  try {
    sessionStorage.setItem('nexus:login-toast', oauthUser.fullName || oauthUser.email);
  } catch {
    // Ignore storage errors
  }
  const destination =
    oauthUser.role === 'ADMIN'
      ? '/admin'
      : oauthUser.role === 'SUPPORT_STAFF'
        ? '/staff'
        : oauthUser.role === 'SELLER'
          ? '/seller'
          : '/';
  const url = new URL(window.location.href);
  url.pathname = destination;
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
