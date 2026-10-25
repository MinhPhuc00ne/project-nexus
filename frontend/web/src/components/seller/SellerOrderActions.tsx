import { useState, type ReactElement } from 'react';
import { CheckOutlined, PrinterOutlined, TruckOutlined } from '@ant-design/icons';
import type { SellerOrderStatus } from '../../types/order.types';
import { confirmSellerOrder } from '../../services/sellerOrders';
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
            <CheckOutlined /> Xác nhận đơn
          </SellerButton>
        )}
        {['PAID', 'PREPARING'].includes(status) && (
          <SellerButton secondary disabled={blocked} onClick={() => setModal('dispatch')}>
            <TruckOutlined /> Bàn giao GHN
          </SellerButton>
        )}
        {hasShipment && (
          <SellerButton secondary onClick={() => setModal('print')}>
            <PrinterOutlined /> In vận đơn
          </SellerButton>
        )}
      </div>
      {modal === 'confirm' && (
        <Popup
          isOpen
          onClose={() => {
            if (!action.pending) setModal(null);
          }}
          title="Xác nhận chuẩn bị đơn hàng"
          closeOnEsc={!action.pending}
          closeOnOverlay={!action.pending}
          showCloseButton={!action.pending}
        >
          <p className="break-words text-sm leading-7 text-slate-600">
            Xác nhận tiếp nhận đơn #{id} để chuẩn bị đóng gói? Người mua sẽ nhận được thông báo.
          </p>
          {action.error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {action.error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <SellerButton secondary disabled={action.pending} onClick={() => setModal(null)}>
              Hủy
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
              {action.pending ? 'Đang xác nhận…' : 'Xác nhận chuẩn bị'}
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
