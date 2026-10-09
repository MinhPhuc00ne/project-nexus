import Login from './pages/Login/Login';
import HomeHeader from './components/headers/HomeHeader';
import HomePage from './pages/home/HomePage';
import './index.css';

function App() {
  if (window.location.pathname === '/login') {
    return <Login />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <HomeHeader onLoginClick={() => window.location.assign('/login')} />
      <HomePage />
    </div>
  );
}

export default App;
