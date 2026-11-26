import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, Zap, Gavel, ShieldCheck, Tag, WalletCards } from 'lucide-react';
import {
  HomeBenefit,
  HomeCountdown,
  HomeFlashSaleCard,
  HomeHeroBanner,
  HomeLiveAuction,
  HomeCategoriesSection,
  HomeRecommendationsSection,
  HomeTrendingSection,
} from '../../components/home';
import { HOME_TRENDING_LIMIT } from '../../constants/trending';
import { getEventBannersApi } from '../../services/banners.service';
import {
  getRecommendationsApi,
  getProductsCatalog,
  getTrendingProducts,
  type RecommendedProduct,
  type TrendingProductItem,
} from '../../services/products.service';
import { AuctionStatus } from '@nexus/types';
import { getAuctionsApi, type AuctionEntity } from '../../services/auction.service';
import type { HomeHeroSlide, HomeProduct } from '../../components/home/home.types';

function HomePage() {
  const { t } = useTranslation('guest');
  const [banners, setBanners] = useState<HomeHeroSlide[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);

  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);

  const [liveAuctions, setLiveAuctions] = useState<AuctionEntity[]>([]);
  const [flashProducts, setFlashProducts] = useState<HomeProduct[]>([]);
  const [flashSaleEndsAt, setFlashSaleEndsAt] = useState<string | null>(null);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProductItem[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingBanners(true);
    void getEventBannersApi()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const apiSlides: HomeHeroSlide[] = data.map((b) => ({
            id: b.id,
            title: b.title,
            image: b.imageUrl,
            targetUrl: b.targetUrl || '/search',
            isFullBanner: true,
          }));
          setBanners(apiSlides);
        } else if (isMounted) {
          setBanners([]);
        }
      })
      .catch(() => {
        if (isMounted) setBanners([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingBanners(false);
      });

    // Gọi API đề xuất sản phẩm cá nhân hóa theo giỏ hàng & lịch sử mua hàng của Buyer
    setIsLoadingRecs(true);
    void getRecommendationsApi(12)
      .then((res) => {
        if (isMounted) {
          setRecommendations(res.items || []);
          setIsPersonalized(Boolean(res.personalized));
        }
      })
      .catch(() => {
        if (isMounted) {
          setRecommendations([]);
          setIsPersonalized(false);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingRecs(false);
      });

    // Ưu tiên tải các phiên đấu giá đang diễn ra (ACTIVE).
    // Nếu chưa có phiên ACTIVE nào, tải các phiên đã lên lịch (SCHEDULED) để người mua theo dõi lịch khởi tranh.
    void (async () => {
      try {
        const res = await getAuctionsApi({ limit: 4, status: AuctionStatus.ACTIVE });
        if (isMounted && res?.items && res.items.length > 0) {
          setLiveAuctions(res.items);
          return;
        }
        const schedRes = await getAuctionsApi({ limit: 4, status: AuctionStatus.SCHEDULED });
        if (isMounted && schedRes?.items && schedRes.items.length > 0) {
          setLiveAuctions(schedRes.items);
        }
      } catch (err: unknown) {
        console.warn('Không thể tải danh sách phiên đấu giá từ API:', err);
      }
    })();

    // Lấy danh sách sản phẩm Xu hướng từ API
    setIsLoadingTrending(true);
    void getTrendingProducts(HOME_TRENDING_LIMIT)
      .then((res) => {
        if (isMounted && res?.items) {
          setTrendingProducts(res.items);
        }
      })
      .catch((err) => {
        console.warn('Không thể tải sản phẩm xu hướng:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTrending(false);
      });

    // Flash Sale shows products that are actually discounted.
    //
    // It used to take the four newest products and invent the rest: an
    // `oldPrice` 15% above the real price, a 12% discount badge, a rating of 5
    // for anything unreviewed, and a "sold" count derived from the position in
    // the list. When the request returned nothing it showed four hardcoded
    // products that do not exist in the catalogue, with links to slugs that go
    // nowhere. A shopper could not tell any of it from a real offer.
    void getProductsCatalog({ limit: 12, sortBy: 'newest' })
      .then((items) => {
        if (!isMounted) return;
        const onSale = (items ?? [])
          .filter((product) => typeof product.discount === 'number' && product.discount > 0)
          .slice(0, 4);
        setFlashProducts(
          onSale.map<HomeProduct>((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            oldPrice: product.originalPrice,
            image: product.images?.[0] || '',
            discount: product.discount,
            rating: product.rating,
            sold: product.soldCount,
          })),
        );
        // The countdown runs to the first of these discounts to end.
        const ends = onSale
          .map((product) => product.saleInfo?.endAt)
          .filter((value): value is string => Boolean(value))
          .sort();
        setFlashSaleEndsAt(ends[0] ?? null);
      })
      .catch((error: unknown) => {
        console.warn('Unable to load discounted products:', error);
        if (isMounted) {
          setFlashProducts([]);
          setFlashSaleEndsAt(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-4">
      <HomeHeroBanner slides={banners} loading={isLoadingBanners} />

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {t('home.freeShippingTag')}
              </p>
              <h3 className="mt-2 text-[18px] font-bold text-slate-800">
                {t('home.freeShippingTitle')}
              </h3>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-500">
              <Truck size={22} />
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">{t('home.freeShippingDesc')}</p>

          <button className="mt-4 text-sm font-semibold text-sky-500">{t('home.claimCode')}</button>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {t('home.escrowTag')}
              </p>
              <h3 className="mt-2 text-[18px] font-bold text-slate-800">
                {t('home.payosGiftTitle')}
              </h3>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <WalletCards size={22} />
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">{t('home.payosGiftDesc')}</p>

          <button className="mt-4 text-sm font-semibold text-sky-500">{t('home.explore')}</button>
        </div>
      </section>

      <section className="mt-4 rounded-[18px] border border-slate-200 bg-white px-3 py-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <HomeBenefit icon={<Truck />} title={t('home.benefits.freeship')} />
          <HomeBenefit icon={<Zap />} title={t('home.benefits.flashSale')} />
          <HomeBenefit icon={<Gavel />} title={t('home.benefits.liveAuction')} />
          <HomeBenefit icon={<ShieldCheck />} title={t('home.benefits.mall')} />
          <HomeBenefit icon={<Tag />} title={t('home.benefits.loyalty')} />
          <HomeBenefit icon={<WalletCards />} title={t('home.benefits.payosRefund')} />
        </div>
      </section>

      <HomeCategoriesSection />

      {/* No discounts, no section: an empty Flash Sale is better than a made-up one. */}
      {flashProducts.length > 0 && (
        <section className="mt-5 rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="flex items-center gap-1.5 text-[16px] font-extrabold uppercase tracking-[0.08em] text-[#f24e1e]">
                <Zap size={18} /> Flash Sale
              </h2>

              <HomeCountdown endsAt={flashSaleEndsAt} />
            </div>

            <Link to="/search?onSale=true" className="text-xs font-semibold text-[#f36a22]">
              {t('home.viewAllPromos')}
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {flashProducts.map((product) => (
              <HomeFlashSaleCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <HomeLiveAuction auctions={liveAuctions} />

      {/* SẢN PHẨM XU HƯỚNG BÁN CHẠY (TRENDING PRODUCTS) */}
      <HomeTrendingSection products={trendingProducts} isLoading={isLoadingTrending} />

      {/* TÍNH NĂNG ĐỀ XUẤT SẢN PHẨM CÁ NHÂN HÓA (AI RECOMMENDATIONS) */}
      <HomeRecommendationsSection
        products={recommendations}
        isPersonalized={isPersonalized}
        isLoading={isLoadingRecs}
      />
    </main>
  );
}

export default HomePage;
