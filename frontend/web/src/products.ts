export type { ProductShopInfo, ProductDetail } from './types/product.types';
export { MOCK_PRODUCTS_CATALOG as PRODUCTS_CATALOG } from './mocks/products.mock';
export {
  getProductById,
  getProductByIdAsync,
  getProductsCatalog,
  getRelatedProducts,
} from './services/products.service';
