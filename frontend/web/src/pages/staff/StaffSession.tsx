import { Navigate, Outlet } from 'react-router-dom';
import { getStoredToken, getStoredUser } from '../../services/auth';

export default function StaffSession() {
  const user = getStoredUser();
  if (!getStoredToken() || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'SUPPORT_STAFF' && user.role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
