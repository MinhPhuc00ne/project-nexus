import { Trans, useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../../i18n/config';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';
import { resolveAuctionImageUrl, type AdminAuctionEntity } from '../../../services/auction.service';
import { getStoredToken } from '../../../services/auth';
import { useToast } from '../../ToastNotification';
import { auctionBannerReason, promoteAuctionBanner } from './auctionBannerPromotion';

export default function PromoteAuctionDialog({
  auction,
  onClose,
  onPromoted,
}: {
  auction: AdminAuctionEntity;
  onClose: () => void;
  onPromoted: () => void;
}) {
  const { t, i18n } = useTranslation('admin');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const active = useRef(false);
  const toast = useToast();
  const reason = auctionBannerReason(auction);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function confirm() {
    if (lock.current || reason) return;
    lock.current = true;
    setSaving(true);
    setError('');
    const token = getStoredToken();
    try {
      const result = await promoteAuctionBanner(auction);
      if (active.current && token === getStoredToken()) {
        toast.success(result.created ? t('management.promoted') : t('management.bannerExists'));
        onPromoted();
      }
    } catch (cause) {
      if (active.current && token === getStoredToken())
        setError(cause instanceof Error ? cause.message : t('management.promoteAuctionError'));
    } finally {
      lock.current = false;
      if (active.current) setSaving(false);
    }
  }
  return (
    <Popup
      isOpen
      title={t('management.promoteAuctionTitle')}
      onClose={() => {
        if (!lock.current) onClose();
      }}
      closeOnOverlay={!saving}
      closeOnEsc={!saving}
      showCloseButton={!saving}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            {t('management.cancel')}
          </Button>
          <Button disabled={saving || !!reason} onClick={() => void confirm()}>
            {saving ? t('management.promoting') : t('management.confirmPromote')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-600">
        {auction.imageUrl && (
          <img
            src={resolveAuctionImageUrl(auction.imageUrl)}
            alt={auction.title}
            className="max-h-48 w-full rounded-lg bg-slate-50 object-contain"
          />
        )}
        <p>
          <Trans
            t={t}
            i18nKey="management.promotePrompt"
            values={{ title: auction.title }}
            components={{ strong: <strong className="text-slate-900" /> }}
          />
        </p>
        <p>{t('management.bannerContentHint')}</p>
        <dl className="space-y-2 rounded-lg bg-blue-50 p-3">
          <div>
            <dt className="font-medium">{t('management.displayStart')}</dt>
            <dd>
              {new Date(auction.consignmentDeadline || auction.startTime).toLocaleString(
                getIntlLocale(i18n.language),
              )}
            </dd>
          </div>
          <div>
            <dt className="font-medium">{t('management.displayEnd')}</dt>
            <dd>{new Date(auction.endTime).toLocaleString(getIntlLocale(i18n.language))}</dd>
          </div>
        </dl>
        <Link
          to="/admin/banners"
          className="inline-block text-blue-600 hover:underline"
          onClick={(event) => {
            if (lock.current) event.preventDefault();
          }}
        >
          {t('management.manageBanners')}
        </Link>
        {(error || reason) && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
            {error || reason}
          </p>
        )}
      </div>
    </Popup>
  );
}
