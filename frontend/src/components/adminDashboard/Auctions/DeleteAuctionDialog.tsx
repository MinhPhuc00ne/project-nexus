import { Trans, useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';
import { adminDeleteAuctionApi, type AdminAuctionEntity } from '../../../services/auction.service';
import { getStoredToken } from '../../../services/auth';
import { useToast } from '../../ToastNotification';
import { auctionDeleteReason } from './auctionManagementAvailability';

export default function DeleteAuctionDialog({
  auction,
  onClose,
  onDeleted,
}: {
  auction: AdminAuctionEntity;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation('admin');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const active = useRef(false);
  const toast = useToast();
  const reason = auctionDeleteReason(auction);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function remove() {
    if (lock.current || reason) return;
    lock.current = true;
    setSaving(true);
    setError('');
    const token = getStoredToken();
    try {
      const result = await adminDeleteAuctionApi(auction.id);
      if (!result.success || result.deletedId !== auction.id)
        throw new Error(t('management.deleteUnconfirmed'));
      if (active.current && token === getStoredToken()) {
        toast.success(t('management.auctionDeleted'));
        onDeleted();
      }
    } catch (cause) {
      if (active.current && token === getStoredToken())
        setError(cause instanceof Error ? cause.message : t('management.deleteAuctionError'));
    } finally {
      lock.current = false;
      if (active.current) setSaving(false);
    }
  }

  return (
    <Popup
      isOpen
      title={t('management.deleteAuction')}
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
          <Button variant="danger" disabled={saving || !!reason} onClick={() => void remove()}>
            {saving ? t('management.deleting') : t('management.confirmDelete')}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-700">
        <Trans
          t={t}
          i18nKey="management.deletePrompt"
          values={{ title: auction.title }}
          components={{ strong: <strong /> }}
        />
      </p>
      <p className="mt-3 text-sm text-slate-600">{t('management.deleteWarning')}</p>
      {(reason || error) && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {reason || error}
        </p>
      )}
    </Popup>
  );
}
