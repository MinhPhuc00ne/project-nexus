import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { listBanners, type Banner } from '../../../services/banners.service';

export default function useAuctionBanners(token: string | null, revision: number) {
  const { t } = useTranslation('admin');
  const [data, setData] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData([]);
    void listBanners()
      .then((banners) => {
        if (active) setData(banners);
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : t('management.checkBannerError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, revision, t]);
  return { data, loading, error };
}
