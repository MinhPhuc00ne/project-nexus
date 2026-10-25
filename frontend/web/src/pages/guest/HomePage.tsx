import { Truck, Zap, Gavel, ShieldCheck, Tag, WalletCards, ShoppingCart, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import CatalogListing from '../../components/products/CatalogListing';
import {
  HomeBenefit,
  HomeCountdown,
  HomeFlashSaleCard,
  HomeHeroBanner,
  HomeLiveAuction,
} from '../../components/home';
import { categories, flashSaleProducts, auctionProducts, heroSlides } from '../../mocks/home.mock';

function HomePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-4">
      <HomeHeroBanner slides={heroSlides} />

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Miễn Phí Vận Chuyển
              </p>
              <h3 className="mt-2 text-[18px] font-bold text-slate-800">Voucher GNM 0Đ</h3>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-500">
              <Truck size={22} />
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">Áp dụng cho mọi đơn hàng đầu tiên</p>

          <button className="mt-4 text-sm font-semibold text-sky-500">Lấy Mã Ngay →</button>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Cổng Thanh Toán Ký Quỹ
              </p>
              <h3 className="mt-2 text-[18px] font-bold text-slate-800">Hoàn 5% Quà PayOS</h3>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <WalletCards size={22} />
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">Giao dịch bảo mật, sớm nhận ưu đãi</p>

          <button className="mt-4 text-sm font-semibold text-sky-500">Khám Phá →</button>
        </div>
      </section>

      <section className="mt-4 rounded-[18px] border border-slate-200 bg-white px-3 py-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <HomeBenefit icon={<Truck />} title="Freeship Đơn Đầu" />
          <HomeBenefit icon={<Zap />} title="Flash Sale Giá Vàng" />
          <HomeBenefit icon={<Gavel />} title="Đấu Giá 3D Trực Tiếp" />
          <HomeBenefit icon={<ShieldCheck />} title="Chính Hãng Mall" />
          <HomeBenefit icon={<Tag />} title="Khách Hàng Thân Thiết" />
          <HomeBenefit icon={<WalletCards />} title="Hoàn Tiền PayOS" />
        </div>
      </section>

      <section className="mt-5 rounded-[18px] border border-sky-200 bg-gradient-to-b from-sky-50/70 to-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sky-500">
              <ShoppingCart size={18} />
            </span>
            <h2 className="text-[15px] font-extrabold uppercase tracking-[0.05em] text-slate-800">
              Danh Mục Sản Phẩm
            </h2>
          </div>

          <button className="text-xs font-semibold text-sky-500">Xem tất cả danh mục →</button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="rounded-[14px] border border-slate-100 bg-slate-50 p-3 text-center transition-[transform,box-shadow,border-color] duration-[180ms] ease-in-out hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:shadow-[0_10px_24px_rgb(28_57_115_/_10%)] motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <img
                src={category.image}
                alt={category.name}
                loading="lazy"
                className="mx-auto h-20 w-20 rounded-[14px] object-cover"
              />

              <h3 className="mt-3 text-[13px] font-bold leading-5 text-slate-700">
                {category.name}
              </h3>

              <p className="mt-1 text-[11px] text-slate-400">
                {category.count ? `${category.count}+ sản phẩm` : 'Nhiều sản phẩm'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-1.5 text-[16px] font-extrabold uppercase tracking-[0.08em] text-[#f24e1e]">
              <Zap size={18} /> Flash Sale
            </h2>

            <HomeCountdown />
          </div>

          <button className="text-xs font-semibold text-[#f36a22]">Xem Tất Cả Khuyến Mãi →</button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {flashSaleProducts.map((product) => (
            <HomeFlashSaleCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <HomeLiveAuction products={auctionProducts} />

      <section className="mt-5 rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sky-500">
              <Gift size={18} />
            </span>
            <h2 className="text-[15px] font-extrabold uppercase tracking-[0.08em] text-slate-800">
              Gợi Ý Hôm Nay
            </h2>
          </div>

          <Link to="/search" className="text-xs font-semibold text-blue-600">
            Xem tất cả →
          </Link>
        </div>

        <div className="mt-4">
          <CatalogListing preview />
        </div>
      </section>
    </main>
  );
}

export default HomePage;
