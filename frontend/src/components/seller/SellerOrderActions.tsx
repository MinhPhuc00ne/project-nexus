import { useState, type ReactElement } from 'react';
import { Check as CheckOutlined } from 'lucide-react';
import { Printer as PrinterOutlined, Truck as TruckOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SellerOrderStatus } from '@/features/orders/types/order.types';
import { confirmSellerOrder } from '@/features/orders/services/sellerOrders';
import Popup from '../Popup';
import { useToast } from '../ToastNotification';
import { useSellerSession } from './SellerSession';
import useSellerAction from './useSellerAction';
import { SellerButton } from './SellerUI';
import SellerDispatchModal from './SellerDispatchModal';
import SellerWaybillModal from './SellerWaybillModal';

export default function SellerOrderActions({
  id,
  status,
  hasShipment,
  onChanged,
}: {
  id: string;
  status: SellerOrderStatus;
  hasShipment: boolean;
  onChanged: () => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  const [modal, setModal] = useState<'confirm' | 'dispatch' | 'print' | null>(null);
  const user = useSellerSession();
  const action = useSellerAction();
  const toast = useToast();
  const blocked = !!user.isShopSuspended;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === 'PAID' && (
          <SellerButton disabled={blocked} onClick={() => setModal('confirm')}>
            <CheckOutlined /> {t('orders.actions.confirmOrder')}
          </SellerButton>
        )}
        {['PAID', 'PREPARING'].includes(status) && !hasShipment && (
          <SellerButton secondary disabled={blocked} onClick={() => setModal('dispatch')}>
            <TruckOutlined /> {t('orders.actions.dispatchGhn')}
          </SellerButton>
        )}
        {hasShipment && (
          <SellerButton secondary onClick={() => setModal('print')}>
            <PrinterOutlined /> {t('orders.actions.printWaybill')}
          </SellerButton>
        )}
      </div>
      {modal === 'confirm' && (
        <Popup
          isOpen
          onClose={() => {
            if (!action.pending) setModal(null);
          }}
          title={t('orders.actions.confirmModalTitle')}
          closeOnEsc={!action.pending}
          closeOnOverlay={!action.pending}
          showCloseButton={!action.pending}
        >
          <p className="break-words text-sm leading-7 text-slate-600">
            {t('orders.actions.confirmModalBody', { id })}
          </p>
          {action.error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {action.error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <SellerButton secondary disabled={action.pending} onClick={() => setModal(null)}>
              {t('orders.actions.cancel')}
            </SellerButton>
            <SellerButton
              disabled={action.pending || blocked}
              onClick={() =>
                void action.run(
                  () => confirmSellerOrder(id),
                  (result) => {
                    toast.success(result.message);
                    setModal(null);
                    onChanged();
                  },
                )
              }
            >
              {action.pending ? t('orders.actions.confirming') : t('orders.actions.confirmSubmit')}
            </SellerButton>
          </div>
        </Popup>
      )}
      {modal === 'dispatch' && (
        <SellerDispatchModal id={id} onClose={() => setModal(null)} onChanged={onChanged} />
      )}
      {modal === 'print' && <SellerWaybillModal id={id} onClose={() => setModal(null)} />}
    </>
  );
}
