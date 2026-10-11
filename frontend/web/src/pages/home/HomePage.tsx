import { ReactNode, useState } from 'react';
import {
  Truck,
  Zap,
  Gavel,
  ShieldCheck,
  Tag,
  WalletCards,
  ShoppingCart,
  Star,
  Gift,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Heart,
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price?: number;
  oldPrice?: number;
  image?: string;
  discount?: number;
  rating?: number;
  sold?: number;
  saleSold?: number;
  badge?: string;
}

interface Category {
  id: number;
  name: string;
  count?: number;
  image: string;
}

/* =========================
   DATA
   Sau này thay bằng API
========================= */

const categories: Category[] = [
  {
    id: 1,
    name: 'Thiết Bị Điện Tử',
    image:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 2,
    name: 'Thời Trang',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 3,
    name: 'Bàn Phím & Gear',
    image:
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 4,
    name: 'Cổ Vật & Tác Phẩm',
    image:
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 5,
    name: 'Đồng Hồ & Trang Sức',
    image:
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 6,
    name: 'Xe Cộ & Phụ Kiện',
    image:
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=320&q=80',
  },
];

const flashSaleProducts: Product[] = [
  {
    id: 1,
    name: 'Bàn Phím Cơ Billet Brass Deck',
    price: 16200000,
    oldPrice: 24998000,
    discount: 35,
    rating: 4.9,
    saleSold: 45,
    image:
      'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    name: 'Áo Khoác Techwear CORE-PRO',
    price: 8900000,
    oldPrice: 12360000,
    discount: 28,
    rating: 4.8,
    saleSold: 32,
    image:
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    name: 'Ví Lạnh Titanium VaultKey EAL7',
    price: 6500000,
    oldPrice: 10800000,
    discount: 40,
    rating: 4.7,
    saleSold: 27,
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    name: 'Tai Nghe Planar Magnetic Alpha',
    price: 34500000,
    oldPrice: 43125000,
    discount: 20,
    rating: 4.9,
    saleSold: 18,
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
  },
];

const auctionProducts: Product[] = [
  {
    id: 1,
    name: 'Siêu Xe Concept G7 Carbon',
    price: 245000000,
    oldPrice: 320000000,
    discount: 23,
    rating: 4.8,
    sold: 96,
    image:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 2,
    name: 'Đồng Hồ Chronograph Titan',
    price: 18500000,
    oldPrice: 24000000,
    discount: 23,
    rating: 4.9,
    sold: 72,
    image:
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 3,
    name: 'Bình Ngọc Cổ Điển 3D',
    price: 9800000,
    oldPrice: 13000000,
    discount: 25,
    rating: 4.8,
    sold: 58,
    image:
      'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 4,
    name: 'Xe Máy Điện Concept Nexus-V',
    price: 180000000,
    oldPrice: 220000000,
    discount: 18,
    rating: 4.9,
    sold: 19,
    image:
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
  },
];

const recommendationProducts: Product[] = [
  {
    id: 1,
    name: 'Bộ Khuếch Đại Âm Thanh Mini',
    price: 1200000,
    oldPrice: 1800000,
    rating: 4.9,
    sold: 160,
    image:
      'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    name: 'Loa Bluetooth Studio X8',
    price: 2450000,
    oldPrice: 3200000,
    rating: 4.8,
    sold: 240,
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    name: 'Laptop Gaming 14 inch',
    price: 26400000,
    oldPrice: 34000000,
    rating: 4.9,
    sold: 90,
    image:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    name: 'TV Smart OLED 4K 55 inch',
    price: 18900000,
    oldPrice: 24900000,
    rating: 4.7,
    sold: 147,
    image:
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 5,
    name: 'Máy Chụp Ảnh Mini Pocket',
    price: 5400000,
    oldPrice: 7200000,
    rating: 4.8,
    sold: 88,
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 6,
    name: 'Ghế Gamming Ergonomic',
    price: 8900000,
    oldPrice: 12500000,
    rating: 4.7,
    sold: 120,
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 7,
    name: 'Tai Nghe Không Dây Elite',
    price: 3200000,
    oldPrice: 4500000,
    rating: 4.8,
    sold: 340,
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 8,
    name: 'Đèn Chiếu Sáng RGB Pro',
    price: 1800000,
    oldPrice: 2500000,
    rating: 4.6,
    sold: 200,
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
  },
];

/* =========================
   HOME PAGE
========================= */

