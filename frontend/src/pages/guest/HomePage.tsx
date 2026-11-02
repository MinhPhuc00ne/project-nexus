import { useState, useEffect } from 'react';
import { Truck, Zap, Gavel, ShieldCheck, Tag, WalletCards, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import CatalogListing from '../../components/products/CatalogListing';
import {
  HomeBenefit,
  HomeCountdown,
  HomeFlashSaleCard,
  HomeHeroBanner,
  HomeLiveAuction,
  HomeCategoriesSection,
} from '../../components/home';
import { flashSaleProducts, auctionProducts, heroSlides } from '../../mocks/home.mock';
import { getEventBannersApi } from '../../services/banners.service';
import type { HomeHeroSlide } from '../../components/home/home.types';

function HomePage() {
  const [banners, setBanners] = useState<HomeHeroSlide[]>(heroSlides);

  useEffect(() => {
    let isMounted = true;
    void getEventBannersApi()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const apiSlides: HomeHeroSlide[] = data.map((b) => ({
            title: b.title,
            image: b.imageUrl,
            targetUrl: b.targetUrl || '/search',
            isFullBanner: true,
          }));
          setBanners(apiSlides);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-4">
      <HomeHeroBanner slides={banners} />

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

      <HomeCategoriesSection />

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
