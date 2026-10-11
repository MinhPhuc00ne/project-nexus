import { ReactNode } from 'react';
import {
  Truck,
  Zap,
  Gavel,
  ShieldCheck,
  Tag,
  WalletCards,
  Smartphone,
  Shirt,
  Watch,
  Home,
  Bike,
  ShoppingCart,
  Star,
  Gift,
} from 'lucide-react';
import Footer from '../../components/footer/footer';

interface Product {
  id: number;
  name: string;
  price?: number;
  oldPrice?: number;
  image?: string;
  discount?: number;
  rating?: number;
  sold?: number;
  badge?: string;
}

interface Category {
  id: number;
  name: string;
  count?: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

/* =========================
   DATA
   Sau này thay bằng API
========================= */

const categories: Category[] = [
  {
    id: 1,
    name: 'Thiết Bị Điện Tử',
    icon: Smartphone,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    id: 2,
    name: 'Thời Trang',
    icon: Shirt,
    color: 'text-teal-500',
    bg: 'bg-teal-50',
  },
  {
    id: 3,
    name: 'Bàn Phím & Gear',
    icon: WalletCards,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    id: 4,
    name: 'Cổ Vật & Tác Phẩm',
    icon: Home,
    color: 'text-red-500',
    bg: 'bg-red-50',
  },
  {
    id: 5,
    name: 'Đồng Hồ & Trang Sức',
    icon: Watch,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
  },
  {
    id: 6,
    name: 'Xe Cộ & Phụ Kiện',
    icon: Bike,
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
];

const flashSaleProducts: Product[] = [];

const auctionProducts: Product[] = [];

const recommendationProducts: Product[] = [];

/* =========================
   HOME PAGE
========================= */

function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* =========================
                HERO
            ========================= */}

      <section className="mx-auto max-w-[1400px] px-4 pt-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          {/* Main Banner */}
          <div className="relative min-h-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-sky-100 p-8">
            <div className="max-w-[650px]">
              <span className="inline-block rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-500">
                SIÊU ĐẠI TIỆC THƯƠNG MẠI & ĐẤU GIÁ
              </span>

              <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
                Mua Sắm Hàng Hiệu Chuẩn Mall,
                <span className="text-sky-500"> Trải Nghiệm Đấu Giá 3D 360°</span>
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Giỏ hàng linh hoạt cho khách vãng lai. Tích hợp vận chuyển và thanh toán ký quỹ an
                toàn.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
                  Mua Sắm Ngay
                </button>

                <button className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Xem Phòng Đấu Giá 3D
                </button>
              </div>
            </div>

            <div className="absolute bottom-4 right-5 flex gap-1">
              <span className="h-1.5 w-8 rounded-full bg-orange-500" />
              <span className="h-1.5 w-2 rounded-full bg-slate-300" />
              <span className="h-1.5 w-2 rounded-full bg-slate-300" />
            </div>
          </div>

          {/* Voucher */}
          <div className="grid gap-4">
            <VoucherCard
              label="MIỄN PHÍ VẬN CHUYỂN"
              title=""
              description=""
              icon={<Truck size={25} />}
              iconClass="bg-green-50 text-green-500"
              buttonText="Lấy Mã Ngay →"
            />

            <VoucherCard
              label="CỔNG THANH TOÁN KÝ QUỸ"
              title=""
              description=""
              icon={<WalletCards size={25} />}
              iconClass="bg-orange-50 text-orange-500"
              buttonText="Khám Phá →"
            />
          </div>
        </div>
      </section>

      {/* =========================
                BENEFITS
            ========================= */}

      <section className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Benefit icon={<Truck />} title="Freeship Đơn Đầu" />
          <Benefit icon={<Zap />} title="Flash Sale Giá Vàng" />
          <Benefit icon={<Gavel />} title="Đấu Giá 3D Trực Tiếp" />
          <Benefit icon={<ShieldCheck />} title="Chính Hãng Mall" />
          <Benefit icon={<Tag />} title="Khách Hàng Thân Thiết" />
          <Benefit icon={<WalletCards />} title="Hoàn Tiền PayOS" />
        </div>
      </section>

      {/* =========================
                CATEGORY
            ========================= */}

      <section className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <SectionTitle
            icon={<ShoppingCart />}
            title="DANH MỤC SẢN PHẨM"
            action="Xem tất cả danh mục →"
          />

          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <div key={category.id} className="group cursor-pointer text-center">
                  <div
                    className={`mx-auto flex h-14 w-14 items-center justify-center rounded-xl ${category.bg} ${category.color} transition group-hover:scale-105`}
                  >
                    <Icon size={25} />
                  </div>

                  <h3 className="mt-3 text-xs font-bold text-slate-700">{category.name}</h3>

                  <p className="mt-1 text-[10px] text-slate-400">
                    {category.count ? `${category.count}+ sản phẩm` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================
                FLASH SALE
            ========================= */}

      <section className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-orange-500">⚡ FLASH SALE</h2>

              <Countdown />
            </div>

            <button className="text-xs font-semibold text-orange-500">
              Xem Tất Cả Khuyến Mãi →
            </button>
          </div>

