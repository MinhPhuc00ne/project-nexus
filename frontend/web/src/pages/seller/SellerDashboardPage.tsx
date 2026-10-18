import { Link } from 'react-router-dom';
import { useSellerSession } from './SellerSession';

export default function SellerDashboardPage() {
  const user = useSellerSession();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Tổng quan gian hàng</h1>
      <p className="mt-2 text-slate-600">Xin chào {user?.fullName}.</p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          [
            'Số dư ví',
            `${Number(user?.wallet?.balance ?? 0).toLocaleString('vi-VN')} ${user?.wallet?.currency ?? 'VND'}`,
          ],
          ['Điểm uy tín', user?.reputationScore ?? 0],
          ['Mức tín nhiệm', user?.trustLevel ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-5">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="mt-2 text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/seller/products" className="rounded-lg bg-blue-700 px-4 py-2 text-white">
          Quản lý sản phẩm
        </Link>
        <Link to="/seller/orders" className="rounded-lg border bg-white px-4 py-2">
          Xem đơn hàng
        </Link>
      </div>
    </main>
  );
}
