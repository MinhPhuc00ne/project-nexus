import ReportsManagement from './ReportsManagement';
import { useAdminContext } from '../shared/useAdminContext';

export default function AdminReportsPage() {
  const context = useAdminContext();
  return <ReportsManagement {...context} />;
}
