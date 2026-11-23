import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { Printer as PrinterOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Popup from '../Popup';
import useProductResource from '../productDetail/useProductResource';
import { useToast } from '../ToastNotification';
import { getSellerWaybill } from '../../services/sellerOrders';
import type { SellerWaybill } from '../../types/order.types';
import { useSellerSession } from './SellerSession';
import SellerResourceState from './SellerResourceState';
import SellerWaybillSheet from './SellerWaybillSheet';
import { SellerButton } from './SellerUI';

export default function SellerWaybillModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  const user = useSellerSession();
  const load = useCallback(() => getSellerWaybill(id, user.id), [id, user.id]);
  const resource = useProductResource(load);
  return (
    <Popup isOpen onClose={onClose} title={t('orders.waybill.previewTitle')} size="lg">
      <SellerResourceState loading={resource.loading} error={resource.error} retry={resource.retry}>
        {resource.data && <PrintableWaybill bill={resource.data} onClose={onClose} />}
      </SellerResourceState>
    </Popup>
  );
}

function PrintableWaybill({
  bill,
  onClose,
}: {
  bill: SellerWaybill;
  onClose: () => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  const toast = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [barcodeReady, setBarcodeReady] = useState(false);
  const [barcodeFailed, setBarcodeFailed] = useState(false);
  const [imageRevision, setImageRevision] = useState(0);
  const copy = {
    ...bill,
    barcodeUrl: imageRevision
      ? `${bill.barcodeUrl}${bill.barcodeUrl.includes('?') ? '&' : '?'}reload=${imageRevision}`
      : bill.barcodeUrl,
  };
  useEffect(() => {
    let hidden: Element[] = [];
    const restore = (): void => {
      hidden.forEach((element) => element.classList.remove('print:hidden'));
      hidden = [];
    };
    const prepare = (): void => {
      restore();
      hidden = [...document.body.children].filter(
        (element) => element !== printRef.current && !element.classList.contains('print:hidden'),
      );
      hidden.forEach((element) => element.classList.add('print:hidden'));
    };
    window.addEventListener('beforeprint', prepare);
    window.addEventListener('afterprint', restore);
    return () => {
      window.removeEventListener('beforeprint', prepare);
      window.removeEventListener('afterprint', restore);
      restore();
    };
  }, []);
  return (
    <div className="space-y-4">
      <SellerWaybillSheet
        bill={copy}
        onBarcodeLoad={() => {
          setBarcodeReady(true);
          setBarcodeFailed(false);
        }}
        onBarcodeError={() => {
          setBarcodeReady(false);
          setBarcodeFailed(true);
        }}
      />
      {barcodeFailed && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          {t('orders.waybill.barcodeError')}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {barcodeFailed && (
          <SellerButton
            secondary
            onClick={() => {
              setBarcodeReady(false);
              setBarcodeFailed(false);
              setImageRevision((value) => value + 1);
            }}
          >
            {t('orders.waybill.reloadBarcode')}
          </SellerButton>
        )}
        <SellerButton
          disabled={!barcodeReady}
          onClick={() => {
            toast.success(t('orders.waybill.printSuccess', { code: copy.waybillCode }));
            onClose();
          }}
        >
          <PrinterOutlined />
          {barcodeReady ? t('orders.waybill.printLabel') : t('orders.waybill.loadingBarcode')}
        </SellerButton>
      </div>
      {createPortal(
        <div ref={printRef} className="hidden bg-white text-black print:block print:w-full">
          <SellerWaybillSheet bill={copy} />
        </div>,
        document.body,
      )}
    </div>
  );
}
