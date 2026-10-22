import OrderManagement from '../../components/adminDashboard/OrderManagement';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';

export default function AdminOrdersPage() {
  const context = useAdminContext();
  return <OrderManagement {...context} />;
}
