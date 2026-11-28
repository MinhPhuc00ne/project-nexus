import SellerApplicationsPanel from '../../components/adminDashboard/Sellers/SellerApplicationsPanel';
import { useAdminContext } from '../../components/adminDashboard/shared/useAdminContext';

// Renders full Seller applications list; Overview uses the same component in preview mode.
export default function AdminSellersPage() {
  const { actions } = useAdminContext();

  // Panel reads applications from Seller context and calls approve/reject APIs.
  // actions provides toasts and navigation within the admin workspace.
  return <SellerApplicationsPanel actions={actions} />;
}