          {flashSaleProducts.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {flashSaleProducts.map((product) => (
                <FlashSaleCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyData />
          )}
        </div>
      </section>

      {/* =========================
                LIVE AUCTION
            ========================= */}

      <section className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-white to-sky-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-500">
                ✦ TÍNH NĂNG ĐỘC QUYỀN
              </span>

              <h2 className="mt-3 text-xl font-extrabold text-slate-800">
                NEXUS LIVE AUCTION - Phòng Đấu Giá 3D Trực Tiếp
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Mô phỏng 3D góc xoay 360°, bảo vệ Anti-Sniping và hàng đợi Atomic Queue.
              </p>
            </div>

            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
              Người đang xem: --
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            {/* Chưa có image */}
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
              <span className="text-sm text-slate-400">Chưa có dữ liệu</span>
            </div>

            {/* Auction information */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Lô đặc biệt #--</span>

                <span className="rounded bg-green-50 px-2 py-1 text-xs font-semibold text-green-500">
                  Seller KYC: --
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-extrabold text-slate-800">Chưa có dữ liệu</h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">Chưa có dữ liệu</p>

              <div className="mt-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-xs text-slate-400">GIÁ HIỆN TẠI</p>

                  <p className="mt-2 text-xl font-extrabold text-sky-600">--</p>

                  <p className="text-xs text-slate-400">Tiền cọc: --</p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400">ĐẾM NGƯỢC KẾT THÚC</p>

                  <Countdown />

                  <p className="text-xs text-red-500">Anti-Sniping: --</p>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  disabled
                  className="flex-1 cursor-not-allowed rounded-xl bg-sky-300 px-5 py-3 font-bold text-white"
                >
                  Đặt Giá
                </button>

                <button
                  disabled
                  className="cursor-not-allowed rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-400"
                >
                  Chi Tiết
                </button>
              </div>
            </div>
          </div>

          {auctionProducts.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {auctionProducts.map((product) => (
                <AuctionCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =========================
                RECOMMENDATION
            ========================= */}

      <section className="mx-auto max-w-[1400px] px-4 py-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <SectionTitle icon={<Gift />} title="GỢI Ý HÔM NAY" />

          {recommendationProducts.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {recommendationProducts.map((product) => (
                <RecommendationCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyData />
          )}
        </div>
      </section>
      <Footer/>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function VoucherCard({
  label,
  title,
  description,
  icon,
  iconClass,
  buttonText,
}: {
  label: string;
  title: string;
  description: string;
  icon: ReactNode;
  iconClass: string;
  buttonText: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-green-500">{label}</p>

          <h3 className="mt-2 min-h-[24px] font-bold text-slate-800">{title}</h3>

          <p className="mt-1 min-h-[18px] text-xs text-slate-400">{description}</p>

          <button className="mt-2 text-xs font-semibold text-sky-500">{buttonText}</button>
        </div>

        <div className={`rounded-xl p-4 ${iconClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function Benefit({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex min-h-[80px] items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <div className="text-orange-500">{icon}</div>

      <span className="text-xs font-bold text-slate-700">{title}</span>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
      <div className="flex items-center gap-2">
        <span className="text-sky-500">{icon}</span>

        <h2 className="text-base font-extrabold text-slate-800">{title}</h2>
      </div>

      {action && <button className="text-xs font-semibold text-sky-500">{action}</button>}
    </div>
  );
}

/* =========================================================
   COUNTDOWN
========================================================= */

function Countdown() {
  return (
    <div className="flex items-center gap-1">
      <TimerBox value="--" />

      <span>:</span>

      <TimerBox value="--" />

      <span>:</span>

      <TimerBox value="--" />
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
   EMPTY DATA
========================================================= */

function EmptyData() {
  return (
    <div className="flex min-h-[180px] items-center justify-center">
      <p className="text-sm text-slate-400">Chưa có dữ liệu</p>
    </div>
  );
}

/* =========================================================
   PRODUCT CARDS
========================================================= */

function FlashSaleCard({ product }: { product: Product }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex aspect-square items-center justify-center bg-slate-100">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 min-h-[40px] text-xs font-bold text-slate-700">
          {product.name}
        </h3>

        <p className="mt-2 text-sm font-extrabold text-orange-500">
          {product.price ? `${product.price.toLocaleString()} đ` : '--'}
        </p>
      </div>
    </div>
  );
}

function AuctionCard({ product }: { product: Product }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
      <div className="flex aspect-video items-center justify-center rounded-lg bg-slate-100">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex aspect-square items-center justify-center bg-slate-100">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
      </div>

      <div className="p-3">
        <p className="text-[10px] text-slate-400">Nexus Store</p>

        <h3 className="mt-1 line-clamp-2 min-h-[34px] text-xs font-semibold text-slate-700">
          {product.name || 'Chưa có dữ liệu'}
        </h3>

        <div className="mt-2 flex items-center gap-1 text-[10px]">
          <Star size={12} className="fill-yellow-400 text-yellow-400" />

          <span className="font-semibold text-slate-600">{product.rating ?? '--'}</span>

          <span className="text-slate-400">({product.sold ?? '--'})</span>
        </div>

        <p className="mt-2 text-sm font-extrabold text-orange-500">
          {product.price ? `${product.price.toLocaleString()} đ` : '--'}
        </p>
      </div>
    </div>
  );
}

export default HomePage;
