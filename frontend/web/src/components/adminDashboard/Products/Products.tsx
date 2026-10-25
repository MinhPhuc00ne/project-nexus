import ProductManagement from './ProductManagement';
import { useAdminContext } from '../shared/useAdminContext';

export default function AdminProductsPage() {
  const context = useAdminContext();
  return <ProductManagement {...context} />;
}
