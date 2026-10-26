import type { ReactElement } from 'react';
import type { SellerWaybill } from '../../types/order.types';
import { financeDate, financeMoney } from './financeFormat';

export default function SellerWaybillSheet({
  bill,
  onBarcodeLoad,
  onBarcodeError,
}: {
  bill: SellerWaybill;
  onBarcodeLoad?: () => void;
  onBarcodeError?: () => void;
}): ReactElement {
  const barcode = (() => {
    try {
      return ['https:', 'http:'].includes(new URL(bill.barcodeUrl).protocol) ? bill.barcodeUrl : '';
    } catch {
      return '';
    }
  })();
  return (
    <article className="mx-auto max-w-[190mm] space-y-5 rounded-lg border border-slate-300 bg-white p-5 text-xs text-black print:rounded-none print:p-2">
      <header className="flex flex-wrap justify-between gap-3 border-b border-slate-300 pb-4">
        <div>
          <strong className="text-xl text-blue-700 print:text-black">NEXUS</strong>
          <p className="mt-1">PHIẾU GIAO HÀNG · {bill.carrier}</p>
        </div>
        <div className="text-right">
          <p>Ngày đặt: {financeDate(bill.orderDate)}</p>
          <p className="mt-1 break-all">Đơn #{bill.orderId}</p>
        </div>
      </header>
      <section className="break-inside-avoid border-b border-slate-300 pb-4 text-center">
        <strong className="block break-all text-lg">{bill.waybillCode}</strong>
        {barcode && (
          <img
            className="mx-auto mt-2 h-20 max-w-full object-contain"
            src={barcode}
            alt={`Mã vạch vận đơn ${bill.waybillCode}`}
            onLoad={onBarcodeLoad}
            onError={onBarcodeError}
          />
        )}
      </section>
      <section className="grid break-inside-avoid gap-5 sm:grid-cols-2 print:grid-cols-2">
        <div>
          <h3 className="mb-2 font-bold">NGƯỜI GỬI</h3>
          <p className="font-semibold">{bill.sender.storeName}</p>
          <p className="my-1">{bill.sender.phone}</p>
          <p className="break-words leading-6">{bill.sender.address}</p>
        </div>
        <div>
          <h3 className="mb-2 font-bold">NGƯỜI NHẬN</h3>
          <p className="font-semibold">{bill.recipient.name}</p>
          <p className="my-1">{bill.recipient.phone}</p>
          <p className="break-words leading-6">
            {[
              bill.recipient.address,
              bill.recipient.ward,
              bill.recipient.district,
              bill.recipient.city,
            ]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
      </section>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-slate-300">
            <th className="py-2 pr-3">Sản phẩm</th>
            <th className="py-2 text-center">SL</th>
            <th className="py-2 text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, index) => (
            <tr className="break-inside-avoid border-b border-slate-200" key={index}>
              <td className="py-3 pr-3">{item.name}</td>
              <td className="py-3 text-center">{item.quantity}</td>
              <td className="py-3 text-right">{financeMoney(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto grid max-w-xs grid-cols-2 gap-2">
        <dt>Tổng giá trị đơn</dt>
        <dd className="m-0 text-right">{financeMoney(bill.totalAmount)}</dd>
        <dt>Phí vận chuyển</dt>
        <dd className="m-0 text-right">{financeMoney(bill.shippingFee)}</dd>
        <dt className="font-bold">Tiền thu hộ (COD)</dt>
        <dd className="m-0 text-right font-bold">{financeMoney(bill.codAmount)}</dd>
      </dl>
      <p className="break-words border-t border-slate-300 pt-4 leading-6">
        <strong>Ghi chú: </strong>
        {bill.note || '—'}
      </p>
      <div className="grid grid-cols-2 gap-4 border-t border-slate-300 pt-3 text-center">
        <div className="min-h-16">Người gửi</div>
        <div className="min-h-16">Nhân viên nhận hàng</div>
      </div>
    </article>
  );
}
