import { HomeCountdown } from './HomeCountdown';
import { HomeAuctionCard } from './HomeAuctionCard';
import type { HomeProduct } from './home.types';

export interface HomeLiveAuctionProps {
  products: HomeProduct[];
}

export function HomeLiveAuction({ products }: HomeLiveAuctionProps) {
  const featured = products[0];

  if (!featured) return null;

  return (
    <section className="mt-5 rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 text-sky-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
            Tính Năng Độc Quyền
          </span>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
          Người đang xem: 1,42k
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-[15px] font-extrabold uppercase tracking-[0.04em] text-slate-800">
          NEXUS LIVE AUCTION - Phòng Đấu Giá 3D Trực Tiếp
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Mô phỏng 3D góc xoay 360°, bảo vệ Anti-Sniping và hàng đợi Atomic Queue.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative aspect-video overflow-hidden rounded-[18px] border border-slate-300 bg-slate-950">
          <img
            src={featured.image}
            alt={featured.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded bg-red-500 px-2.5 py-1 text-[10px] font-bold text-white">
              LIVE ADMIN
            </span>
            <span className="rounded border border-sky-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-sky-600">
              Màn hình 3D 360°
            </span>
          </div>
          <span className="absolute right-3 top-3 rounded bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
            Cọc 10% (Hoàn tự động)
          </span>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/70 bg-white/90 p-2 backdrop-blur-sm">
            <span className="text-[10px] font-medium text-slate-600">
              Góc máy: Hero Perspective 45°
            </span>
            <div className="flex gap-2">
              <button className="rounded border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                Xoay 3D
              </button>
              <button className="rounded border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                Ảnh Thực Tế
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Lô đặc biệt #01
            </span>

            <span className="rounded bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-500">
              Seller KYC: Verified
            </span>
          </div>

          <h3 className="mt-4 text-[22px] font-extrabold text-slate-800">{featured.name}</h3>

          <p className="mt-2 text-sm text-slate-500">
            Mẫu đang được người mua theo dõi ngay trong phòng đấu giá tương tác 3D.
          </p>

          <div className="mt-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Giá Hiện Tại
              </p>
              <p className="mt-2 text-[24px] font-extrabold text-sky-600">
                {featured.price?.toLocaleString()} đ
              </p>
              <p className="text-[11px] text-slate-400">Tiền cọc: 25.000.000 đ</p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Đếm Ngược Kết Thúc
              </p>
              <div className="mt-2 flex justify-end">
                <HomeCountdown values={['00', '04', '31']} />
              </div>
              <p className="mt-2 text-[11px] text-red-500">Anti-Sniping: Active</p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button className="flex-1 rounded-xl bg-[#1a8bff] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 hover:bg-[#1277eb]">
              Đặt Giá
            </button>

            <button className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Chi Tiết
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {products.slice(1).map((product) => (
          <HomeAuctionCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
