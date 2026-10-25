import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { PrinterOutlined } from '@ant-design/icons';
import Popup from '../Popup';
import useProductResource from '../productDetail/useProductResource';
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
  const user = useSellerSession();
  const load = useCallback(() => getSellerWaybill(id, user.id), [id, user.id]);
  const resource = useProductResource(load);
  return (
    <Popup isOpen onClose={onClose} title="Xem trước phiếu giao hàng" size="lg">
      <SellerResourceState loading={resource.loading} error={resource.error} retry={resource.retry}>
        {resource.data && <PrintableWaybill bill={resource.data} />}
      </SellerResourceState>
    </Popup>
  );
}

function PrintableWaybill({ bill }: { bill: SellerWaybill }): ReactElement {
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
          Mã vạch chưa tải được. Kiểm tra kết nối và tải lại trước khi in.
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
            Tải lại mã vạch
          </SellerButton>
        )}
        <SellerButton disabled={!barcodeReady} onClick={() => window.print()}>
          <PrinterOutlined />
          {barcodeReady ? 'In phiếu giao hàng' : 'Đang tải mã vạch…'}
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