function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);

  const heroSlides = [
    {
      badge: 'SIÊU ĐẠI TIỆC THƯƠNG MẠI & ĐẤU GIÁ',
      title: 'Mua Sắm Hàng Hiệu Chuẩn',
      accent: 'Mall, Trải Nghiệm Đấu Giá 3D 360°',
      description:
        'Giao hàng linh hoạt cho khách vãng lai. Tích hợp vận chuyển và thanh toán ký quỹ an toàn.',
      image: auctionProducts[0].image,
    },
    {
      badge: 'FLASH SALE HÔM NAY',
      title: 'Săn Deal Hot Cho Mỗi Gia Đình,',
      accent: 'Giảm Tới 50% Trong 24h',
      description:
        'Khám các sản phẩm hot, ưu đãi theo danh mục, đồng thời nhận voucher và miễn phí vận chuyển.',
      image: flashSaleProducts[0].image,
    },
    {
      badge: 'ĐẤU GIÁ 3D TRỰC TIẾP',
      title: 'Mở Bán Chỉ Với Một Click,',
      accent: 'Đặt Giá Dễ Dàng, An Toàn',
      description:
        'Tham gia đấu giá 3D trực tiếp, theo dõi lô hàng real-time và săn ưu đãi khởi điểm hấp dẫn.',
      image: auctionProducts[1].image,
    },
  ];

  const activeHeroSlide = heroSlides[activeSlide];
  const showPreviousSlide = () =>
    setActiveSlide((current) => (current === 0 ? heroSlides.length - 1 : current - 1));
  const showNextSlide = () =>
    setActiveSlide((current) => (current === heroSlides.length - 1 ? 0 : current + 1));

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-4">
      <section className="rounded-[18px] border border-slate-200 bg-slate-100/60 p-5">
        <div className="relative flex h-[520px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-sky-50 via-sky-100 to-sky-50 p-5 sm:h-[440px] sm:p-6 lg:h-[360px] lg:p-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] opacity-20 sm:opacity-30 lg:w-[48%] lg:opacity-100">
            <img
              src={activeHeroSlide.image}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-sky-100 via-sky-100/60 to-transparent" />
          </div>

          <div className="relative z-10 lg:max-w-[62%]">
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-500">
              {activeHeroSlide.badge}
            </span>

            <h1 className="mt-4 max-w-[980px] text-2xl font-black leading-[1.04] tracking-[-0.04em] text-slate-900 sm:text-3xl lg:text-[44px]">
              {activeHeroSlide.title}
              <span className="mt-2 block text-sky-500">{activeHeroSlide.accent}</span>
            </h1>

            <p className="mt-3 line-clamp-2 max-w-[820px] text-sm leading-6 text-slate-600 sm:text-[15px]">
              {activeHeroSlide.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className="rounded-xl bg-[#f36a22] px-6 py-3 text-base font-bold text-white shadow-[0_8px_20px_rgba(243,106,34,0.25)] transition hover:bg-[#ea5b10]">
                Mua Sắm Ngay
              </button>

              <button className="rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-white">
                Xem Phòng Đấu Giá 3D
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-auto flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Chuyển đến slide ${index + 1}`}
                  onClick={() => setActiveSlide(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    activeSlide === index ? 'w-10 bg-[#f36a22]' : 'w-2.5 bg-slate-300'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Banner trước"
                onClick={showPreviousSlide}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-orange-300 hover:text-[#f36a22]"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Banner tiếp theo"
                onClick={showNextSlide}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-orange-300 hover:text-[#f36a22]"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

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
          <Benefit icon={<Truck />} title="Freeship Đơn Đầu" />
          <Benefit icon={<Zap />} title="Flash Sale Giá Vàng" />
          <Benefit icon={<Gavel />} title="Đấu Giá 3D Trực Tiếp" />
          <Benefit icon={<ShieldCheck />} title="Chính Hãng Mall" />
          <Benefit icon={<Tag />} title="Khách Hàng Thân Thiết" />
          <Benefit icon={<WalletCards />} title="Hoàn Tiền PayOS" />
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
              className="rounded-[14px] border border-slate-100 bg-slate-50 p-3 text-center transition hover:border-sky-200 hover:bg-sky-50"
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

            <Countdown />
          </div>

          <button className="text-xs font-semibold text-[#f36a22]">Xem Tất Cả Khuyến Mãi →</button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {flashSaleProducts.map((product) => (
            <FlashSaleCard key={product.id} product={product} />
          ))}
        </div>
      </section>

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
              src={auctionProducts[0].image}
              alt={auctionProducts[0].name}
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

            <h3 className="mt-4 text-[22px] font-extrabold text-slate-800">
              {auctionProducts[0].name}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Mẫu đang được người mua theo dõi ngay trong phòng đấu giá tương tác 3D.
            </p>

            <div className="mt-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Giá Hiện Tại
                </p>
                <p className="mt-2 text-[24px] font-extrabold text-sky-600">
                  {auctionProducts[0].price?.toLocaleString()} đ
                </p>
                <p className="text-[11px] text-slate-400">Tiền cọc: 25.000.000 đ</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Đếm Ngược Kết Thúc
                </p>
                <div className="mt-2 flex justify-end">
                  <Countdown values={['00', '04', '31']} />
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
          {auctionProducts.slice(1).map((product) => (
            <AuctionCard key={product.id} product={product} />
          ))}
        </div>
      </section>

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

          <button className="text-xs font-semibold text-sky-500">Xem thêm →</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {recommendationProducts.map((product) => (
            <RecommendationCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <button className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:bg-sky-50">
            Xem Thêm 2,400+ Sản Phẩm Khác <ChevronDown size={14} className="ml-1 inline" />
          </button>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Benefit({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex min-h-[80px] items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <div className="text-orange-500">{icon}</div>

      <span className="text-xs font-bold text-slate-700">{title}</span>
    </div>
  );
}

/* =========================================================
   COUNTDOWN
========================================================= */

function Countdown({ values = ['02', '45', '17'] }: { values?: [string, string, string] }) {
  return (
    <div className="flex items-center gap-1">
      <TimerBox value={values[0]} />

      <span>:</span>

      <TimerBox value={values[1]} />

      <span>:</span>

      <TimerBox value={values[2]} />
    </div>
  );
}

function TimerBox({ value }: { value: string }) {
  return (
    <span className="rounded bg-slate-800 px-2 py-1 font-mono text-xs font-bold text-white">
      {value}
    </span>
  );
}

/* =========================================================
   PRODUCT CARDS
========================================================= */

function FlashSaleCard({ product }: { product: Product }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-slate-300 bg-slate-900 p-1">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full rounded-md object-cover"
          />
        ) : (
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
        {product.discount ? (
          <span className="absolute left-2 top-2 rounded bg-[#f24e1e] px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            -{product.discount}%
          </span>
        ) : null}
      </div>

      <div className="px-1 pb-1 pt-2">
        <h3 className="truncate text-xs font-semibold text-slate-700">{product.name}</h3>

        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-sm font-extrabold text-[#f24e1e]">
            {product.price ? `${product.price.toLocaleString()} đ` : '--'}
          </p>
          {product.oldPrice ? (
            <p className="truncate text-[10px] text-slate-400 line-through">
              {product.oldPrice.toLocaleString()} đ
            </p>
          ) : null}
        </div>

        <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#f36a22]"
            style={{ width: `${Math.min(((product.saleSold ?? 0) / 50) * 100, 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold leading-none text-white drop-shadow">
            ĐÃ BÁN {product.saleSold ?? 0}/50
          </span>
        </div>
      </div>
    </div>
  );
}

function AuctionCard({ product }: { product: Product }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
        <span className="absolute left-2 top-2 rounded bg-sky-500 px-2 py-1 text-[10px] font-bold text-white">
          3D MODEL
        </span>
        <button
          type="button"
          aria-label={`Xem mô hình ${product.name}`}
          className="absolute bottom-2 right-2 rounded-md border border-white/70 bg-slate-900/70 px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-slate-900"
        >
          Xem 3D
        </button>
      </div>

      <div className="p-2">
        <h3 className="text-xs font-bold text-slate-700">{product.name || 'Chưa có dữ liệu'}</h3>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-extrabold text-sky-500">
            {product.price ? `${product.price.toLocaleString()} đ` : '--'}
          </span>

          <span className="text-[10px] text-slate-400">
            {product.sold ? `${product.sold} lượt bid` : '-- lượt bid'}
          </span>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ product }: { product: Product }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-sky-200 hover:shadow-sm">
      <div className="relative flex aspect-square items-center justify-center bg-slate-100">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
        <span className="absolute left-2 top-2 rounded bg-[#f24e1e] px-2 py-1 text-[9px] font-bold text-white">
          {product.badge || (product.id % 2 === 0 ? 'HOT' : 'MALL')}
        </span>
        <button
          type="button"
          aria-label={`Yêu thích ${product.name}`}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:text-rose-500"
        >
          <Heart size={16} />
        </button>
      </div>

      <div className="p-2.5 sm:p-3">
        <p className="truncate text-[10px] text-slate-500">
          Nexus Store · <span className="text-green-600">● Hoạt động</span>
        </p>

        <h3 className="mt-1 line-clamp-2 min-h-[34px] text-xs font-semibold text-slate-700">
          {product.name || 'Chưa có dữ liệu'}
        </h3>

        <div className="mt-2 flex items-center gap-1 text-[10px]">
          <Star size={12} className="fill-yellow-400 text-yellow-400" />

          <span className="font-semibold text-slate-600">{product.rating ?? '--'}</span>

          <span className="text-slate-400">({product.sold ?? '--'} đã bán)</span>
        </div>

        <p className="mt-2 text-sm font-extrabold text-orange-500">
          {product.price ? `${product.price.toLocaleString()} đ` : '--'}
        </p>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-green-600">
          <Truck size={12} /> Giao hàng nhanh toàn quốc
        </p>

        <button className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:bg-sky-50">
          Thêm Giỏ
        </button>
      </div>
    </div>
  );
}

export default HomePage;
