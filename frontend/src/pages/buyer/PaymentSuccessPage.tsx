import { useEffect, useState, type JSX } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { checkPaymentStatusApi } from '../../services/orders';

export default function PaymentSuccessPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const orderCode = searchParams.get('orderCode');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    checkPaymentStatusApi(orderId)
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-12 text-slate-800">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
          <CheckCircle2 size={44} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900">Thanh Toán Thành Công!</h1>
          <p className="text-xs text-slate-500">
            {orderCode
              ? `Mã giao dịch: ${orderCode} • Đã ghi nhận ký quỹ an toàn`
              : 'Giao dịch chuyển khoản PayOS VietQR đã được xác nhận thành công.'}
          </p>
        </div>

        <div className="space-y-2 rounded-xl bg-emerald-50/70 p-4 text-left text-xs text-emerald-900 border border-emerald-200">
          <p className="font-semibold text-emerald-950">
            Tiền thanh toán đang được giữ ký quỹ tại NEXUS Escrow.
          </p>
          <p className="text-[11px] text-emerald-800">
            {loading
              ? 'Đang đồng bộ trạng thái đơn hàng...'
              : 'Người bán đã nhận được đơn hàng và đang tiến hành đóng gói để giao hàng.'}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link
            to="/buyer/orders"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
          >
            <span>Xem đơn hàng</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            to="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <ShoppingBag size={14} />
            <span>Tiếp tục mua sắm</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
