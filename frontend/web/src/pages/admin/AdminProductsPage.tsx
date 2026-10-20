import ProductManagement from '../../components/adminDashboard/ProductManagement';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';

export default function AdminProductsPage() {
  const context = useAdminContext();
  return <ProductManagement {...context} />;
}
