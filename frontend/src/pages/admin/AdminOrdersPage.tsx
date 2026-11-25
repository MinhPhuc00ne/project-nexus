import OrderManagement from '../../components/adminDashboard/Orders/OrderManagement';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReturnManagement from '../../components/adminDashboard/Orders/ReturnManagement';

export default function AdminOrdersPage() {
  const { t } = useTranslation('admin');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'returns' ? 'returns' : 'orders';
  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label={t('orders.tabsAria')}
        className="flex gap-2 rounded-xl bg-slate-100 p-1.5"
      >
        {(
          [
            ['orders', t('orders.tabOrders')],
            ['returns', t('orders.tabReturns')],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`orders-tab-${value}`}
            aria-controls="orders-tab-panel"
            aria-selected={tab === value}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${tab === value ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('tab', value);
              next.delete('order');
              next.delete('return');
              setParams(next);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="orders-tab-panel" aria-labelledby={`orders-tab-${tab}`}>
        {tab === 'returns' ? <ReturnManagement /> : <OrderManagement />}
      </div>
    </div>
  );
}
