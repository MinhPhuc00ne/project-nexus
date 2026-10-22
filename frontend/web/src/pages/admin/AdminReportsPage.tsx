import ReportsManagement from '../../components/adminDashboard/ReportsManagement';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';

export default function AdminReportsPage() {
  const context = useAdminContext();
  return <ReportsManagement {...context} />;
}
