import { ReloadOutlined, ShopOutlined } from '@ant-design/icons';
import { useSellerWorkspace } from './SellerWorkspace';
import { Panel, SellerButton } from './SellerUI';

export default function SellerShopInfo() {
  const { shop, storeLoading, storeError, refreshShop } = useSellerWorkspace();
  const address = shop?.address;
  const shopLogoUrl = shop?.avatarUrl ?? null;

  const fields = shop
    ? [
        ['Tên gian hàng', shop.name],
        ['Chủ gian hàng', shop.sellerFullName],
        [
          'Địa chỉ',
          address?.formattedAddress ||
            [address?.street, address?.ward, address?.district, address?.city]
              .filter(Boolean)
              .join(', ') ||
            'Chưa có địa chỉ',
        ],
        ['Sản phẩm đang bán', String(shop.stats.totalProducts)],
        ['Số đánh giá', String(shop.stats.totalReviews)],
        ['Điểm uy tín', String(shop.reputationScore)],
      ]
    : [];
  return (
    <Panel
      title="Thông tin gian hàng trên hệ thống"
      action={
        <SellerButton secondary onClick={refreshShop} disabled={storeLoading}>
          <ReloadOutlined /> Làm mới
        </SellerButton>
      }
    >
      {storeLoading && (
        <p role="status" className="py-5 text-sm text-slate-500">
          Đang tải thông tin gian hàng…
        </p>
      )}
      {storeError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {storeError}
        </p>
      )}
      {!storeLoading && !storeError && shop && (
        <div className="space-y-4">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-blue-200 bg-blue-50 text-xl text-blue-600">
              {shopLogoUrl ? (
                <img src={shopLogoUrl} alt={shop.name} className="h-full w-full object-cover" />
              ) : (
                <ShopOutlined />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{shop.name}</p>
              <p className="text-xs text-slate-500">
                Logo gian hàng độc lập · Chủ sở hữu: {shop.sellerFullName}
              </p>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="mb-1 text-xs text-slate-500">{label}</dt>
                <dd className="m-0 break-words text-sm font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs text-slate-500">Mô tả gian hàng</p>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
              {shop.description || 'Chưa có mô tả gian hàng.'}
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}
