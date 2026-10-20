import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMySellerRequests } from '../../services/users';

type Store = { name: string; loading: boolean; error: string };

export function useSellerStore(userId: string): Store {
  const { token } = useAuth();
  const [store, setStore] = useState<Store>({ name: '', loading: true, error: '' });
  const inFlight = useRef<{
    key: string;
    promise: ReturnType<typeof getMySellerRequests>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setStore({ name: '', loading: true, error: '' });
    const key = JSON.stringify([token, userId]);
    if (inFlight.current?.key !== key) {
      const request = { key, promise: getMySellerRequests() };
      inFlight.current = request;
      const clear = () => {
        if (inFlight.current === request) inFlight.current = null;
      };
      void request.promise.then(clear, clear);
    }
    void inFlight.current.promise.then(
      (result) => {
        if (active)
          setStore({
            name: result.requests.find((item) => item.status === 'APPROVED')?.storeName || '',
            loading: false,
            error: '',
          });
      },
      () => {
        if (active) setStore({ name: '', loading: false, error: 'Chưa thể tải tên gian hàng.' });
      },
    );
    return () => {
      active = false;
    };
  }, [token, userId]);

  return store;
}
