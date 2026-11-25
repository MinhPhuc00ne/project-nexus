import AppRouter from './routes/AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ToastNotification';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
