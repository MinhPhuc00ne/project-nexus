import { useCallback, type ReactElement } from 'react';
import { RefreshCw as ReloadOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getSellerOrderDetail, isVerifiedGhnShipment } from '../../services/sellerOrders';
import useProductResource from '../productDetail/useProductResource';
import { useSellerSession } from './SellerSession';
import { Badge, Panel, SellerButton } from './SellerUI';
import SellerResourceState from './SellerResourceState';
import SellerOrderActions from './SellerOrderActions';
import { getSellerOrderLabel } from './orderPresentation';
import { financeDate, financeMoney } from './financeFormat';

export default function SellerLiveOrderDetail({ id }: { id: string }): ReactElement {
  const { t } = useTranslation('seller');
  const user = useSellerSession();
  const { token } = useAuth();
  const loader = useCallback(() => getSellerOrderDetail(id, user.id), [id, user.id, token]);
  const resource = useProductResource(loader);
  const order = resource.data;
  return (
    <SellerResourceState loading={resource.loading} error={resource.error} retry={resource.retry}>
      {order && (
        <div className="space-y-5">
          <Panel
            title={t('orders.orderNumber', { id: order.id.slice(0, 8) })}
            action={
              <SellerButton secondary onClick={resource.retry}>
                <ReloadOutlined />
                {t('orders.refresh')}
              </SellerButton>
            }
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge
                  tone={
                    order.status === 'CANCELLED' || order.status === 'REFUNDED'
                      ? 'gray'
                      : order.status === 'PAID' || order.status === 'PREPARING'
                        ? 'amber'
                        : order.status === 'DELIVERED' || order.status === 'CONFIRMED'
                          ? 'green'
                          : 'blue'
                  }
                >
                  {getSellerOrderLabel(order.status)}
                </Badge>
                <p className="mt-3 text-xs text-slate-500">{financeDate(order.createdAt)}</p>
              </div>
              <SellerOrderActions
                id={order.id}
                status={order.status}
                hasShipment={Boolean(order.shipment?.waybillCode)}
                onChanged={resource.retry}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="border-y border-blue-100 bg-blue-50/60 text-xs text-slate-500">
                  <tr>
                    {[
                      t('orders.itemCols.product'),
                      t('orders.itemCols.quantity'),
                      t('orders.itemCols.unitPrice'),
                      t('orders.itemCols.total'),
                    ].map((label) => (
                      <th className="p-3" key={label}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {item.thumbnail && (
                            <img
                              className="size-12 rounded object-contain"
                              src={item.thumbnail}
                              alt=""
                            />
                          )}
                          <span>{item.title}</span>
                        </div>
                      </td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">{financeMoney(item.unitPrice)}</td>
                      <td className="p-3">{financeMoney(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto mt-5 grid max-w-sm grid-cols-2 gap-3 text-sm">
              {[
                [t('orders.subtotal'), order.subtotal],
                [t('orders.shippingFee'), order.shippingFee],
                [t('orders.totalAmount'), order.totalAmount],
              ].map(([label, amount]) => (
                <div className="col-span-2 flex justify-between gap-3" key={label}>
                  <dt>{label}</dt>
                  <dd className="m-0 font-semibold text-blue-700">
                    {financeMoney(Number(amount))}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={t('orders.shippingInfoTitle')}>
              <div className="space-y-2 text-sm leading-7 text-slate-600">
                <p>
                  {t('orders.recipient')}:{' '}
                  {order.shippingAddress?.recipientName || order.buyer.fullName}
                </p>
                <p>
                  {t('orders.phone')}:{' '}
                  {order.shippingAddress?.phone ||
                    order.buyer.phoneNumber ||
                    t('orders.notProvided')}
                </p>
                <p>
                  {t('orders.address')}:{' '}
                  {[
                    order.shippingAddress?.street,
                    order.shippingAddress?.ward,
                    order.shippingAddress?.district,
                    order.shippingAddress?.city,
                  ]
                    .filter(Boolean)
                    .join(', ') || t('orders.notProvided')}
                </p>
              </div>
            </Panel>
            <Panel title={t('orders.waybillPanelTitle')}>
              {order.shipment ? (
                <div className="space-y-3 text-sm text-slate-600">
                  <p className="break-all">
                    {t('orders.waybillCode')} <strong>{order.shipment.waybillCode || '—'}</strong>
                  </p>
                  <p>{t('orders.systemStatus', { status: order.shipment.status })}</p>
                  {isVerifiedGhnShipment(order.shipment) ? (
                    <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                      {t('orders.ghnVerified')}
                    </p>
                  ) : (
                    <p
                      role="alert"
                      className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800"
                    >
                      {t('orders.ghnUnverified')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t('orders.noWaybill')}</p>
              )}
            </Panel>
          </div>
          {order.escrow && (
            <Panel title={t('orders.escrowTitle')}>
              <dl className="grid gap-3 text-xs sm:grid-cols-3">
                {[
                  [t('orders.escrowStatus'), order.escrow.status],
                  [t('orders.platformFee'), financeMoney(order.escrow.platformFee)],
                  [t('orders.sellerPayout'), financeMoney(order.escrow.sellerPayout)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="mb-2 text-slate-500">{label}</dt>
                    <dd className="m-0 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
        </div>
      )}
    </SellerResourceState>
  );
}
