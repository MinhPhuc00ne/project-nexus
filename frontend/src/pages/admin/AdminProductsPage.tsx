import ProductManagement from '../../components/adminDashboard/Products/ProductManagement';
import { useAdminContext } from '../../components/adminDashboard/shared/useAdminContext';

export default function AdminProductsPage() {
  const context = useAdminContext();
  return <ProductManagement {...context} />;
}
