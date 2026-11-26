import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App.tsx';
import { consumeOAuthCallbackFromUrl } from '@/features/auth/services/auth';
import './index.css';

const ROLE_DESTINATIONS: Record<string, string> = {
  ADMIN: '/admin',
  SUPPORT_STAFF: '/staff',
  SELLER: '/seller',
};

/**
 * Finishes a Google sign-in, if this load is the callback, and then renders.
 *
 * Exchanging the one-time code for a session is a request, so this waits for it
 * before the first render: the app would otherwise mount as a guest and flip to
 * signed-in a moment later, and anything deciding what to show from the session
 * would decide twice. When there is no `?code=` in the address the exchange
 * returns immediately without asking the server anything.
 */
async function bootstrap(): Promise<void> {
  const oauthUser = await consumeOAuthCallbackFromUrl();

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
}

void bootstrap();
