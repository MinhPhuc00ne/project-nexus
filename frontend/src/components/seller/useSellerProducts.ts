import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ToastNotification';
import { useSellerSession } from './SellerSession';
import { useSellerWorkspace } from './SellerWorkspace';
import { getStoredToken } from '../../services/auth';
import {
  getMyProducts,
  hideSellerProduct,
  reactivateSellerProduct,
  type SellerProduct,
} from '../../services/sellerProducts';

export default function useSellerProducts() {
  const { t } = useTranslation('seller');
  const { token } = useAuth();
  const user = useSellerSession();
  const { refreshShop } = useSellerWorkspace();
  const toast = useToast();
  const [revision, setRevision] = useState(0);
  const [pendingId, setPendingId] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);
  const lock = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [state, setState] = useState<{
    token: string | null;
    products: SellerProduct[];
    loading: boolean;
    error: string;
  }>({ token, products: [], loading: true, error: '' });
  useEffect(() => {
    let current = true;
    setState({ token, products: [], loading: true, error: '' });
    getMyProducts().then(
      (products) => {
        if (current) setState({ token, products, loading: false, error: '' });
      },
      (cause) => {
        if (current)
          setState({
            token,
            products: [],
            loading: false,
            error: cause instanceof Error ? cause.message : t('products.hook.loadErr'),
          });
      },
    );
    return () => {
      current = false;
    };
  }, [token, revision]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  function hide(product: SellerProduct) {
    if (lock.current || user.isShopSuspended || !user.isSellerActive) return;
    setActionError('');
    setSelectedProduct(product);
  }
  function closeHide() {
    if (!lock.current) setSelectedProduct(null);
  }
  async function confirmHide() {
    if (lock.current || !selectedProduct || user.isShopSuspended || !user.isSellerActive) return;
    const product = selectedProduct;
    lock.current = true;
    setPendingId(product.id);
    setActionError('');
    try {
      const stopping = product.status === 'ACTIVE';
      if (stopping) {
        const result = await hideSellerProduct(product.id);
        if (!result.success) throw new Error(t('products.hook.stopUnconfirmed'));
      } else await reactivateSellerProduct(product.id);
      if (active.current && token === getStoredToken()) {
        setSelectedProduct(null);
        toast.success(
          stopping
            ? t('products.hook.toggledStop', { title: product.title })
            : t('products.hook.toggledRelist', { title: product.title }),
        );
        reload();
        refreshShop();
      }
    } catch (cause) {
      if (active.current && token === getStoredToken()) {
        const message = cause instanceof Error ? cause.message : t('products.hook.toggleErr');
        setActionError(message);
        toast.error(message);
      }
    } finally {
      lock.current = false;
      if (active.current) setPendingId('');
    }
  }
  return state.token === token
    ? {
        ...state,
        reload,
        hide,
        pendingId,
        actionError,
        selectedProduct,
        closeHide,
        confirmHide,
      }
    : {
        products: [],
        loading: true,
        error: '',
        reload,
        hide,
        pendingId,
        actionError,
        selectedProduct,
        closeHide,
        confirmHide,
      };
}
