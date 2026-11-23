import { useTranslation } from 'react-i18next';
import { Flame, AlertTriangle, Package } from 'lucide-react';
import { Badge, Button, EmptyState } from '../shared/AdminUI';
import { formatMoney } from '../shared/adminData';
import type { AdminTrendingProductItem } from '../../../services/adminCommerce';

interface AdminTrendingTableProps {
  items: AdminTrendingProductItem[];
  loading: boolean;
  removingId: string | null;
  onRemove: (item: AdminTrendingProductItem) => void;
}

function renderTrendingRank(rank: number) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
        🏆 #1
      </span>
    );
  }
  return <span className="font-semibold text-slate-700">#{rank}</span>;
}

export function AdminTrendingTable({
  items,
  loading,
  removingId,
  onRemove,
}: AdminTrendingTableProps) {
  const { t } = useTranslation('admin');

  if (loading) {
    return (
      <p role="status" className="py-10 text-center text-sm text-slate-500">
        {t('products.trending.loading')}
      </p>
    );
  }

  if (items.length === 0) {
    return <EmptyState text={t('products.trending.empty')} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-xs">
        <thead className="bg-orange-50 text-slate-600 font-bold">
          <tr>
            <th className="px-3 py-3 w-16">{t('products.trending.cols.rank')}</th>
            <th className="px-3 py-3">{t('products.trending.cols.product')}</th>
            <th className="px-3 py-3">{t('products.trending.cols.seller')}</th>
            <th className="px-3 py-3">{t('products.trending.cols.purchaseCount')}</th>
            <th className="px-3 py-3">{t('products.trending.cols.price')}</th>
            <th className="px-3 py-3">{t('products.trending.cols.status')}</th>
            <th className="px-3 py-3 text-right">{t('products.trending.cols.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item, index) => {
            const rank = index + 1;
            const shopName =
              item.shopName || item.seller?.fullName || t('products.trending.defaultSeller');

            return (
              <tr key={item.id} className="hover:bg-slate-50/80">
                <td className="px-3 py-3.5 font-bold">{renderTrendingRank(rank)}</td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-2.5">
                    {item.images?.[0]?.imageUrl ? (
                      <img
                        src={item.images[0].imageUrl}
                        alt=""
                        className="h-10 w-10 rounded border border-slate-200 object-contain shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Package size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate max-w-[280px]">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.category?.name || t('products.trending.uncategorized')}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <p className="font-semibold text-slate-800">{shopName}</p>
                  <p className="text-[11px] text-slate-400">{item.seller?.email}</p>
                </td>
                <td className="px-3 py-3.5">
                  <span className="inline-flex items-center gap-1 font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                    <Flame size={12} className="text-orange-500 fill-orange-500" />
                    {t('products.trending.purchasesBadge', { count: item.purchaseCount })}
                  </span>
                </td>
                <td className="px-3 py-3.5 font-bold text-slate-900">
                  {formatMoney(Number(item.basePrice))}
                </td>
                <td className="px-3 py-3.5">
                  {item.trendingExcluded ? (
                    <Badge tone="red">{t('products.trending.statusExcluded')}</Badge>
                  ) : (
                    <Badge tone="green">{t('products.trending.statusActive')}</Badge>
                  )}
                </td>
                <td className="px-3 py-3.5 text-right">
                  {!item.trendingExcluded ? (
                    <Button
                      variant="secondary"
                      disabled={removingId === item.id}
                      onClick={() => onRemove(item)}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs"
                    >
                      <AlertTriangle size={12} className="text-red-500 mr-1" />
                      {removingId === item.id
                        ? t('products.trending.processing')
                        : t('products.trending.removeBtn')}
                    </Button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      {t('products.trending.statusExcludedShort')}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
