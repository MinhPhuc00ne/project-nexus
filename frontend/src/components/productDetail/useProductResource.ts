import { useCallback, useEffect, useState } from 'react';
import i18n from '../../i18n';

export default function useProductResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{
    loader: typeof load;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ loader: load, data: null, error: '', loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ loader: load, data: null, error: '', loading: true });
    load().then(
      (data) => {
        if (active) setState({ loader: load, data, error: '', loading: false });
      },
      (cause: unknown) => {
        if (active)
          setState({
            loader: load,
            data: null,
            error: cause instanceof Error ? cause.message : i18n.t('guest:product.loadFailed'),
            loading: false,
          });
      },
    );
    return () => {
      active = false;
    };
  }, [load, revision]);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  return state.loader === load
    ? { ...state, retry }
    : { data: null, error: '', loading: true, retry };
}
