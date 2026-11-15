import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

export function useAuctionOperationResource<T>(load: () => Promise<T[]>, refreshKey: number) {
  const { token } = useAuth();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void load()
      .then((result) => {
        if (!Array.isArray(result)) throw new Error('Dữ liệu trả về không hợp lệ.');
        if (active) setRows(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải dữ liệu.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, refreshKey, revision, token]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!busy.current) setRevision((value) => value + 1);
    }, 15_000);
    return () => clearInterval(timer);
  }, []);

  async function run(action: () => Promise<unknown>) {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setActionError('');
    setNotice('');
    try {
      await action();
      if (!mounted.current) return false;
      setNotice('Đã xử lý thành công.');
      return true;
    } catch (cause) {
      if (mounted.current)
        setActionError(
          `${cause instanceof Error ? cause.message : 'Không thể xử lý.'} Hãy tải lại trạng thái trước khi thử lại.`,
        );
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) {
        setPending(false);
        setRevision((value) => value + 1);
      }
    }
  }
  return {
    rows,
    loading,
    pending,
    error,
    actionError,
    notice,
    run,
    refresh: () => setRevision((value) => value + 1),
  };
}
