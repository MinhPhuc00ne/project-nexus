import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getMyProducts,
  hideSellerProduct,
  type SellerProduct,
} from '../../services/sellerProducts';

export default function useSellerProducts() {
  const { token } = useAuth();
  const [revision, setRevision] = useState(0);
  const [pendingId, setPendingId] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
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
            error:
              cause instanceof Error ? cause.message : 'Không tải được sản phẩm của gian hàng.',
          });
      },
    );
    return () => {
      current = false;
    };
  }, [token, revision]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  function hide(product: SellerProduct) {
    if (lock.current || product.status === 'INACTIVE') return;
    setActionError('');
    setSelectedProduct(product);
  }
  function closeHide() {
    if (!lock.current) setSelectedProduct(null);
  }
  async function confirmHide() {
    if (lock.current || !selectedProduct) return;
    const product = selectedProduct;
    lock.current = true;
    setPendingId(product.id);
    setActionError('');
    setNotice('');
    try {
      const result = await hideSellerProduct(product.id);
      if (!result.success) throw new Error('Máy chủ chưa xác nhận ngừng bán sản phẩm.');
      if (active.current) {
        setSelectedProduct(null);
        setNotice(`Đã ngừng bán sản phẩm ${product.title}.`);
        reload();
      }
    } catch (cause) {
      if (active.current)
        setActionError(cause instanceof Error ? cause.message : 'Không thể ngừng bán sản phẩm.');
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
        notice,
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
        notice,
        selectedProduct,
        closeHide,
        confirmHide,
      };
}
