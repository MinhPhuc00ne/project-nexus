import SellerStoreManagement from '../../components/adminDashboard/SellerStoreManagement';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';

export default function AdminStoresPage() {
  const context = useAdminContext();
  return <SellerStoreManagement {...context} />;
}
