import OrderManagement from './OrderManagement';
import { useAdminContext } from '../shared/useAdminContext';

export default function AdminOrdersPage() {
  const context = useAdminContext();
  return <OrderManagement {...context} />;
}
