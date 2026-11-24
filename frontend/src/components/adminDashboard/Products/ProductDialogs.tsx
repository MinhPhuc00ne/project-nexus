import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import {
  deleteAdminProduct,
  getAdminProductById,
  updateAdminProductStatus,
} from '../../../services/admin';
import type { AdminProduct, AdminProductDetail } from '../../../types/admin-product.types';
import { getIntlLocale } from '../../../i18n/config';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';
import { DetailFields } from '../shared/CommerceUI';
import { formatMoney } from '../shared/adminData';

export function ProductDetailDialog({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const { token } = useAuth();
  const [detail, setDetail] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDetail(null);
    void getAdminProductById(productId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setDetail(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : t('products.detail.loadErr'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId, token, revision, t]);

  return (
    <Popup
      isOpen
      onClose={onClose}
      title={t('products.detail.title')}
      size="xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('products.detail.close')}
        </Button>
      }
    >
      {loading && (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          {t('products.detail.loading')}
        </p>
      )}
      {!loading && error && (
        <div role="alert" className="space-y-3 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            {t('products.detail.retry')}
          </Button>
        </div>
      )}
      {!loading && !error && detail && (
        <div className="space-y-5">
          {detail.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {detail.images.map((image) => (
                <img
                  key={image.id}
                  src={image.imageUrl}
                  alt={detail.title}
                  className="aspect-square w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t('products.detail.noImages')}</p>
          )}
          <DetailFields
            fields={[
              [t('products.detail.fields.id'), detail.id],
              [t('products.detail.fields.title'), detail.title],
              [t('products.detail.fields.seller'), detail.seller.fullName],
              [t('products.detail.fields.sellerEmail'), detail.seller.email],
              [t('products.detail.fields.sellerPhone'), detail.seller.phoneNumber],
              [
                t('management.category'),
                [detail.category?.parent?.name, detail.category?.name]
                  .filter(Boolean)
                  .join(' / ') || t('management.uncategorized'),
              ],
              [t('products.detail.fields.price'), formatMoney(detail.basePrice)],
              [t('products.detail.fields.status'), t(`products.statuses.${detail.status}`)],
              [t('products.detail.fields.available'), String(detail.stockSummary.availableQty)],
              [t('products.detail.fields.totalStock'), String(detail.stockSummary.totalQty)],
              [t('products.detail.fields.weight'), `${detail.weightGrams} g`],
              [
                t('products.detail.fields.dimensions'),
                `${detail.dimensions.lengthCm} × ${detail.dimensions.widthCm} × ${detail.dimensions.heightCm} cm`,
              ],
              [
                t('products.detail.fields.model3d'),
                detail.threeModelKey ? t('products.detail.has3d') : t('products.detail.no3d'),
              ],
              [
                t('products.detail.fields.createdAt'),
                new Date(detail.createdAt).toLocaleString(locale),
              ],
              [
                t('products.detail.fields.updatedAt'),
                new Date(detail.updatedAt).toLocaleString(locale),
              ],
            ]}
          />
          <section className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-bold">{t('products.detail.descTitle')}</h3>
            <p className="break-words whitespace-pre-wrap text-sm text-slate-600">
              {detail.description || t('products.detail.noDesc')}
            </p>
          </section>
          <section className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-bold">{t('products.detail.inventoryTitle')}</h3>
            {detail.inventories.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-left text-xs">
                  <thead className="bg-blue-50">
                    <tr>
                      {[
                        t('products.detail.inventoryCols.warehouse'),
                        t('products.detail.inventoryCols.total'),
                        t('products.detail.inventoryCols.available'),
                        t('products.detail.inventoryCols.reserved'),
                      ].map((label) => (
                        <th scope="col" key={label} className="p-3">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.inventories.map((inventory) => (
                      <tr key={inventory.id} className="border-b border-slate-100">
                        <td className="p-3">
                          {inventory.warehouse.name}
                          <p className="mt-1 text-slate-500">
                            {inventory.warehouse.code} ·{' '}
                            {inventory.warehouse.address || t('products.detail.noAddress')}
                          </p>
                        </td>
                        <td className="p-3">{inventory.totalQty}</td>
                        <td className="p-3">{inventory.availableQty}</td>
                        <td className="p-3">{inventory.reservedQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t('products.detail.noInventory')}</p>
            )}
          </section>
        </div>
      )}
    </Popup>
  );
}

export function ProductActionDialog({
  product,
  kind,
  onClose,
  onSuccess,
}: {
  product: AdminProduct;
  kind: 'activate' | 'hide' | 'delete';
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const { t } = useTranslation('admin');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  function getDialogTitle() {
    if (kind === 'delete') {
      return t('products.actionDialog.deleteTitle');
    }
    if (kind === 'hide') {
      return t('products.actionDialog.hideTitle');
    }
    return t('products.actionDialog.activateTitle');
  }
  const title = getDialogTitle();
  const close = () => {
    if (!inFlight.current) onClose();
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (kind === 'hide' && !reason.trim()) {
      setError(t('products.actionDialog.hideReasonRequired'));
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const result =
        kind === 'delete'
          ? await deleteAdminProduct(product.id)
          : await updateAdminProductStatus(product.id, {
              status: kind === 'hide' ? 'INACTIVE' : 'ACTIVE',
              reason: reason.trim() || undefined,
            });
      onSuccess(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('products.actionDialog.updateErr'));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return (
    <Popup isOpen title={title} onClose={close} closeOnEsc={!pending} closeOnOverlay={!pending}>
      <form onSubmit={submit} className="space-y-4">
        <p className="break-words text-sm text-slate-600">
          {title}: <strong>{product.title}</strong>?
        </p>
        {kind === 'delete' ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            {t('products.actionDialog.deleteWarning')}
          </p>
        ) : (
          <label className="block text-sm font-medium">
            {kind === 'hide'
              ? t('products.actionDialog.hideReasonLabel')
              : t('products.actionDialog.activateNoteLabel')}
            <textarea
              autoFocus
              required={kind === 'hide'}
              maxLength={500}
              rows={3}
              disabled={pending}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 p-3"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={pending} onClick={close}>
            {t('products.actionDialog.cancel')}
          </Button>
          <Button
            type="submit"
            variant={kind === 'activate' ? 'primary' : 'danger'}
            disabled={pending}
          >
            {pending ? t('products.actionDialog.processing') : t('products.actionDialog.confirm')}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
