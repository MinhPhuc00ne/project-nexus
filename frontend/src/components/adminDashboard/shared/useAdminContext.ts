import { useOutletContext } from 'react-router-dom';
import type { AdminTabProps } from './adminTypes';

// Child pages call this hook to access data/actions passed by AdminLayout via Outlet.
// No local state created here: all pages share the same data so sidebar counts stay in sync.
export function useAdminContext() {
  return useOutletContext<AdminTabProps>();
}
