import { useEffect, useState } from 'react';
import './AdminPage.css';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  Gavel,
  Gamepad2,
  Grid2X2,
  Heart,
  HelpCircle,
  Laptop,
  List,
  LockKeyhole,
  Menu,
  Minus,
  PackageCheck,
  Package,
  Palette,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Tag,
  TimerReset,
  TrendingUp,
  Truck,
  User,
  Wallet,
  Watch,
  X,
  Zap,
} from 'lucide-react';

type Page =
  | 'home'
  | 'search'
  | 'auction-list'
  | 'auction'
  | 'register'
  | 'login'
  | 'forgot-password'
  | 'seller'
  | 'cart'
  | 'admin'
  | 'staff-invite'
  | 'staff';

const images = {
  hero: 'https://images.unsplash.com/photo-1634140704051-58a787556cd1?auto=format&fit=crop&w=1600&q=88',
  watch1:
    'https://images.unsplash.com/photo-1670177257750-9b47927f68eb?auto=format&fit=crop&w=900&q=85',
  watch2:
    'https://images.unsplash.com/photo-1633869699811-cd4f63049b36?auto=format&fit=crop&w=900&q=85',
  watch3:
    'https://images.unsplash.com/photo-1634140704051-58a787556cd1?auto=format&fit=crop&w=900&q=85',
  watch4:
    'https://images.unsplash.com/photo-1772949399823-dcd1678fcce7?auto=format&fit=crop&w=900&q=85',
  keyboard:
    'https://images.unsplash.com/photo-1658553344052-889351af5e5b?auto=format&fit=crop&w=900&q=85',
  keyboardRgb:
    'https://images.unsplash.com/photo-1658863027863-290bb2f1119f?auto=format&fit=crop&w=900&q=85',
  headphones:
    'https://images.unsplash.com/photo-1605170876472-db58e15c430e?auto=format&fit=crop&w=900&q=85',
  headset:
    'https://images.unsplash.com/photo-1673669231301-09baa4d7761b?auto=format&fit=crop&w=900&q=85',
  desk: 'https://images.unsplash.com/photo-1729327741363-db735223ec64?auto=format&fit=crop&w=900&q=85',
  fashion:
    'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=900&q=85',
  clothes:
    'https://images.unsplash.com/photo-1666358062771-c806651d3bf7?auto=format&fit=crop&w=900&q=85',
  home: 'https://images.unsplash.com/photo-1787755336845-45d78fe7d580?auto=format&fit=crop&w=900&q=85',
  decor:
    'https://images.unsplash.com/photo-1723902499495-e31fda518516?auto=format&fit=crop&w=900&q=85',
  delivery:
    'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=900&q=85',
  payment:
    'https://images.unsplash.com/photo-1706814901248-5ac8b312c5f3?auto=format&fit=crop&w=900&q=85',
};

const products = [
  {
    title: 'Longines Master Collection Moonphase',
    price: '68.500.000 ₫',
    image: images.watch1,
    type: 'Mua ngay',
    rating: '4,9',
    meta: 'Đã bán 18',
  },
  {
    title: 'Omega Seamaster Aqua Terra 41mm',
    price: '128.500.000 ₫',
    image: images.watch2,
    type: 'Đang đấu giá',
    rating: '',
    meta: 'Còn 01:24:18',
  },
  {
    title: 'Grand Seiko Heritage Spring Drive',
    price: '112.000.000 ₫',
    image: images.watch3,
    type: 'Mua ngay',
    rating: '4,8',
    meta: 'Đã bán 7',
  },
  {
    title: 'Cartier Santos de Cartier Medium',
    price: '92.000.000 ₫',
    image: images.watch4,
    type: 'Sắp diễn ra',
    rating: '',
    meta: '20:00 · 24/06',
  },
];

function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
    >
      {children}
    </button>
  );
}

function Input({
  placeholder,
  type = 'text',
  value,
  onChange,
  icon,
}: {
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="input-wrap">
      {icon}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  );
}

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="logo" onClick={onClick} aria-label="Về trang chủ">
      <img src="/nexus-logo.png" alt="NEXUS — E-commerce & Auction Platform" />
    </button>
  );
}

function Header({ go, query = '' }: { go: (page: Page) => void; query?: string }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  return (
    <>
      <div className="utility">
        <div className="container utility-inner">
          <span>Kết nối mua sắm và đấu giá trực tiếp</span>
          <div>
            <span>Trung tâm hỗ trợ</span>
            <span>·</span>
            <span>Tiếng Việt</span>
          </div>
        </div>
      </div>
      <header className="header">
        <div className="container nav-main">
          <Logo onClick={() => go('home')} />
          <div className="header-search">
            <Search size={19} />
            <input
              key={query}
              defaultValue={query}
              placeholder="Tìm kiếm sản phẩm, thương hiệu..."
              onKeyDown={(e) => e.key === 'Enter' && go('search')}
            />
            <Button onClick={() => go('search')}>Tìm kiếm</Button>
          </div>
          <div className="auth-actions">
            <Button variant="ghost" onClick={() => go('login')}>
              Đăng nhập
            </Button>
            <Button variant="secondary" onClick={() => go('register')}>
              Đăng ký
            </Button>
          </div>
          <button
            className="mobile-menu"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Mở menu"
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>
        <div className={`container subnav ${mobileMenu ? 'subnav-open' : ''}`}>
          <button onClick={() => go('home')}>
            <Grid2X2 size={17} /> Danh mục
          </button>
          <button onClick={() => go('search')}>Mua sắm</button>
          <button onClick={() => go('auction-list')}>
            <span className="live-dot" /> Đấu giá trực tiếp
          </button>
          <button>Sản phẩm mới</button>
          <button>Thương hiệu</button>
          <span className="subnav-spacer" />
          <button>
            <HelpCircle size={17} /> Hướng dẫn
          </button>
        </div>
      </header>
    </>
  );
}

function Footer() {
  return (
    <footer>
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo onClick={() => window.scrollTo(0, 0)} />
          <p>Nền tảng mua sắm và đấu giá trực tiếp, nơi mỗi sản phẩm đều có câu chuyện riêng.</p>
          <div className="socials">
            <span>f</span>
            <span>in</span>
          </div>
        </div>
        <div>
          <strong>Về NEXUS</strong>
          <span>Giới thiệu</span>
          <span>Quy chế hoạt động</span>
          <span>Tuyển dụng</span>
        </div>
        <div>
          <strong>Hỗ trợ</strong>
          <span>Trung tâm trợ giúp</span>
          <span>Hướng dẫn đấu giá</span>
          <span>Liên hệ</span>
        </div>
        <div>
          <strong>Chính sách</strong>
          <span>Bảo mật thông tin</span>
          <span>Điều khoản sử dụng</span>
          <span>Giải quyết tranh chấp</span>
        </div>
      </div>
      <div className="container copyright">
        © 2025 NEXUS. Bản quyền được bảo lưu.{' '}
        <span>Giao diện nguyên mẫu — một số tính năng đang được phát triển.</span>
      </div>
    </footer>
  );
}

function _SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button>
          {action} <ArrowRight size={17} />
        </button>
      )}
    </div>
  );
}

function ProductCard({
  product,
  onClick,
}: {
  product: (typeof products)[number];
  onClick: () => void;
}) {
  const auction = product.type !== 'Mua ngay';
  return (
    <article className="product-card" onClick={onClick}>
      <div className="product-image">
        <img src={product.image} alt={product.title} />
        <span className={`badge ${auction ? 'badge-auction' : ''}`}>
          {auction && product.type === 'Đang đấu giá' && <span className="live-dot" />}
          {product.type}
        </span>
        <button className="heart" aria-label="Thêm vào yêu thích">
          <Heart size={19} />
        </button>
      </div>
      <div className="product-body">
        <span className="product-category">ĐỒNG HỒ CAO CẤP</span>
        <h3>{product.title}</h3>
        {auction && <span className="muted small">Giá hiện tại</span>}
        <strong className="price">{product.price}</strong>
        <div className="product-meta">
          {product.rating ? (
            <span>
              <Star size={15} fill="currentColor" /> {product.rating}
            </span>
          ) : (
            <span className="auction-time">
              <Clock3 size={15} /> {product.meta}
            </span>
          )}
          {product.rating && <span>{product.meta}</span>}
        </div>
      </div>
    </article>
  );
}

const homeProducts = [
  {
    title: 'Bàn phím cơ Stellar Brass CyberDeck 75 CNC',
    price: '16.200.000 ₫',
    old: '24.900.000 ₫',
    image: images.keyboard,
    label: 'HOT',
    seller: 'KeebStudio Hanoi',
    off: '-35%',
  },
  {
    title: 'Set cardigan dệt kim và quần jeans Everyday',
    price: '1.290.000 ₫',
    old: '1.790.000 ₫',
    image: images.fashion,
    label: 'MALL',
    seller: 'Lumière Studio',
    off: '-28%',
  },
  {
    title: 'Bộ phụ kiện bếp phong cách tối giản Nord',
    price: '2.650.000 ₫',
    old: '4.490.000 ₫',
    image: images.home,
    label: 'NHÀ ĐẸP',
    seller: 'Nếp Home',
    off: '-40%',
  },
  {
    title: 'Tai nghe Planar Magnetic Matrix Alpha',
    price: '34.500.000 ₫',
    old: '43.000.000 ₫',
    image: images.headphones,
    label: 'MALL',
    seller: 'Acoustic Matrix VN',
    off: '-20%',
  },
];

type CartEntry = { product: (typeof homeProducts)[number]; quantity: number };

function StoreProductCard({
  product,
  onClick,
  onAdd,
}: {
  product: (typeof homeProducts)[number];
  onClick: () => void;
  onAdd: (product: (typeof homeProducts)[number]) => void;
}) {
  return (
    <article className="store-product" onClick={onClick}>
      <div className="store-product-image">
        <img src={product.image} alt={product.title} />
        <span className="store-label">{product.label}</span>
      </div>
      <div className="store-product-copy">
        <span className="store-seller">
          {product.seller} <i>● Hủy 0%</i>
        </span>
        <h3>{product.title}</h3>
        <span className="store-rating">
          <Star size={12} fill="currentColor" /> 4,9 <small>(240 đã bán)</small>
        </span>
        <strong>{product.price}</strong>
        <span className="store-shipping">
          <Truck size={13} /> Freeship GHN
        </span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onAdd(product);
          }}
        >
          <ShoppingCart size={14} /> Thêm giỏ
        </button>
      </div>
    </article>
  );
}

function HomeHeader({
  go,
  onSearch,
  cartCount = 0,
}: {
  go: (page: Page) => void;
  onSearch: (query: string) => void;
  cartCount?: number;
}) {
  const [keyword, setKeyword] = useState('');
  const trends = [
    'đồng hồ cơ',
    'hublot skeleton',
    'rolex submariner',
    'patek philippe',
    'tourbillon 3D',
  ];
  const submitSearch = () => onSearch(keyword.trim() || 'đồng hồ cơ');
  return (
    <header className="market-header">
      <div className="market-utility">
        <div className="market-container">
          <div>
            <button onClick={() => go('seller')}>Kênh người bán</button>
            <button>Trở thành Seller</button>
            <button>Tải ứng dụng</button>
            <button>Kết nối: ● ◻</button>
          </div>
          <div>
            <button>
              Thông báo <i />
            </button>
            <button>Trợ giúp</button>
            <button>Tiếng Việt⌄</button>
            <button className="utility-account" onClick={() => go('login')}>
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
      <div className="market-container market-main-nav">
        <Logo onClick={() => go('home')} />
        <span className="mall-chip">MALL & BID</span>
        <div className="market-search">
          <button>
            Tất cả sản phẩm <ChevronDown size={14} />
          </button>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm kiếm hơn 50.000+ sản phẩm công nghệ, thời trang, đời sống hoặc phiên đấu giá"
            onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
          />
          <button onClick={submitSearch}>
            <Search size={18} />
          </button>
          <div className="search-trends">
            <span>Xu hướng:</span>
            {trends.map((trend) => (
              <button
                key={trend}
                onClick={() => {
                  setKeyword(trend);
                  onSearch(trend);
                }}
              >
                {trend}
              </button>
            ))}
          </div>
        </div>
        <button className="market-cart" onClick={() => go('cart')}>
          <ShoppingCart size={19} />
          <strong>Giỏ hàng</strong>
          {cartCount > 0 && <i>{cartCount}</i>}
        </button>
        <button className="market-mobile-menu">
          <Menu />
        </button>
      </div>
    </header>
  );
}

function HomeFooter() {
  return (
    <footer className="market-footer">
      <div className="market-container market-footer-grid">
        <div>
          <Logo onClick={() => window.scrollTo(0, 0)} />
          <p>
            Sàn thương mại điện tử kết hợp phòng đấu giá 3D trực tiếp. Mua sắm tiện lợi, an tâm
            tuyệt đối.
          </p>
          <small>
            Hotline: 1900 8822 (8:00 – 22:00)
            <br />
            Email: cskh@nexus.market.vn
          </small>
        </div>
        <div>
          <strong>CHĂM SÓC KHÁCH HÀNG</strong>
          <span>Trung tâm trợ giúp</span>
          <span>Hướng dẫn mua hàng</span>
          <span>Quy trình đấu giá 3D</span>
          <span>Chính sách hoàn tiền</span>
        </div>
        <div>
          <strong>DÀNH CHO NGƯỜI BÁN</strong>
          <span>Mở cửa hàng</span>
          <span>Quy định đăng tải mô hình 3D</span>
          <span>Biểu phí sàn</span>
          <span>Cổng API kết nối tự động</span>
        </div>
        <div>
          <strong>ĐỐI TÁC THANH TOÁN & VẬN CHUYỂN</strong>
          <div className="partner-tags">
            <b>PayOS Napas</b>
            <b>Stripe Visa/Master</b>
            <b>GHN Logistics</b>
          </div>
          <p>Đồng bộ tra cứu mã vận đơn ngay trên đơn hàng.</p>
        </div>
        <div>
          <strong>CHỨNG NHẬN & BẢO MẬT</strong>
          <span>
            <LockKeyhole size={14} /> PCI-DSS Level 1 & TLS 1.3
          </span>
          <span>
            <ShieldCheck size={14} /> Đã đăng ký Bộ Công Thương
          </span>
        </div>
      </div>
      <div className="market-container market-copyright">
        <span>© 2025 NEXUS E-Commerce & 3D Auction Inc.</span>
        <span>Điều khoản sử dụng　 Chính sách bảo mật</span>
      </div>
    </footer>
  );
}

function Home({
  go,
  onSearch,
  onAddToCart,
  cartCount,
}: {
  go: (page: Page) => void;
  onSearch: (query: string) => void;
  onAddToCart: (product: (typeof homeProducts)[number]) => void;
  cartCount: number;
}) {
  const [flashDeadline] = useState(() => Date.now() + (2 * 60 * 60 + 45 * 60 + 17) * 1000);
  const [flashTime, setFlashTime] = useState({ hours: 2, minutes: 45, seconds: 17 });
  const [auctionDeadline] = useState(() => Date.now() + (4 * 60 + 31) * 1000);
  const [auctionTime, setAuctionTime] = useState({ hours: 0, minutes: 4, seconds: 31 });
  const flashInventory = [
    { sold: 18, total: 40 },
    { sold: 30, total: 40 },
    { sold: 32, total: 40 },
    { sold: 36, total: 40 },
  ];
  const categories = [
    [Laptop, 'Thiết bị điện tử', '2.4k+ sản phẩm'],
    [Shirt, 'Thời trang Techwear', '850+ sản phẩm'],
    [Gamepad2, 'Bàn phím cơ & Gear', '1.1k+ sản phẩm'],
    [Palette, 'Cổ vật & Tác phẩm', '320+ lô đấu giá'],
    [Watch, 'Đồng hồ & Trang sức', '640+ sản phẩm'],
    [Package, 'Nhà cửa & Đời sống', '1.8k+ sản phẩm'],
  ] as const;
  const benefits = [
    [Truck, 'Freeship đơn đầu'],
    [Zap, 'Flash Sale giá vàng'],
    [Box, 'Đấu giá 3D trực tiếp'],
    [ShieldCheck, 'Chính hãng Mall'],
    [Tag, 'Khách hàng thân thiết'],
    [RotateCcw, 'Hoàn tiền PayOS'],
  ] as const;
  const heroSlides = [
    {
      tag: 'ĐANG DIỄN RA · ƯU ĐÃI LỚN NHẤT HÔM NAY',
      title: (
        <>
          NEXUS Super Day — săn deal <em>giảm đến 50%</em>
        </>
      ),
      description:
        'Hàng nghìn ưu đãi từ gian hàng Mall, miễn phí vận chuyển và voucher thanh toán giới hạn.',
      time: 'Kết thúc lúc 23:59 hôm nay',
      image: images.keyboardRgb,
    },
    {
      tag: 'SẮP DIỄN RA · NEXUS STYLE NIGHT',
      title: (
        <>
          Đêm hội thời trang — deal mới <em>đồng loạt lên sóng</em>
        </>
      ),
      description:
        'Bộ sưu tập thời trang, phụ kiện và phong cách sống từ những thương hiệu được yêu thích.',
      time: 'Bắt đầu lúc 20:00 tối nay',
      image: images.clothes,
    },
    {
      tag: 'SỰ KIỆN SIÊU HOT SẮP TỚI',
      title: (
        <>
          Live Auction 3D — phiên đặc biệt <em>đồng hồ cao cấp</em>
        </>
      ),
      description:
        'Xem trước bộ sưu tập, theo dõi phiên và chuẩn bị tham gia đặt giá trực tiếp trên NEXUS.',
      time: 'Mở phòng chờ lúc 21:30 tối nay',
      image: images.hero,
    },
  ];
  useEffect(() => {
    const updateCountdown = () => {
      const flashRemaining = Math.max(0, flashDeadline - Date.now());
      const totalSeconds = Math.floor(flashRemaining / 1000);
      setFlashTime({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
      const auctionRemaining = Math.max(0, auctionDeadline - Date.now());
      const auctionSeconds = Math.floor(auctionRemaining / 1000);
      setAuctionTime({
        hours: Math.floor(auctionSeconds / 3600),
        minutes: Math.floor((auctionSeconds % 3600) / 60),
        seconds: auctionSeconds % 60,
      });
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [auctionDeadline, flashDeadline]);
  const twoDigits = (value: number) => String(value).padStart(2, '0');
  return (
    <>
      <HomeHeader go={go} onSearch={onSearch} cartCount={cartCount} />
      <main className="market-home">
        <section className="market-container market-hero-grid">
          <div className="market-hero">
            <div className="market-hero-track">
              {[...heroSlides, heroSlides[0]].map((slide, index) => (
                <div className="market-hero-slide" key={`${slide.tag}-${index}`}>
                  <div className="market-hero-copy">
                    <span>
                      <Tag size={13} /> {slide.tag}
                    </span>
                    <h1>{slide.title}</h1>
                    <p>{slide.description}</p>
                    <strong className="market-event-time">
                      <Clock3 size={15} /> {slide.time}
                    </strong>
                    <div className="market-hero-actions">
                      <Button onClick={() => go('search')}>
                        <ShoppingBag size={16} /> Khám phá chương trình
                      </Button>
                      <Button variant="secondary" onClick={() => go('auction')}>
                        <Box size={16} /> Xem sự kiện hot
                      </Button>
                    </div>
                  </div>
                  <img src={slide.image} alt={slide.tag} />
                </div>
              ))}
            </div>
            <div className="market-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="market-promos">
            <article>
              <img src={images.delivery} alt="Chương trình miễn phí vận chuyển GHN" />
              <div className="promo-overlay">
                <span>MIỄN PHÍ VẬN CHUYỂN</span>
                <strong>Voucher GHN 0 ₫</strong>
                <p>Áp dụng cho đơn từ 300.000 ₫ · đến 23:59 hôm nay</p>
                <button onClick={() => go('search')}>Lấy mã ngay →</button>
              </div>
            </article>
            <article>
              <img src={images.payment} alt="Ưu đãi thanh toán PayOS" />
              <div className="promo-overlay">
                <span>ƯU ĐÃI THANH TOÁN PAYOS</span>
                <strong>Hoàn 5% khi thanh toán</strong>
                <p>Tối đa 200.000 ₫ · tự động áp dụng trong hôm nay</p>
                <button onClick={() => go('search')}>Xem điều kiện →</button>
              </div>
            </article>
          </div>
        </section>

        <section className="market-container benefit-strip">
          {benefits.map(([Icon, label], index) => (
            <button
              key={label}
              onClick={() => go(index === 2 ? 'auction-list' : index === 1 ? 'search' : 'home')}
            >
              <i className={`benefit-${index}`}>
                <Icon />
              </i>
              <strong>{label}</strong>
              <span>{index === 1 ? 'Giảm đến 50%' : 'Khám phá ngay'}</span>
            </button>
          ))}
        </section>

        <section className="market-container market-panel category-panel">
          <div className="market-section-title">
            <h2>
              <Grid2X2 /> DANH MỤC SẢN PHẨM
            </h2>
            <button onClick={() => go('search')}>Xem tất cả danh mục →</button>
          </div>
          <div className="market-categories">
            {categories.map(([Icon, label, count], index) => (
              <button key={label} onClick={() => go('search')}>
                <i className={`category-color-${index}`}>
                  <Icon />
                </i>
                <strong>{label}</strong>
                <small>{count}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="market-container market-panel flash-panel">
          <div className="market-section-title">
            <h2 className="flash-title" aria-live="polite">
              <Zap fill="currentColor" /> FLASH SALE <span>{twoDigits(flashTime.hours)}</span>:
              <span>{twoDigits(flashTime.minutes)}</span>:
              <span>{twoDigits(flashTime.seconds)}</span>
            </h2>
            <button onClick={() => go('search')}>Xem tất cả khuyến mãi →</button>
          </div>
          <div className="flash-grid">
            {homeProducts.map((product, index) => {
              const inventory = flashInventory[index];
              const progress = Math.min(100, Math.round((inventory.sold / inventory.total) * 100));
              return (
                <article key={product.title} onClick={() => go('search')}>
                  <div>
                    <img src={product.image} alt={product.title} />
                    <b>{product.off}</b>
                  </div>
                  <h3>{product.title}</h3>
                  <p>
                    <strong>{product.price}</strong>
                    <del>{product.old}</del>
                  </p>
                  <div>
                    <i style={{ width: `${progress}%` }} />
                    <span>
                      ĐÃ BÁN {inventory.sold}/{inventory.total}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="market-container live-auction-panel">
          <div className="live-heading">
            <div>
              <span>● TÍNH NĂNG ĐỘC QUYỀN</span>
              <h2>NEXUS LIVE AUCTION – Phòng đấu giá 3D trực tiếp</h2>
              <p>
                Mô phỏng góc xoay 360°, phiên đấu giá thời gian thực và tự động gia hạn khi có giá
                hợp lệ cuối phiên.
              </p>
            </div>
            <strong>
              <i /> 1.420 người đang xem
            </strong>
          </div>
          <div className="live-feature">
            <div className="live-stage">
              <img src={images.hero} alt="Mô hình đồng hồ 3D trong phòng đấu giá" />
              <span>
                <Radio size={13} /> LIVE ADMIN
              </span>
              <b>MÔ HÌNH 3D 360°</b>
              <div>
                Góc máy: Hero Perspective 45° <button>Xoay 3D</button>
              </div>
            </div>
            <div className="live-detail">
              <div className="lot-line">
                <span>Lô đặc biệt #NX-8802</span>
                <b>Seller KYC: 4.9 ★</b>
              </div>
              <h3>Omega Seamaster Aqua Terra 3D Limited</h3>
              <p>
                Phiên đấu giá trực tiếp với hình ảnh đa góc và thông tin sản phẩm được người bán
                cung cấp.
              </p>
              <div className="live-pricing">
                <div>
                  <span>GIÁ HIỆN TẠI</span>
                  <strong>128.500.000 ₫</strong>
                  <small>Tiền cọc: không áp dụng cố định</small>
                </div>
                <div>
                  <span>ĐẾM NGƯỢC KẾT THÚC</span>
                  <strong aria-live="polite">
                    {twoDigits(auctionTime.hours)} : {twoDigits(auctionTime.minutes)} :{' '}
                    {twoDigits(auctionTime.seconds)}
                  </strong>
                  <small>+5 phút khi có giá hợp lệ cuối phiên</small>
                </div>
              </div>
              <Button onClick={() => go('auction')}>Đặt giá (+1.500.000đ)</Button>
            </div>
          </div>
          <div className="auction-mini-grid">
            {[products[3], products[0], products[1]].map((product, index) => (
              <article key={product.title} onClick={() => go('auction')}>
                <div>
                  <img src={product.image} alt={product.title} />
                  <span>3D MODEL</span>
                  <b>00:{['08:41', '19:22', '32:05'][index]}</b>
                </div>
                <h3>{product.title}</h3>
                <p>
                  <strong>{product.price}</strong>
                  <span>{28 + index * 8} lượt bid</span>
                </p>
                <button>Vào xem & đặt giá</button>
              </article>
            ))}
          </div>
        </section>

        <section className="market-container recommendation">
          <div className="market-section-title">
            <h2>
              <Heart /> GỢI Ý HÔM NAY
            </h2>
          </div>
          <div className="store-grid">
            {[
              ...homeProducts,
              {
                ...homeProducts[0],
                title: 'Bình hoa gốm thủ công màu kem Atelier',
                image: images.decor,
                label: 'THỦ CÔNG',
                price: '1.850.000 ₫',
              },
              {
                ...homeProducts[3],
                title: 'Đồng hồ Chronograph Skeleton Titanium',
                image: images.watch2,
                price: '115.000.000 ₫',
              },
            ].map((product, index) => (
              <StoreProductCard
                key={`${product.title}-${index}`}
                product={product}
                onClick={() => go('search')}
                onAdd={onAddToCart}
              />
            ))}
          </div>
          <Button variant="secondary" className="load-more" onClick={() => go('search')}>
            Xem thêm 2.400+ sản phẩm khác <ChevronDown size={15} />
          </Button>
        </section>

        <section className="market-container trust-strip">
          <div>
            <i>
              <Truck />
            </i>
            <p>
              <strong>Vận chuyển GHN tự động</strong>
              <span>Đồng kiểm khi nhận, tự động tính cước nội tỉnh và liên tỉnh.</span>
            </p>
          </div>
          <div>
            <i>
              <ShieldCheck />
            </i>
            <p>
              <strong>Thanh toán ký quỹ kép</strong>
              <span>Hỗ trợ QR PayOS, thẻ và ví điện tử.</span>
            </p>
          </div>
          <div>
            <i>
              <Star />
            </i>
            <p>
              <strong>Xếp hạng uy tín Seller</strong>
              <span>Đánh giá minh bạch sau mỗi giao dịch.</span>
            </p>
          </div>
          <div>
            <i>
              <RotateCcw />
            </i>
            <p>
              <strong>Đấu giá Atomic Queue</strong>
              <span>Không xung đột giá, tự động hoàn cọc.</span>
            </p>
          </div>
        </section>
      </main>
      <HomeFooter />
    </>
  );
}

function CartPage({
  go,
  onSearch,
  cart,
  onAdd,
  onQuantity,
  onRemove,
}: {
  go: (page: Page) => void;
  onSearch: (query: string) => void;
  cart: CartEntry[];
  onAdd: (product: (typeof homeProducts)[number]) => void;
  onQuantity: (title: string, change: number) => void;
  onRemove: (title: string) => void;
}) {
  const parseVnd = (price: string) => Number(price.replace(/[^\d]/g, ''));
  const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
  const subtotal = cart.reduce(
    (sum, item) => sum + parseVnd(item.product.price) * item.quantity,
    0,
  );
  const shipping = subtotal >= 300000 ? 0 : 30000;
  const discount = subtotal >= 15000000 ? 500000 : 0;
  const total = Math.max(0, subtotal + shipping - discount);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <>
      <HomeHeader go={go} onSearch={onSearch} cartCount={count} />
      <main className="cart-page">
        <div className="market-container cart-breadcrumbs">
          <button onClick={() => go('home')}>Trang chủ</button>
          <span>/</span>
          <strong>Giỏ hàng</strong>
        </div>
        <section className="market-container cart-heading">
          <div>
            <span>GIỎ HÀNG NEXUS</span>
            <h1>Giỏ hàng của bạn</h1>
            <p>
              {count > 0
                ? `${count} sản phẩm đang chờ thanh toán`
                : 'Chưa có sản phẩm trong giỏ hàng'}
            </p>
          </div>
          <button onClick={() => go('home')}>
            <ArrowLeft /> Tiếp tục mua sắm
          </button>
        </section>

        {cart.length === 0 ? (
          <section className="market-container cart-empty">
            <span>
              <ShoppingCart />
            </span>
            <h2>Giỏ hàng đang trống</h2>
            <p>
              Khám phá sản phẩm từ các gian hàng NEXUS Mall và thêm vào giỏ để bắt đầu đơn hàng.
            </p>
            <Button onClick={() => go('home')}>
              Khám phá sản phẩm <ArrowRight />
            </Button>
          </section>
        ) : (
          <section className="market-container cart-layout">
            <div className="cart-items">
              <div className="cart-select-row">
                <label>
                  <input type="checkbox" defaultChecked /> Chọn tất cả ({count})
                </label>
                <button onClick={() => cart.forEach((item) => onRemove(item.product.title))}>
                  Xóa đã chọn
                </button>
              </div>
              <article className="cart-shop">
                <div className="cart-shop-head">
                  <label>
                    <input type="checkbox" defaultChecked />
                    <span>NEXUS MALL</span>
                    <strong>NEXUS Official Selection</strong>
                    <CheckCircle2 />
                  </label>
                  <button>Chat với shop</button>
                </div>
                {cart.map(({ product, quantity }) => (
                  <div className="cart-item" key={product.title}>
                    <input type="checkbox" defaultChecked />
                    <img src={product.image} alt={product.title} />
                    <div className="cart-item-info">
                      <span>{product.label}</span>
                      <h2>{product.title}</h2>
                      <p>{product.seller}</p>
                      <small>
                        <ShieldCheck /> Đổi trả 15 ngày · Bảo chứng giao dịch
                      </small>
                    </div>
                    <div className="cart-unit-price">
                      <strong>{product.price}</strong>
                      <del>{product.old}</del>
                    </div>
                    <div className="cart-quantity">
                      <button onClick={() => onQuantity(product.title, -1)}>
                        <Minus />
                      </button>
                      <span>{quantity}</span>
                      <button onClick={() => onQuantity(product.title, 1)}>
                        <Plus />
                      </button>
                    </div>
                    <div className="cart-subtotal">
                      <strong>{formatVnd(parseVnd(product.price) * quantity)}</strong>
                      <span>Thành tiền</span>
                    </div>
                    <button
                      className="cart-remove"
                      onClick={() => onRemove(product.title)}
                      aria-label={`Xóa ${product.title}`}
                    >
                      <X />
                    </button>
                  </div>
                ))}
                {discount > 0 && (
                  <div className="cart-shop-voucher">
                    <Tag /> Đã tự động áp dụng voucher đơn từ 15 triệu{' '}
                    <strong>−{formatVnd(discount)}</strong>
                  </div>
                )}
              </article>
            </div>

            <aside className="cart-summary-column">
              <article className="cart-voucher-card">
                <div>
                  <h2>Mã giảm giá NEXUS</h2>
                  <button>Kho voucher</button>
                </div>
                <label>
                  <Tag />
                  <input defaultValue="VIPCOLLECTOR" />
                  <button>Áp dụng</button>
                </label>
                <div>
                  <span>
                    <Truck /> GHN Express Freeship
                  </span>
                  <CheckCircle2 />
                </div>
                <div>
                  <span>
                    <Wallet /> Thanh toán PayOS / Stripe
                  </span>
                  <CheckCircle2 />
                </div>
              </article>
              <article className="cart-summary">
                <h2>Tóm tắt đơn hàng</h2>
                <div>
                  <span>Tạm tính ({count} sản phẩm)</span>
                  <strong>{formatVnd(subtotal)}</strong>
                </div>
                <div>
                  <span>Phí vận chuyển</span>
                  <strong className="free">
                    {shipping === 0 ? 'Miễn phí' : formatVnd(shipping)}
                  </strong>
                </div>
                <div>
                  <span>Voucher NEXUS</span>
                  <strong className="discount">−{formatVnd(discount)}</strong>
                </div>
                <div className="cart-total">
                  <span>Tổng thanh toán</span>
                  <strong>{formatVnd(total)}</strong>
                </div>
                <Button className="full">
                  Mua hàng ({count}) <ArrowRight />
                </Button>
                <small>
                  <LockKeyhole /> Thanh toán được bảo vệ qua PayOS Escrow
                </small>
              </article>
              <article className="cart-trust-card">
                <h2>Bảo chứng giao dịch NEXUS Trust</h2>
                <p>
                  <ShieldCheck /> Tiền được giữ an toàn trong quá trình giao dịch.
                </p>
                <p>
                  <PackageCheck /> Đồng kiểm sản phẩm trước khi nhận.
                </p>
                <p>
                  <RotateCcw /> Hỗ trợ giải quyết khi sản phẩm không đúng mô tả.
                </p>
              </article>
            </aside>
          </section>
        )}

        <section className="market-container cart-recommendations">
          <div className="market-section-title">
            <h2>
              <Heart /> Có thể bạn quan tâm
            </h2>
            <button onClick={() => go('search')}>Xem tất cả sản phẩm →</button>
          </div>
          <div className="store-grid">
            {homeProducts.map((product) => (
              <StoreProductCard
                key={product.title}
                product={product}
                onClick={() => go('search')}
                onAdd={onAdd}
              />
            ))}
          </div>
        </section>
      </main>
      <HomeFooter />
    </>
  );
}

function Filters() {
  return (
    <div className="filters">
      <div className="filter-title">
        <strong>Bộ lọc</strong>
        <button>Xóa tất cả</button>
      </div>
      <div className="filter-group">
        <strong>Hình thức giao dịch</strong>
        {['Mua ngay', 'Đấu giá trực tiếp', 'Sắp đấu giá'].map((item, index) => (
          <label key={item}>
            <input type="checkbox" defaultChecked={index < 2} />
            <span>{item}</span>
            <small>{[24, 8, 6][index]}</small>
          </label>
        ))}
      </div>
      <div className="filter-group">
        <strong>Khoảng giá</strong>
        <div className="price-inputs">
          <span>20 triệu</span>
          <Minus size={14} />
          <span>200 triệu</span>
        </div>
        <div className="range">
          <i />
          <b />
          <b />
        </div>
      </div>
      <div className="filter-group">
        <strong>Thương hiệu</strong>
        {['Omega', 'Longines', 'Cartier', 'Grand Seiko'].map((item, index) => (
          <label key={item}>
            <input type="checkbox" defaultChecked={index === 0} />
            <span>{item}</span>
            <small>{[12, 8, 5, 4][index]}</small>
          </label>
        ))}
      </div>
      <div className="filter-group">
        <strong>Tình trạng</strong>
        {['Mới', 'Đã qua sử dụng'].map((item) => (
          <label key={item}>
            <input type="checkbox" />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SearchPage({ go, query }: { go: (page: Page) => void; query: string }) {
  const [drawer, setDrawer] = useState(false);
  const [preview, setPreview] = useState(false);
  return (
    <>
      <Header go={go} query={query} />
      <main className="search-page">
        <div className="container breadcrumbs">
          <button onClick={() => go('home')}>Trang chủ</button>
          <span>/</span>
          <span>Kết quả tìm kiếm</span>
        </div>
        <div className="container search-heading">
          <div>
            <h1>Kết quả cho “{query}”</h1>
            <p>Tìm thấy 38 sản phẩm phù hợp</p>
          </div>
          <Button variant="secondary" className="mobile-filter" onClick={() => setDrawer(true)}>
            <Filter size={18} /> Bộ lọc
          </Button>
        </div>
        <div className="container search-layout">
          <aside>
            <Filters />
          </aside>
          <section className="results">
            <div className="results-toolbar">
              <div className="chips">
                <span>
                  Omega <X size={14} />
                </span>
                <span>
                  Đấu giá <X size={14} />
                </span>
                <button>Xóa bộ lọc</button>
              </div>
              <div className="sort">
                <span>Sắp xếp:</span>
                <button>
                  Mới nhất <ChevronDown size={16} />
                </button>
                <button className="view-active">
                  <Grid2X2 size={18} />
                </button>
                <button>
                  <List size={18} />
                </button>
              </div>
            </div>
            <div className="product-grid search-products">
              {[...products, ...products.slice(0, 2)].map((product, index) => (
                <ProductCard
                  key={`${product.title}-${index}`}
                  product={product}
                  onClick={() => (product.type === 'Mua ngay' ? setPreview(true) : go('auction'))}
                />
              ))}
            </div>
            <div className="pagination">
              <button>
                <ArrowLeft size={17} />
              </button>
              <button className="active">1</button>
              <button>2</button>
              <button>3</button>
              <span>…</span>
              <button>7</button>
              <button>
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        </div>
      </main>
      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <strong>Lọc sản phẩm</strong>
              <button onClick={() => setDrawer(false)}>
                <X />
              </button>
            </div>
            <Filters />
            <div className="drawer-action">
              <Button onClick={() => setDrawer(false)}>Xem 38 kết quả</Button>
            </div>
          </div>
        </div>
      )}
      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreview(false)}>
              <X />
            </button>
            <img src={images.watch1} alt="Longines Master Collection" />
            <div>
              <span className="eyebrow">XEM NHANH SẢN PHẨM</span>
              <h2>Longines Master Collection Moonphase</h2>
              <div className="rating">
                <Star size={16} fill="currentColor" /> 4,9 <span>· 12 đánh giá</span>
              </div>
              <strong className="preview-price">68.500.000 ₫</strong>
              <p>Đồng hồ cơ với lịch tuần trăng, dây da nâu và mặt số bạc thanh lịch.</p>
              <div className="preview-actions">
                <Button>Thêm vào giỏ hàng</Button>
                <Button variant="secondary">Xem chi tiết</Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}

function AuctionListPage({
  go,
  onSearch,
  cartCount,
}: {
  go: (page: Page) => void;
  onSearch: (query: string) => void;
  cartCount: number;
}) {
  const [remaining, setRemaining] = useState(3718);
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const countdown = (offset: number) => {
    const seconds = Math.max(0, remaining + offset);
    return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  const lots = [
    {
      title: 'Omega Seamaster Aqua Terra 150M 41mm',
      brand: 'OMEGA · SWISS MADE',
      image: images.watch2,
      price: '128.500.000 ₫',
      status: 'LIVE',
      time: countdown(0),
      bids: '42 lượt giá',
    },
    {
      title: 'Longines Master Collection Moonphase',
      brand: 'LONGINES · SAINT-IMIER',
      image: images.watch1,
      price: '68.500.000 ₫',
      status: 'LIVE',
      time: countdown(840),
      bids: '28 lượt giá',
    },
    {
      title: 'Grand Seiko Heritage Spring Drive',
      brand: 'GRAND SEIKO · JAPAN',
      image: images.watch3,
      price: '112.000.000 ₫',
      status: 'SẮP DIỄN RA',
      time: '20:00 hôm nay',
      bids: '16 người theo dõi',
    },
    {
      title: 'Cartier Santos Medium Automatic',
      brand: 'CARTIER · PARIS',
      image: images.watch4,
      price: '92.000.000 ₫',
      status: 'SẮP DIỄN RA',
      time: '21:30 hôm nay',
      bids: '24 người theo dõi',
    },
    {
      title: 'Audemars Piguet Royal Oak Chronograph',
      brand: 'AUDEMARS PIGUET · LE BRASSUS',
      image: images.hero,
      price: '245.000.000 ₫',
      status: 'LIVE',
      time: countdown(1500),
      bids: '68 lượt giá',
    },
    {
      title: 'Patek Philippe Nautilus Blue Dial',
      brand: 'PATEK PHILIPPE · GENEVA',
      image: images.watch1,
      price: '192.000.000 ₫',
      status: 'LIVE',
      time: countdown(2340),
      bids: '35 lượt giá',
    },
    {
      title: 'Hublot Big Bang Skeleton Titanium',
      brand: 'HUBLOT · NYON',
      image: images.watch2,
      price: '88.500.000 ₫',
      status: 'SẮP DIỄN RA',
      time: '09:00 ngày mai',
      bids: '31 người theo dõi',
    },
    {
      title: 'Vacheron Constantin Overseas Blue Dial',
      brand: 'VACHERON CONSTANTIN',
      image: images.watch4,
      price: '135.000.000 ₫',
      status: 'SẮP DIỄN RA',
      time: '15:00 ngày mai',
      bids: '19 người theo dõi',
    },
  ];
  return (
    <>
      <HomeHeader go={go} onSearch={onSearch} cartCount={cartCount} />
      <main className="auction-list-page">
        <section className="auction-list-hero">
          <div className="market-container">
            <div>
              <span>
                <Radio /> PHÒNG ĐẤU GIÁ ĐANG MỞ
              </span>
              <h1>Đấu giá 3D trực tiếp</h1>
              <p>
                Theo dõi các phiên đang diễn ra, xem thông tin sản phẩm và tham gia đặt giá theo dữ
                liệu được máy chủ xác nhận.
              </p>
              <div>
                <strong>
                  <i /> 4 phiên đang Live
                </strong>
                <strong>8 phiên sắp diễn ra hôm nay</strong>
                <strong>Máy chủ ổn định 99,98%</strong>
              </div>
            </div>
            <div className="auction-live-preview">
              <img src={images.watch2} alt="Omega Seamaster Aqua Terra" />
              <span>LIVE · PHIÊN #NX-240624</span>
              <div>
                <p>
                  Giá cao nhất hiện tại<strong>128.500.000 ₫</strong>
                </p>
                <p>
                  Kết thúc sau<strong>{countdown(0)}</strong>
                </p>
              </div>
              <Button onClick={() => go('auction')}>
                Xem phiên đấu giá <ArrowRight />
              </Button>
            </div>
          </div>
        </section>
        <div className="market-container auction-list-breadcrumbs">
          <button onClick={() => go('home')}>Trang chủ</button>
          <span>/</span>
          <strong>Đấu giá 3D trực tiếp</strong>
        </div>
        <section className="market-container auction-list-toolbar">
          <div>
            <button className="active">
              <span className="live-dot" /> Đang diễn ra (4)
            </button>
            <button>Sắp diễn ra (8)</button>
            <button>Đã kết thúc</button>
          </div>
          <div>
            <button>
              <SlidersHorizontal /> Bộ lọc
            </button>
            <button>
              Sắp xếp: Kết thúc sớm <ChevronDown />
            </button>
            <button className="active">
              <Grid2X2 />
            </button>
            <button>
              <List />
            </button>
          </div>
        </section>
        <section className="market-container auction-catalog">
          <aside className="auction-filters">
            <div>
              <h2>Bộ lọc phiên đấu giá</h2>
              <button>Xóa tất cả</button>
            </div>
            <section>
              <strong>Trạng thái phiên</strong>
              <label>
                <input type="checkbox" defaultChecked /> Đang diễn ra <span>4</span>
              </label>
              <label>
                <input type="checkbox" defaultChecked /> Sắp diễn ra <span>8</span>
              </label>
            </section>
            <section>
              <strong>Danh mục</strong>
              {['Đồng hồ cao cấp', 'Nghệ thuật', 'Đồ sưu tầm', 'Công nghệ', 'Thời trang'].map(
                (item, index) => (
                  <label key={item}>
                    <input type="checkbox" defaultChecked={index === 0} /> {item}
                    <span>{[12, 5, 9, 7, 4][index]}</span>
                  </label>
                ),
              )}
            </section>
            <section>
              <strong>Khoảng giá hiện tại</strong>
              <div className="auction-price-fields">
                <span>5.000.000 ₫</span>
                <span>500.000.000 ₫</span>
              </div>
              <button className="auction-apply-filter">Áp dụng khoảng giá</button>
            </section>
            <section>
              <strong>Thời gian kết thúc</strong>
              <label>
                <input type="radio" name="ending" defaultChecked /> Trong 1 giờ
              </label>
              <label>
                <input type="radio" name="ending" /> Hôm nay
              </label>
              <label>
                <input type="radio" name="ending" /> 7 ngày tới
              </label>
            </section>
          </aside>
          <div className="auction-results">
            <div className="auction-results-heading">
              <div>
                <h2>Các phiên đấu giá nổi bật</h2>
                <p>Hiển thị 8 trong 24 phiên phù hợp</p>
              </div>
              <span>
                <ShieldCheck /> Countdown và giá đặt được máy chủ xác nhận
              </span>
            </div>
            <div className="auction-lot-grid">
              {lots.map((lot) => (
                <article key={lot.title} onClick={() => go('auction')}>
                  <div className="auction-lot-image">
                    <img src={lot.image} alt={lot.title} />
                    <span className={lot.status === 'LIVE' ? 'live' : 'upcoming'}>
                      {lot.status === 'LIVE' && <i />} {lot.status}
                    </span>
                    <button aria-label="Theo dõi phiên">
                      <Heart />
                    </button>
                    <small>
                      <Box /> Có chế độ xem 3D
                    </small>
                  </div>
                  <div className="auction-lot-copy">
                    <span>{lot.brand}</span>
                    <h3>{lot.title}</h3>
                    <div className="auction-lot-price">
                      <p>
                        {lot.status === 'LIVE' ? 'Giá hiện tại' : 'Giá khởi điểm'}
                        <strong>{lot.price}</strong>
                      </p>
                      <p>
                        {lot.status === 'LIVE' ? 'Còn lại' : 'Bắt đầu'}
                        <strong className={lot.status === 'LIVE' ? 'counting' : ''}>
                          {lot.time}
                        </strong>
                      </p>
                    </div>
                    <div className="auction-lot-meta">
                      <span>
                        <Gavel /> {lot.bids}
                      </span>
                      <span>
                        <ShieldCheck /> Escrow
                      </span>
                    </div>
                    <Button
                      className="full"
                      variant={lot.status === 'LIVE' ? 'primary' : 'secondary'}
                    >
                      {lot.status === 'LIVE' ? 'Tham gia đặt giá' : 'Xem trước phiên'}{' '}
                      <ArrowRight />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            <div className="pagination">
              <button>
                <ArrowLeft />
              </button>
              <button className="active">1</button>
              <button>2</button>
              <button>3</button>
              <button>
                <ArrowRight />
              </button>
            </div>
          </div>
        </section>
      </main>
      <HomeFooter />
    </>
  );
}

function AuctionPage({ go }: { go: (page: Page) => void }) {
  const [bid, setBid] = useState('130.000.000');
  const [confirm, setConfirm] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [auctionDeadline] = useState(() => Date.now() + (60 * 60 + 24 * 60 + 18) * 1000);
  const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 24, seconds: 18 });
  useEffect(() => {
    const update = () => {
      const seconds = Math.max(0, Math.floor((auctionDeadline - Date.now()) / 1000));
      setTimeLeft({
        hours: Math.floor(seconds / 3600),
        minutes: Math.floor((seconds % 3600) / 60),
        seconds: seconds % 60,
      });
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [auctionDeadline]);
  const formatTime = (value: number) => String(value).padStart(2, '0');
  return (
    <>
      <Header go={go} />
      <main className="auction-page">
        <div className="container breadcrumbs">
          <button onClick={() => go('home')}>Trang chủ</button>
          <span>/</span>
          <button onClick={() => go('search')}>Đồng hồ</button>
          <span>/</span>
          <span>Phiên #NX-240624</span>
        </div>
        <div className="container auction-grid">
          <section className="gallery">
            <div className="main-image">
              <img src={images.watch2} alt="Omega Seamaster Aqua Terra 41mm" />
              <div className="view-toggle">
                <button className="active">
                  <Eye size={17} /> Ảnh
                </button>
                <button>
                  <Box size={17} /> Xem 3D
                </button>
              </div>
              <button className="zoom">
                <Plus />
              </button>
            </div>
            <div className="thumbs">
              {[images.watch2, images.watch1, images.watch3, images.watch4].map((image, index) => (
                <button className={index === 0 ? 'active' : ''} key={image}>
                  <img src={image} alt={`Góc chụp ${index + 1}`} />
                </button>
              ))}
            </div>
          </section>
          <section className="auction-info">
            <div className="auction-topline">
              <span className="badge badge-auction">
                <span className="live-dot" /> Đang diễn ra
              </span>
              <span>Mã phiên #NX-240624</span>
            </div>
            <h1>Omega Seamaster Aqua Terra 150M 41mm</h1>
            <div className="seller">
              <span className="avatar">AM</span>
              <div>
                <strong>Atelier Minh</strong>
                <span>
                  <Star size={14} fill="currentColor" /> 4,9 · 42 đánh giá
                </span>
              </div>
              <CheckCircle2 size={18} />
            </div>
            {accepted && (
              <div className="success-alert">
                <CheckCircle2 />
                <div>
                  <strong>Giá đặt đã được chấp nhận</strong>
                  <span>Bạn đang là người trả giá cao nhất.</span>
                </div>
              </div>
            )}
            <div className="bid-summary">
              <div>
                <span>Giá cao nhất hiện tại</span>
                <strong>128.500.000 ₫</strong>
                <small>12 lượt đặt giá</small>
              </div>
              <div className="countdown">
                <span>Kết thúc sau</span>
                <strong aria-live="polite">
                  <b>{formatTime(timeLeft.hours)}</b>:<b>{formatTime(timeLeft.minutes)}</b>:
                  <b>{formatTime(timeLeft.seconds)}</b>
                </strong>
                <small>Hôm nay, 21:30</small>
              </div>
            </div>
            <div className="bid-box">
              <div className="bid-label">
                <span>Giá của bạn</span>
                <small>Tối thiểu 130.000.000 ₫</small>
              </div>
              <div className="bid-input">
                <input value={bid} onChange={(e) => setBid(e.target.value)} />
                <span>₫</span>
              </div>
              <div className="increments">
                <button onClick={() => setBid('130.000.000')}>+1,5 triệu</button>
                <button onClick={() => setBid('133.000.000')}>+4,5 triệu</button>
                <button onClick={() => setBid('138.000.000')}>+9,5 triệu</button>
              </div>
              <Button className="full" onClick={() => setConfirm(true)}>
                <Zap size={18} fill="currentColor" /> Đặt giá ngay
              </Button>
              <p>
                <LockKeyhole size={15} /> Giá đặt chỉ được ghi nhận sau khi máy chủ xác nhận.
              </p>
            </div>
            <div className="auction-actions">
              <Button variant="secondary">
                <Heart size={18} /> Theo dõi
              </Button>
              <Button variant="secondary">
                <Share2 size={18} /> Chia sẻ
              </Button>
            </div>
            <div className="rule-note">
              <TimerReset />
              <p>
                <strong>Quy tắc gia hạn</strong>Lượt đặt giá hợp lệ trong 2 phút cuối sẽ gia hạn
                phiên thêm 5 phút.
              </p>
            </div>
          </section>
        </div>
        <section className="container details">
          <div className="detail-main">
            <div className="tabs">
              <button className="active">Mô tả sản phẩm</button>
              <button>Thông số</button>
              <button>Lịch sử đặt giá (12)</button>
            </div>
            <h2>Thiết kế cân bằng giữa thanh lịch và thể thao</h2>
            <p>
              Omega Seamaster Aqua Terra sở hữu mặt số xanh teak đặc trưng, vỏ thép không gỉ 41mm và
              bộ máy cơ tự động. Sản phẩm đi kèm hộp và phụ kiện như hình ảnh.
            </p>
            <div className="spec-grid">
              <div>
                <span>Thương hiệu</span>
                <strong>Omega</strong>
              </div>
              <div>
                <span>Tình trạng</span>
                <strong>Đã qua sử dụng</strong>
              </div>
              <div>
                <span>Kích thước</span>
                <strong>41 mm</strong>
              </div>
              <div>
                <span>Năm sản xuất</span>
                <strong>2022</strong>
              </div>
            </div>
          </div>
          <aside className="history">
            <h3>Lịch sử đặt giá</h3>
            {[
              ['n***8', '128.500.000 ₫', '20:05:42'],
              ['t***2', '127.000.000 ₫', '20:02:16'],
              ['n***8', '125.500.000 ₫', '19:58:03'],
            ].map(([name, price, time], index) => (
              <div key={time}>
                <span className="history-icon">
                  {index === 0 ? <Check size={15} /> : <User size={15} />}
                </span>
                <p>
                  <strong>{name}</strong>
                  <small>{time}</small>
                </p>
                <b>{price}</b>
              </div>
            ))}
          </aside>
        </section>
      </main>
      {confirm && (
        <div className="modal-backdrop">
          <div className="confirm-modal">
            <span className="confirm-icon">
              <Zap />
            </span>
            <h2>Xác nhận đặt giá</h2>
            <p>
              Bạn sắp đặt giá cho phiên đấu giá <strong>#NX-240624</strong>
            </p>
            <div className="confirm-amount">
              <span>Giá đặt của bạn</span>
              <strong>{bid} ₫</strong>
            </div>
            <div className="wallet-line">
              <span>Số dư ví khả dụng</span>
              <strong>180.000.000 ₫</strong>
            </div>
            <label className="terms">
              <input type="checkbox" defaultChecked />
              <span>
                Tôi hiểu giá đặt là cam kết mua. Nếu thắng, tôi cần hoàn tất thanh toán trong 24
                giờ.
              </span>
            </label>
            <Button
              className="full"
              onClick={() => {
                setConfirm(false);
                setAccepted(true);
              }}
            >
              Xác nhận đặt giá
            </Button>
            <Button variant="ghost" className="full" onClick={() => setConfirm(false)}>
              Quay lại kiểm tra
            </Button>
          </div>
        </div>
      )}
      <div className="mobile-bid">
        <div>
          <span>Giá hiện tại</span>
          <strong>128.500.000 ₫</strong>
        </div>
        <Button onClick={() => setConfirm(true)}>Đặt giá</Button>
      </div>
      <Footer />
    </>
  );
}

function SellerCenter({ go }: { go: (page: Page) => void }) {
  const [active, setActive] = useState('Tổng quan');
  const navItems = [
    [Grid2X2, 'Tổng quan', ''],
    [Truck, 'Đơn hàng & GHN', '18'],
    [Gavel, 'Đấu giá 3D', '2 Live'],
    [Package, 'Kho & Sản phẩm', ''],
    [Wallet, 'Tài chính & Ví Escrow', ''],
    [Star, 'Đánh giá & Khách hàng', ''],
    [Settings, 'Cài đặt Shop', ''],
  ] as const;
  const stats = [
    {
      icon: BarChart3,
      label: 'Doanh thu thuần (Tuần)',
      value: '348.600.000 ₫',
      meta: '↑ 16,8% so với tuần trước',
      tone: 'green',
    },
    {
      icon: LockKeyhole,
      label: 'Ký quỹ Escrow an toàn',
      value: '185.000.000 ₫',
      meta: '4 giao dịch bảo chứng',
      tone: 'blue',
    },
    {
      icon: Clock3,
      label: 'Đơn hàng cần giao GHN',
      value: '18 đơn',
      meta: '12 đơn chờ in mã',
      tone: 'orange',
    },
    {
      icon: Box,
      label: 'Đấu giá 3D đang diễn ra',
      value: '2 phiên Live',
      meta: '18 nhà sưu tầm đang bid',
      tone: 'purple',
    },
  ];
  const orders = [
    {
      id: '#NX-ORD-991204',
      name: 'Trần Đình Khang',
      product: 'AP Royal Oak 41mm Selfwinding',
      price: '82.500.000 ₫',
      image: images.watch2,
      escrow: 'PayOS cọc 100%',
      shipping: 'GHN Siêu Tốc',
      deadline: 'Lấy trước 16:00',
    },
    {
      id: '#NX-ORD-887410',
      name: 'Victoria Nguyen',
      product: 'Dây da cá sấu Alligator Titan khóa bấm',
      price: '12.800.000 ₫',
      image: images.watch1,
      escrow: 'Stripe Escrow',
      shipping: 'GHN Chuẩn 24H',
      deadline: 'Mã API: GHN-SG-884920',
    },
  ];
  const sellerAuctions = [
    {
      image: images.watch3,
      status: 'ĐANG LIVE 3D',
      title: 'AP Royal Oak Chronograph 3D',
      value: '148.000.000 ₫',
      action: 'Vào phòng Live 3D',
    },
    {
      image: images.watch1,
      status: 'ĐÃ CÓ GIÁ',
      title: 'Dây da cá sấu Alligator Titan',
      value: '24.500.000 ₫',
      action: 'Kiểm tra hợp đồng Escrow',
    },
    {
      image: images.decor,
      status: 'THẨM ĐỊNH',
      title: 'Tranh sơn mài Cổ vật Hà Nội 1974',
      value: '60.000.000 ₫',
      action: 'Chờ phê duyệt mô hình',
    },
  ];
  return (
    <main className="seller-center">
      <aside className="seller-sidebar">
        <div className="seller-logo">
          <Logo onClick={() => go('home')} />
          <i>v2.4</i>
        </div>
        <p>QUẢN TRỊ CỬA HÀNG</p>
        <nav>
          {navItems.map(([Icon, label, count]) => (
            <button
              key={label}
              className={active === label ? 'active' : ''}
              onClick={() => setActive(label)}
            >
              <Icon />
              <span>{label}</span>
              {count && <b>{count}</b>}
            </button>
          ))}
        </nav>
        <div className="seller-engine">
          <span>
            <i /> WebGL 3D Studio <b>60 FPS</b>
          </span>
          <p>Hạ tầng renderer sẵn sàng cho các phiên đấu giá tương tác.</p>
        </div>
      </aside>

      <section className="seller-workspace">
        <header className="seller-topbar">
          <div>
            <Search />
            <input placeholder="Tìm kiếm đơn hàng, sản phẩm, mã GLB..." />
          </div>
          <span className="store-live">
            <i /> Gian hàng hoạt động
          </span>
          <button className="seller-bell">
            <Bell />
            <i />
          </button>
          <div className="seller-user">
            <span>TN</span>
            <p>
              <strong>TechNova Studio</strong>
              <small>ID: NX-88492</small>
            </p>
          </div>
        </header>

        <div className="seller-content">
          {active !== 'Tổng quan' && (
            <section className="seller-page-title">
              <div>
                <span>SELLER CENTER</span>
                <h1>{active}</h1>
                <p>
                  {active === 'Đơn hàng & GHN'
                    ? 'Xử lý đơn hàng, in phiếu và theo dõi bàn giao vận chuyển.'
                    : active === 'Đấu giá 3D'
                      ? 'Quản lý phiên trực tiếp, mô hình 3D và kết quả đấu giá.'
                      : active === 'Kho & Sản phẩm'
                        ? 'Theo dõi tồn kho, SKU, tình trạng hiển thị và chất lượng sản phẩm.'
                        : active === 'Tài chính & Ví Escrow'
                          ? 'Kiểm soát số dư, tiền đang khóa, giải ngân và lịch sử giao dịch.'
                          : active === 'Đánh giá & Khách hàng'
                            ? 'Theo dõi chất lượng phục vụ và phản hồi từ người mua.'
                            : 'Quản lý hồ sơ, vận chuyển, thông báo và bảo mật gian hàng.'}
                </p>
              </div>
              <Button>
                <Plus />{' '}
                {active === 'Đơn hàng & GHN'
                  ? 'Tạo đơn thủ công'
                  : active === 'Đấu giá 3D'
                    ? 'Tạo phiên đấu giá'
                    : active === 'Kho & Sản phẩm'
                      ? 'Thêm sản phẩm'
                      : active === 'Tài chính & Ví Escrow'
                        ? 'Yêu cầu rút tiền'
                        : active === 'Đánh giá & Khách hàng'
                          ? 'Xuất báo cáo'
                          : 'Lưu thay đổi'}
              </Button>
            </section>
          )}

          {active === 'Tổng quan' && (
            <>
              <section className="seller-store-card">
                <div className="seller-shop-avatar">
                  <img src={images.watch2} alt="Audemars Piguet Boutique Saigon" />
                  <i />
                </div>
                <div className="seller-store-copy">
                  <div>
                    <h1>Audemars Piguet Boutique Saigon</h1>
                    <span>NEXUS Mall Official</span>
                  </div>
                  <p>
                    <b>★ 4,95</b> (1.420 đánh giá)　·　Tỷ lệ phản hồi: <strong>99,4%</strong>　·　Tỷ
                    lệ hủy đơn: <strong>0%</strong>
                  </p>
                </div>
                <div className="seller-store-actions">
                  <Button variant="secondary">
                    <Box /> Tạo phiên đấu giá 3D
                  </Button>
                  <Button>
                    <Plus /> Thêm sản phẩm
                  </Button>
                </div>
              </section>

              <section className="seller-stats">
                {stats.map(({ icon: Icon, label, value, meta, tone }) => (
                  <article key={label}>
                    <div>
                      <span>{label}</span>
                      <i className={tone}>
                        <Icon />
                      </i>
                    </div>
                    <strong>{value}</strong>
                    <p>{meta}</p>
                    <small>
                      {label.includes('Doanh')
                        ? 'Tiến độ chỉ tiêu: 78% đạt kế hoạch'
                        : label.includes('Ký')
                          ? 'Cổng giải ngân: PayOS & Stripe Vault'
                          : label.includes('Đơn')
                            ? 'Hạn chót xử lý: 16:00'
                            : 'Trạng thái Mesh: đã kiểm định'}
                    </small>
                  </article>
                ))}
              </section>

              <section className="seller-analytics">
                <article className="seller-chart-card">
                  <div className="seller-card-heading">
                    <div>
                      <h2>Tăng trưởng dòng tiền & doanh số</h2>
                      <p>Đối soát tách biệt giữa đấu giá 3D và bán lẻ Mall</p>
                    </div>
                    <div>
                      <button>7 ngày</button>
                      <button className="active">30 ngày</button>
                      <button>Tháng này</button>
                    </div>
                  </div>
                  <div className="seller-line-chart">
                    <span className="grid-line line-a" />
                    <span className="grid-line line-b" />
                    <span className="grid-line line-c" />
                    <svg
                      viewBox="0 0 700 220"
                      preserveAspectRatio="none"
                      aria-label="Biểu đồ tăng trưởng doanh thu"
                    >
                      <path
                        className="area-purple"
                        d="M0 190 C70 170,95 130,165 120 S280 130,340 85 S450 55,510 72 S620 50,700 15 L700 220 L0 220 Z"
                      />
                      <path
                        className="line-purple"
                        d="M0 190 C70 170,95 130,165 120 S280 130,340 85 S450 55,510 72 S620 50,700 15"
                      />
                      <path
                        className="line-orange"
                        d="M0 205 C100 185,150 165,230 150 S350 155,430 132 S520 110,590 88 S650 82,700 72"
                      />
                      <circle cx="510" cy="72" r="5" />
                      <circle className="orange-dot" cx="590" cy="88" r="5" />
                    </svg>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i /> Doanh thu đấu giá 3D: <strong>218.400.000 ₫</strong>
                    </span>
                    <span>
                      <i /> Doanh thu đơn thường: <strong>130.200.000 ₫</strong>
                    </span>
                    <small>
                      Chiết khấu sàn: <strong>44.056.000 ₫</strong>
                    </small>
                  </div>
                </article>
                <article className="seller-donut-card">
                  <div className="seller-card-heading">
                    <div>
                      <h2>Tỷ trọng doanh thu</h2>
                      <p>Phân bổ nguồn thu các phiên trực tiếp</p>
                    </div>
                  </div>
                  <div className="seller-donut">
                    <div>
                      <span>TỔNG GD</span>
                      <strong>100%</strong>
                    </div>
                  </div>
                  <div className="donut-legend">
                    <span>
                      <i /> Đấu giá 3D Live <strong>62,6% (14 phiên)</strong>
                    </span>
                    <span>
                      <i /> Bán lẻ Mall chuẩn <strong>37,4% (89 đơn)</strong>
                    </span>
                  </div>
                </article>
              </section>
            </>
          )}

          {active === 'Đơn hàng & GHN' && (
            <section className="seller-table-card">
              <div className="seller-card-heading">
                <div>
                  <h2>Đơn hàng chờ bàn giao GHN Express</h2>
                  <p>
                    Tài xế GHN Hub Q.1 nhận hàng: <b>16:00 hôm nay</b>
                  </p>
                </div>
                <div className="order-tabs">
                  <button>Chờ xác nhận (5)</button>
                  <button className="active">Chờ giao GHN (7)</button>
                  <button>Đồng kiểm (1)</button>
                  <button className="print-batch">In hàng loạt (12 đơn)</button>
                </div>
              </div>
              <div className="seller-table-head">
                <span>MÃ ĐƠN & NGƯỜI MUA</span>
                <span>SẢN PHẨM & GIÁ TRỊ</span>
                <span>TRẠNG THÁI ESCROW</span>
                <span>GIAO VẬN & HẸN GIỜ</span>
                <span>THAO TÁC</span>
              </div>
              {orders.map((order) => (
                <div className="seller-order-row" key={order.id}>
                  <div>
                    <strong>{order.id}</strong>
                    <span>{order.name}</span>
                    <small>Quận 1, TP. Hồ Chí Minh</small>
                  </div>
                  <div className="order-product">
                    <img src={order.image} alt={order.product} />
                    <p>
                      <strong>{order.product}</strong>
                      <span>{order.price}</span>
                    </p>
                  </div>
                  <div>
                    <b className="escrow-pill">{order.escrow}</b>
                    <small>Tạm giữ bảo chứng an toàn</small>
                  </div>
                  <div>
                    <strong>{order.shipping}</strong>
                    <span className="deadline">{order.deadline}</span>
                  </div>
                  <div className="order-actions">
                    <Button variant="secondary">In phiếu</Button>
                    <Button>Đã gói hàng</Button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {active === 'Đấu giá 3D' && (
            <section className="seller-auction-card">
              <div className="seller-card-heading">
                <div>
                  <h2>Quản trị phòng đấu giá 3D tương tác</h2>
                  <p>Giám sát các phiên trực tiếp và mô hình số 3D kiểm định</p>
                </div>
                <Button>
                  <Plus /> Đăng ký phiên đấu giá mới
                </Button>
              </div>
              <div className="seller-auction-grid">
                {sellerAuctions.map((item, index) => (
                  <article key={item.title}>
                    <div>
                      <img src={item.image} alt={item.title} />
                      <span className={`auction-status status-${index}`}>{item.status}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <small>
                      {index === 0
                        ? 'Sở hữu độc bản #NX-AUC-004'
                        : index === 1
                          ? 'Thắng: user_hex88'
                          : 'Di sản nghệ thuật quý hiếm'}
                    </small>
                    <div>
                      <span>
                        {index === 0
                          ? 'GIÁ CAO NHẤT'
                          : index === 1
                            ? 'GIÁ TRÚNG'
                            : 'KHỞI ĐIỂM DỰ KIẾN'}
                      </span>
                      <strong>{item.value}</strong>
                    </div>
                    <button disabled={index === 2}>{item.action}</button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {active === 'Tài chính & Ví Escrow' && (
            <section className="seller-bottom-grid">
              <article className="seller-wallet-card">
                <div className="seller-card-heading">
                  <div>
                    <h2>Ví tài chính & rút tiền Escrow</h2>
                    <p>Kết nối giải ngân tự động qua PayOS QR và Stripe Connect</p>
                  </div>
                  <span className="safe-badge">Bảo chứng 100%</span>
                </div>
                <div className="wallet-balance">
                  <div>
                    <span>SỐ DƯ KHẢ DỤNG CÓ THỂ RÚT</span>
                    <strong>163.600.000 ₫</strong>
                    <small>Đã khấu trừ thuế và phí sàn minh bạch</small>
                  </div>
                  <Button>
                    <Wallet /> Rút về ngân hàng
                  </Button>
                </div>
                <p className="linked-title">Tài khoản nhận tiền liên kết:</p>
                <div className="linked-accounts">
                  <div>
                    <i>VCB</i>
                    <p>
                      <strong>Vietcombank Doanh nghiệp</strong>
                      <span>PayOS API •••• 9928</span>
                    </p>
                    <CheckCircle2 />
                  </div>
                  <div>
                    <i>ST</i>
                    <p>
                      <strong>Stripe USD Connect</strong>
                      <span>Payout Quốc tế • Verified</span>
                    </p>
                    <CheckCircle2 />
                  </div>
                </div>
                <div className="wallet-foot">
                  <span>Phí bán lẻ 7% • Phí đấu giá cấu hình theo danh mục</span>
                  <button>Chi tiết bảng phí →</button>
                </div>
              </article>
              <article className="seller-transactions-card">
                <div className="seller-card-heading">
                  <div>
                    <h2>Dòng tiền gần đây</h2>
                    <p>Cập nhật theo xác nhận từ cổng thanh toán</p>
                  </div>
                </div>
                {[
                  ['Nhận tiền đơn #NX-991204', '+82.500.000 ₫', 'PayOS · Hôm nay, 10:24'],
                  ['Khóa tiền phiên #NX-AUC-004', '−24.500.000 ₫', 'Escrow · Hôm qua, 21:15'],
                  ['Phí nền tảng tháng 6', '−8.420.000 ₫', 'Đã đối soát · 20/06'],
                ].map(([title, amount, meta], index) => (
                  <div className="transaction-row" key={title}>
                    <i className={index === 0 ? 'income' : ''}>
                      {index === 0 ? <ArrowLeft /> : <ArrowRight />}
                    </i>
                    <p>
                      <strong>{title}</strong>
                      <span>{meta}</span>
                    </p>
                    <b>{amount}</b>
                  </div>
                ))}
              </article>
            </section>
          )}

          {active === 'Kho & Sản phẩm' && (
            <section className="seller-inventory">
              <div className="inventory-summary">
                {[
                  ['Tổng sản phẩm', '126', '118 đang bán'],
                  ['SKU sắp hết', '08', 'Cần nhập thêm'],
                  ['Hết hàng', '03', 'Đang ẩn khỏi Mall'],
                  ['Chờ duyệt', '05', '2 mô hình 3D'],
                ].map(([label, value, meta], index) => (
                  <article key={label}>
                    <i className={`inventory-icon inv-${index}`}>
                      {index === 0 ? (
                        <Package />
                      ) : index === 1 ? (
                        <Clock3 />
                      ) : index === 2 ? (
                        <X />
                      ) : (
                        <CheckCircle2 />
                      )}
                    </i>
                    <p>
                      <span>{label}</span>
                      <strong>{value}</strong>
                      <small>{meta}</small>
                    </p>
                  </article>
                ))}
              </div>
              <div className="inventory-table">
                <div className="inventory-toolbar">
                  <div>
                    <Search />
                    <input placeholder="Tìm tên sản phẩm hoặc SKU" />
                  </div>
                  <button>
                    Tất cả danh mục <ChevronDown />
                  </button>
                  <button>
                    Tình trạng <ChevronDown />
                  </button>
                </div>
                <div className="inventory-head">
                  <span>SẢN PHẨM</span>
                  <span>SKU / DANH MỤC</span>
                  <span>GIÁ BÁN</span>
                  <span>TỒN KHO</span>
                  <span>TRẠNG THÁI</span>
                  <span>THAO TÁC</span>
                </div>
                {[
                  { p: products[1], sku: 'OMG-AT-41-BL', stock: '07', status: 'Đang bán' },
                  { p: products[0], sku: 'LNG-MC-MP-40', stock: '02', status: 'Sắp hết' },
                  { p: products[2], sku: 'GS-SD-HR-22', stock: '00', status: 'Hết hàng' },
                  { p: products[3], sku: 'CRT-SANTOS-M', stock: '12', status: 'Chờ duyệt 3D' },
                ].map(({ p, sku, stock, status }) => (
                  <div className="inventory-row" key={sku}>
                    <div>
                      <img src={p.image} alt={p.title} />
                      <p>
                        <strong>{p.title}</strong>
                        <small>Cập nhật hôm nay</small>
                      </p>
                    </div>
                    <div>
                      <strong>{sku}</strong>
                      <span>Đồng hồ cao cấp</span>
                    </div>
                    <strong>{p.price}</strong>
                    <b>{stock}</b>
                    <span
                      className={`inventory-status status-${status.replaceAll(' ', '-').toLowerCase()}`}
                    >
                      {status}
                    </span>
                    <button>Chỉnh sửa</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {active === 'Đánh giá & Khách hàng' && (
            <section className="seller-reviews-page">
              <div className="rating-overview">
                <article>
                  <span>ĐIỂM ĐÁNH GIÁ GIAN HÀNG</span>
                  <strong>4,95</strong>
                  <div>★★★★★</div>
                  <p>1.420 đánh giá đã xác minh</p>
                </article>
                <article>
                  <h2>Phân bổ đánh giá</h2>
                  {[
                    ['5 sao', '92%'],
                    ['4 sao', '6%'],
                    ['3 sao', '2%'],
                    ['2 sao', '0%'],
                    ['1 sao', '0%'],
                  ].map(([label, value]) => (
                    <div className="rating-bar" key={label}>
                      <span>{label}</span>
                      <i>
                        <b style={{ width: value }} />
                      </i>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </article>
                <article>
                  <h2>Chất lượng phục vụ</h2>
                  <div className="service-score">
                    <span>
                      Phản hồi trong 2 giờ <b>98%</b>
                    </span>
                    <span>
                      Đơn giao đúng hạn <b>96%</b>
                    </span>
                    <span>
                      Khách quay lại <b>42%</b>
                    </span>
                  </div>
                </article>
              </div>
              <div className="review-list">
                <div className="seller-card-heading">
                  <div>
                    <h2>Phản hồi mới nhất</h2>
                    <p>Đánh giá từ các giao dịch đã hoàn tất</p>
                  </div>
                  <div>
                    <button className="active">Tất cả</button>
                    <button>Chưa phản hồi</button>
                  </div>
                </div>
                {[
                  [
                    'n***8',
                    'Sản phẩm đúng mô tả, đóng gói rất kỹ và giao nhanh.',
                    'Omega Seamaster Aqua Terra',
                    'Hôm nay, 09:18',
                  ],
                  [
                    't***2',
                    'Người bán tư vấn rõ ràng. Trải nghiệm đấu giá trực tiếp rất tốt.',
                    'Longines Master Collection',
                    'Hôm qua, 20:42',
                  ],
                  [
                    'v***a',
                    'Hộp sản phẩm chắc chắn, thông tin minh bạch.',
                    'Grand Seiko Heritage',
                    '22/06, 14:05',
                  ],
                ].map(([name, text, product, time]) => (
                  <article key={time}>
                    <span>{name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <div>
                        <strong>{name}</strong>
                        <b>★★★★★</b>
                        <small>{time}</small>
                      </div>
                      <p>{text}</p>
                      <small>Sản phẩm: {product}</small>
                      <button>Trả lời đánh giá</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {active === 'Cài đặt Shop' && (
            <section className="seller-settings-page">
              <article className="settings-form">
                <div className="seller-card-heading">
                  <div>
                    <h2>Thông tin gian hàng</h2>
                    <p>Hiển thị công khai trên NEXUS Mall</p>
                  </div>
                </div>
                <div className="shop-profile">
                  <div className="seller-shop-avatar">
                    <img src={images.watch2} alt="Ảnh đại diện gian hàng" />
                    <i />
                  </div>
                  <Button variant="secondary">Thay ảnh đại diện</Button>
                </div>
                <label>
                  Tên gian hàng
                  <Input placeholder="Audemars Piguet Boutique Saigon" />
                </label>
                <label>
                  Mô tả gian hàng
                  <textarea defaultValue="Chuyên đồng hồ cao cấp tuyển chọn và các phiên đấu giá 3D trực tiếp." />
                </label>
                <div className="settings-two">
                  <label>
                    Email hỗ trợ
                    <Input placeholder="seller@nexus.market.vn" />
                  </label>
                  <label>
                    Hotline
                    <Input placeholder="1900 8899" />
                  </label>
                </div>
                <label>
                  Địa chỉ lấy hàng
                  <Input placeholder="Quận 1, TP. Hồ Chí Minh" />
                </label>
              </article>
              <article className="settings-side">
                <div className="seller-card-heading">
                  <div>
                    <h2>Vận hành & thông báo</h2>
                    <p>Tùy chỉnh trải nghiệm quản trị</p>
                  </div>
                </div>
                {[
                  ['Tự động xác nhận đơn Mall', 'Xác nhận đơn mới trong giờ hoạt động', true],
                  ['Cảnh báo tồn kho thấp', 'Thông báo khi SKU còn dưới 3 sản phẩm', true],
                  ['Email kết quả đấu giá', 'Gửi báo cáo sau khi phiên kết thúc', true],
                  ['Cho phép chat ngoài giờ', 'Người mua có thể gửi tin nhắn sau 22:00', false],
                ].map(([title, detail, on]) => (
                  <div className="setting-toggle" key={String(title)}>
                    <p>
                      <strong>{title}</strong>
                      <span>{detail}</span>
                    </p>
                    <button className={on ? 'on' : ''}>
                      <i />
                    </button>
                  </div>
                ))}
                <div className="seller-safety-card embedded">
                  <div className="seller-card-heading">
                    <div>
                      <h2>Bảo mật & quy chế</h2>
                    </div>
                  </div>
                  <div className="safety-note">
                    <ShieldCheck />
                    <p>
                      <strong>Xác thực hai lớp đang bật</strong>
                      <span>Tài khoản được bảo vệ khi đăng nhập thiết bị mới.</span>
                    </p>
                  </div>
                  <div className="seller-hotline">
                    <HelpCircle />
                    <p>
                      <span>Hotline người bán VIP</span>
                      <strong>1900 8899</strong>
                    </p>
                    <b>Hỗ trợ 24/7</b>
                  </div>
                </div>
              </article>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function AdminPanel({ go }: { go: (page: Page) => void }) {
  const [active, setActive] = useState('Tổng quan');
  const [inviteSent, setInviteSent] = useState(false);
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2025-06-24');
  const menu = [
    [Grid2X2, 'Tổng quan', ''],
    [Gavel, 'Quản lý đấu giá 3D', '8'],
    [Radio, 'Studio phát trực tiếp', '3 Live'],
    [User, 'Quản trị người dùng', ''],
    [CheckCircle2, 'Phê duyệt nâng cấp Seller', '5'],
    [RotateCcw, 'Phê duyệt hoàn tiền', '6'],
    [Wallet, 'Tài chính & Kỹ thuật', ''],
    [BarChart3, 'Giám sát hệ thống & Event Log', ''],
    [Settings, 'Cài đặt & Kiểm duyệt', ''],
  ] as const;
  const titleDescriptions: Record<string, string> = {
    'Quản lý đấu giá 3D': 'Điều phối lịch, mô hình 3D, mức giá và quy tắc từng phiên.',
    'Studio phát trực tiếp': 'Giám sát phòng live, WebGL stream và đội ngũ vận hành.',
    'Quản trị người dùng': 'Tìm kiếm, phân quyền và xử lý trạng thái tài khoản.',
    'Phê duyệt nâng cấp Seller': 'Thẩm định hồ sơ doanh nghiệp và năng lực vận hành.',
    'Phê duyệt hoàn tiền': 'Xem bằng chứng, đối soát Escrow và ra quyết định cuối cùng.',
    'Tài chính & Kỹ thuật': 'Theo dõi doanh thu, phí nền tảng và trạng thái cổng thanh toán.',
    'Giám sát hệ thống & Event Log': 'Kiểm tra sức khỏe dịch vụ và nhật ký thời gian thực.',
    'Cài đặt & Kiểm duyệt': 'Quản lý quy tắc nền tảng, từ khóa và chính sách vận hành.',
    'Thêm Staff': 'Tạo tài khoản nhân sự và gửi lời mời xác thực qua email.',
  };
  const auctions = [
    {
      image: images.watch2,
      name: 'Omega Seamaster Aqua Terra 3D',
      seller: 'Atelier Minh',
      price: '128.500.000 ₫',
      time: '20:00 hôm nay',
      status: 'Đang live',
    },
    {
      image: images.watch1,
      name: 'Patek Philippe Calatrava 5227R',
      seller: 'Imperial Horology',
      price: '450.000.000 ₫',
      time: '21:30 hôm nay',
      status: 'Đã duyệt',
    },
    {
      image: images.decor,
      name: 'Bình gốm lam thế kỷ 18',
      seller: 'Heritage House',
      price: '88.000.000 ₫',
      time: '15:00 ngày mai',
      status: 'Chờ duyệt',
    },
  ];
  const users = [
    ['Trần Danh', 'tran.danh.88@gmail.com', 'Buyer', 'Đã khóa', 'Giao dịch dấu hiệu bất thường'],
    ['Hoàng Anh', 'hoanganh.watches@gmail.com', 'Seller', 'Đang hoạt động', 'Gian hàng 4,9 sao'],
    [
      'Khoa Nguyễn',
      'khoa.nguyen.bidder@outlook.com',
      'Buyer',
      'Cảnh báo',
      'Từ chối thanh toán 2 phiên',
    ],
    ['Minh Trang', 'trang.minh@nexus.vn', 'Staff', 'Đang hoạt động', 'Support Staff'],
  ];
  const sellerApprovals = [
    ['Artisan Dragon Gems', 'Doanh nghiệp', '42 đơn thành công', 'Hủy 0%', 'Tin nhiệm 4,95'],
    [
      'Vintage Saigon Horology',
      'Cá nhân kinh doanh',
      '19 đơn giá trị cao',
      'Hủy 0%',
      'Tin nhiệm 4,8',
    ],
    ['Nếp Home Atelier', 'Doanh nghiệp', '128 đơn thành công', 'Hủy 1,2%', 'Tin nhiệm 4,9'],
  ];
  const refunds = [
    [
      '#NX-ORD-991204',
      '48.500.000 ₫',
      'Lư Hương Đồng triều Nguyễn',
      'Buyer đã quay video mở niêm phong',
      'Hoàn tiền toàn phần',
    ],
    [
      '#NX-ORD-887410',
      '112.000.000 ₫',
      'Đồng hồ Omega Seamaster 300M',
      'Sai số dây đeo, Seller phản hồi thiếu bằng chứng',
      'Yêu cầu giám định',
    ],
    [
      '#NX-ORD-772305',
      '6.500.000 ₫',
      'Ví lạnh VaultKey Titanium',
      'Sản phẩm không kích hoạt được',
      'Hoàn tiền toàn phần',
    ],
  ];
  return (
    <main className="admin-panel">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Logo onClick={() => go('home')} />
          <span>ADMIN PANEL</span>
        </div>
        <p>ĐIỀU HÀNH NỀN TẢNG</p>
        <nav>
          {menu.map(([Icon, label, count]) => (
            <button
              key={label}
              className={active === label ? 'active' : ''}
              onClick={() => setActive(label)}
            >
              <Icon />
              <span>{label}</span>
              {count && <b>{count}</b>}
            </button>
          ))}
        </nav>
        <div className="admin-engine">
          <span>
            <i /> Hệ thống hoạt động
          </span>
          <strong>99,98%</strong>
          <small>6 WebGL Nodes Online</small>
        </div>
      </aside>
      <section className="admin-workspace">
        <header className="admin-topbar">
          <button className="admin-mobile-menu">
            <Menu />
          </button>
          <span className="admin-panel-pill">
            <ShieldCheck /> NEXUS ADMIN PANEL
          </span>
          <span className="admin-server">
            <i /> Cụm máy chủ: 99,98%
          </span>
          <div className="admin-top-spacer" />
          <button>VIE</button>
          <button className="seller-bell">
            <Bell />
            <i />
          </button>
          <div className="admin-user">
            <span>AT</span>
            <p>
              <strong>Alex Trần</strong>
              <small>SUPER ADMIN</small>
            </p>
          </div>
        </header>
        <div className="admin-content">
          {active === 'Tổng quan' ? (
            <>
              <section className="admin-command">
                <div>
                  <span>LỆNH ĐIỀU HÀNH HỆ THỐNG</span>
                  <h1>Trung tâm điều hành toàn hệ thống</h1>
                  <p>
                    <i /> WebSocket Engine: <strong>12ms</strong>　·　PayOS & Stripe:{' '}
                    <strong>Sẵn sàng</strong>　·　WebGL Cluster: <strong>6 nodes online</strong>
                  </p>
                </div>
                <div>
                  <Button>
                    <Radio /> Bắt đầu phát trực tiếp 3D
                  </Button>
                  <Button variant="secondary">
                    <Plus /> Tạo phiên đấu giá 3D
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setInviteSent(false);
                      setActive('Thêm Staff');
                    }}
                  >
                    <User /> Thêm Staff
                  </Button>
                </div>
              </section>
              <section className="admin-kpis">
                {[
                  ['Doanh thu phí sàn', '1.842.500.000 ₫', '+76.770 USD · tháng này', Wallet],
                  [
                    'Phiên đấu giá đang diễn ra',
                    '8 phiên Live',
                    '142 người trả giá theo giây',
                    Gavel,
                  ],
                  [
                    'Yêu cầu chờ quyết định',
                    '14 yêu cầu',
                    '5 Seller · 6 hoàn tiền · 3 vật phẩm',
                    Clock3,
                  ],
                  ['Người dùng & phân quyền', '38.420 users', '+280 tài khoản trong 24 giờ', User],
                ].map(([label, value, meta, Icon]) => (
                  <article key={String(label)}>
                    <div>
                      <span>{String(label)}</span>
                      <i>
                        <Icon />
                      </i>
                    </div>
                    <strong>{String(value)}</strong>
                    <p>{String(meta)}</p>
                  </article>
                ))}
              </section>
              <section className="admin-overview-grid">
                <article className="admin-revenue-card">
                  <div className="admin-section-heading">
                    <div>
                      <h2>Xu hướng doanh thu phí sàn</h2>
                      <p>Phân tích doanh thu bán lẻ và đấu giá 3D theo thời gian</p>
                    </div>
                    <div className="admin-chart-controls">
                      <div className="admin-date-range">
                        <label>
                          Từ ngày
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(event) => setDateFrom(event.target.value)}
                          />
                        </label>
                        <span>→</span>
                        <label>
                          Đến ngày
                          <input
                            type="date"
                            value={dateTo}
                            min={dateFrom}
                            onChange={(event) => setDateTo(event.target.value)}
                          />
                        </label>
                      </div>
                      <div className="admin-period-tabs">
                        <button className="active">7 ngày</button>
                        <button>30 ngày</button>
                        <button>Tháng này</button>
                      </div>
                    </div>
                  </div>
                  <div className="admin-selected-range">
                    <Clock3 /> Dữ liệu từ <strong>{dateFrom.split('-').reverse().join('/')}</strong>{' '}
                    đến <strong>{dateTo.split('-').reverse().join('/')}</strong>
                  </div>
                  <div className="admin-revenue-totals">
                    <span>
                      TỔNG DOANH THU GIAI ĐOẠN<strong>438.500.000 ₫</strong>
                    </span>
                    <span>
                      DOANH THU ĐẤU GIÁ 3D<strong>226.200.000 ₫</strong>
                    </span>
                    <span>
                      DOANH THU ĐƠN THƯỜNG<strong>212.300.000 ₫</strong>
                    </span>
                  </div>
                  <div className="admin-chart">
                    <span />
                    <span />
                    <span />
                    <svg viewBox="0 0 700 220" preserveAspectRatio="none">
                      <g className="admin-chart-bars">
                        <rect x="24" y="150" width="34" height="70" />
                        <rect x="122" y="112" width="34" height="108" />
                        <rect x="220" y="132" width="34" height="88" />
                        <rect x="318" y="84" width="34" height="136" />
                        <rect x="416" y="62" width="34" height="158" />
                        <rect x="514" y="44" width="34" height="176" />
                        <rect x="612" y="28" width="34" height="192" />
                      </g>
                      <path
                        d="M0 180 C80 160,110 110,180 130 S300 170,360 105 S470 75,530 40 S620 65,700 25"
                        className="admin-line-blue"
                      />
                      <path
                        d="M0 195 C70 180,120 90,180 110 S300 140,360 85 S480 55,530 65 S625 30,700 48"
                        className="admin-line-cyan"
                      />
                    </svg>
                  </div>
                  <div className="admin-chart-legend">
                    <span>
                      <i className="bar" /> Tổng phí sàn
                    </span>
                    <span>
                      <i className="blue" /> Doanh thu đấu giá 3D
                    </span>
                    <span>
                      <i className="cyan" /> Doanh thu đơn thường
                    </span>
                    <small>Đơn vị: VND</small>
                  </div>
                </article>
                <article className="admin-fee-card">
                  <div className="admin-section-heading">
                    <div>
                      <h2>Cơ cấu nguồn thu phí sàn</h2>
                      <p>Tỷ lệ đóng góp theo danh mục</p>
                    </div>
                  </div>
                  <div className="admin-fee-donut">
                    <span>
                      TỔNG PHÍ SÀN<strong>1,84 tỷ</strong>
                    </span>
                  </div>
                  <p>
                    <i /> Đơn thường TMĐT <strong>924,3 triệu</strong>
                  </p>
                  <p>
                    <i /> Đấu giá 3D <strong>918,2 triệu</strong>
                  </p>
                </article>
              </section>
              <section className="admin-review-grid">
                <article>
                  <div className="admin-section-heading">
                    <div>
                      <h2>Seller chờ nâng cấp</h2>
                      <p>5 hồ sơ cần thẩm định</p>
                    </div>
                    <button onClick={() => setActive('Phê duyệt nâng cấp Seller')}>
                      Xem tất cả
                    </button>
                  </div>
                  {sellerApprovals.slice(0, 2).map((item) => (
                    <div className="admin-mini-case" key={item[0]}>
                      <span>{item[0].slice(0, 2).toUpperCase()}</span>
                      <p>
                        <strong>{item[0]}</strong>
                        <small>
                          {item[2]} · {item[3]}
                        </small>
                      </p>
                      <Button>Phê duyệt</Button>
                    </div>
                  ))}
                </article>
                <article>
                  <div className="admin-section-heading">
                    <div>
                      <h2>Hoàn tiền chờ phán quyết</h2>
                      <p>6 hồ sơ cần quyết định</p>
                    </div>
                    <button onClick={() => setActive('Phê duyệt hoàn tiền')}>Xem tất cả</button>
                  </div>
                  {refunds.slice(0, 2).map((item) => (
                    <div className="admin-mini-case" key={item[0]}>
                      <span>
                        <RotateCcw />
                      </span>
                      <p>
                        <strong>
                          {item[0]} · {item[1]}
                        </strong>
                        <small>{item[3]}</small>
                      </p>
                      <Button>Kiểm tra</Button>
                    </div>
                  ))}
                </article>
              </section>
            </>
          ) : (
            <>
              <section className="admin-page-heading">
                <div>
                  <span>QUẢN TRỊ NEXUS</span>
                  <h1>{active}</h1>
                  <p>{titleDescriptions[active]}</p>
                </div>
                <Button>
                  <Plus />{' '}
                  {active.includes('Đấu giá')
                    ? 'Tạo phiên mới'
                    : active.includes('người dùng')
                      ? 'Thêm tài khoản'
                      : active.includes('Event')
                        ? 'Xuất Event Log'
                        : 'Tạo tác vụ'}
                </Button>
              </section>

              {active === 'Thêm Staff' && (
                <section className="admin-staff-create">
                  {!inviteSent ? (
                    <article className="admin-staff-form">
                      <div className="admin-section-heading">
                        <div>
                          <h2>Tạo lời mời nhân sự mới</h2>
                          <p>Staff sẽ nhận email để xác thực thông tin và tự thiết lập mật khẩu.</p>
                        </div>
                        <span className="safe-badge">Quyền Admin</span>
                      </div>
                      <div className="admin-invite-notice">
                        <ShieldCheck />
                        <p>
                          <strong>Quy trình cấp tài khoản an toàn</strong>
                          <span>
                            Không gửi mật khẩu qua email. Liên kết xác nhận chỉ dùng một lần và hết
                            hạn sau 24 giờ.
                          </span>
                        </p>
                      </div>
                      <div className="admin-staff-fields">
                        <label>
                          Email cá nhân <b>*</b>
                          <Input
                            placeholder="staff.personal@gmail.com"
                            type="email"
                            icon={<Bell />}
                          />
                        </label>
                        <label>
                          Số điện thoại <b>*</b>
                          <Input placeholder="0901 234 567" icon={<User />} />
                        </label>
                        <label>
                          Họ <b>*</b>
                          <Input placeholder="Nguyễn" />
                        </label>
                        <label>
                          Tên đệm <b>*</b>
                          <Input placeholder="Phương" />
                        </label>
                        <label>
                          Tên <b>*</b>
                          <Input placeholder="Vy" />
                        </label>
                        <label>
                          Bộ phận phụ trách
                          <select defaultValue="support">
                            <option value="support">Hỗ trợ khách hàng</option>
                            <option value="refund">Thẩm định hoàn tiền</option>
                            <option value="auction">Vận hành đấu giá 3D</option>
                          </select>
                        </label>
                      </div>
                      <div className="admin-role-preview">
                        <div>
                          <User />
                          <p>
                            <strong>Support Staff</strong>
                            <span>Hộp thư trực tuyến, tranh chấp và hỗ trợ đấu giá</span>
                          </p>
                        </div>
                        <label>
                          <input type="checkbox" defaultChecked /> Bắt buộc xác thực hai lớp khi
                          đăng nhập
                        </label>
                      </div>
                      <Button className="full" onClick={() => setInviteSent(true)}>
                        <Bell /> Tạo tài khoản & gửi email mời
                      </Button>
                    </article>
                  ) : (
                    <article className="admin-invite-success">
                      <span>
                        <Check />
                      </span>
                      <h2>Đã gửi lời mời làm việc</h2>
                      <p>
                        Email mời đã được gửi đến <strong>staff.personal@gmail.com</strong>. Staff
                        cần xác nhận danh tính và tạo mật khẩu trong vòng 24 giờ.
                      </p>
                      <div>
                        <span>Email nền tảng dự kiến</span>
                        <strong>phuong.vy@nexus.vn</strong>
                        <small>Được kích hoạt sau khi hoàn tất xác minh</small>
                      </div>
                      <Button onClick={() => go('staff-invite')}>
                        Xem trang xác nhận của Staff <ArrowRight />
                      </Button>
                      <Button variant="ghost" onClick={() => setInviteSent(false)}>
                        Tạo lời mời khác
                      </Button>
                    </article>
                  )}
                  <aside className="admin-staff-guide">
                    <h2>Thông tin gửi trong email</h2>
                    <div>
                      <span>01</span>
                      <p>
                        <strong>Lời mời từ NEXUS</strong>
                        <small>Thông báo Admin mời người nhận tham gia đội ngũ.</small>
                      </p>
                    </div>
                    <div>
                      <span>02</span>
                      <p>
                        <strong>Liên kết xác nhận</strong>
                        <small>Staff kiểm tra họ tên và số điện thoại.</small>
                      </p>
                    </div>
                    <div>
                      <span>03</span>
                      <p>
                        <strong>Tạo mật khẩu</strong>
                        <small>Nhập mật khẩu và xác nhận lại mật khẩu.</small>
                      </p>
                    </div>
                    <div>
                      <span>04</span>
                      <p>
                        <strong>Cấp email nền tảng</strong>
                        <small>Hệ thống cung cấp email @nexus.vn để đăng nhập.</small>
                      </p>
                    </div>
                  </aside>
                </section>
              )}

              {active === 'Quản lý đấu giá 3D' && (
                <section className="admin-data-card">
                  <div className="admin-section-heading">
                    <div>
                      <h2>Lịch điều hành phiên đấu giá</h2>
                      <p>Kiểm tra mô hình, mức giá và lịch phát sóng</p>
                    </div>
                    <div>
                      <button className="active">Tất cả</button>
                      <button>Đang Live</button>
                      <button>Chờ duyệt</button>
                    </div>
                  </div>
                  <div className="admin-table-head auction">
                    <span>VẬT PHẨM & SELLER</span>
                    <span>GIÁ KHỞI ĐIỂM</span>
                    <span>THỜI GIAN</span>
                    <span>TRẠNG THÁI</span>
                    <span>THAO TÁC</span>
                  </div>
                  {auctions.map((item) => (
                    <div className="admin-auction-row" key={item.name}>
                      <div>
                        <img src={item.image} alt={item.name} />
                        <p>
                          <strong>{item.name}</strong>
                          <span>{item.seller}</span>
                        </p>
                      </div>
                      <strong>{item.price}</strong>
                      <span>{item.time}</span>
                      <b>{item.status}</b>
                      <div>
                        <Button variant="secondary">Xem 3D</Button>
                        <Button>Duyệt lịch</Button>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {active === 'Studio phát trực tiếp' && (
                <section className="admin-live-grid">
                  {auctions.map((item, index) => (
                    <article key={item.name}>
                      <div>
                        <img src={item.image} alt={item.name} />
                        <span>
                          <Radio /> {index === 0 ? 'ĐANG PHÁT' : 'PHÒNG CHỜ'}
                        </span>
                      </div>
                      <h2>{item.name}</h2>
                      <p>
                        {index === 0 ? '1.420 người xem · 42 lượt đặt giá' : `Bắt đầu ${item.time}`}
                      </p>
                      <div>
                        <span>
                          WebGL Node #{index + 2}
                          <b>Ổn định · 60 FPS</b>
                        </span>
                        <span>
                          Độ trễ<b>{12 + index * 5}ms</b>
                        </span>
                      </div>
                      <Button className="full">
                        {index === 0 ? 'Mở bàn điều khiển Live' : 'Kiểm tra trước phát sóng'}
                      </Button>
                    </article>
                  ))}
                </section>
              )}

              {active === 'Quản trị người dùng' && (
                <section className="admin-data-card">
                  <div className="admin-list-toolbar">
                    <div>
                      <Search />
                      <input placeholder="Tìm theo email, tên hoặc mã tài khoản" />
                    </div>
                    <button>
                      Tất cả vai trò <ChevronDown />
                    </button>
                    <button>
                      Trạng thái <ChevronDown />
                    </button>
                  </div>
                  <div className="admin-table-head users">
                    <span>NGƯỜI DÙNG</span>
                    <span>VAI TRÒ</span>
                    <span>TRẠNG THÁI</span>
                    <span>GHI CHÚ QUẢN TRỊ</span>
                    <span>THAO TÁC</span>
                  </div>
                  {users.map(([name, email, role, status, note]) => (
                    <div className="admin-user-row" key={email}>
                      <div>
                        <span>{name.slice(0, 1)}</span>
                        <p>
                          <strong>{name}</strong>
                          <small>{email}</small>
                        </p>
                      </div>
                      <b>{role}</b>
                      <span>{status}</span>
                      <p>{note}</p>
                      <div>
                        <Button variant="secondary">Chi tiết</Button>
                        <Button variant={status === 'Đã khóa' ? 'primary' : 'danger'}>
                          {status === 'Đã khóa' ? 'Mở khóa' : 'Khóa'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {active === 'Phê duyệt nâng cấp Seller' && (
                <section className="admin-case-grid">
                  {sellerApprovals.map(([name, type, orders, cancel, score]) => (
                    <article key={name}>
                      <div className="admin-case-title">
                        <span>{name.slice(0, 2).toUpperCase()}</span>
                        <p>
                          <strong>{name}</strong>
                          <small>{type} · Hồ sơ đã xác minh</small>
                        </p>
                        <b>{score}</b>
                      </div>
                      <div className="admin-case-metrics">
                        <span>
                          Lịch sử bán<strong>{orders}</strong>
                        </span>
                        <span>
                          Tỷ lệ hủy<strong>{cancel}</strong>
                        </span>
                        <span>
                          Giấy phép<strong>Đã tải lên</strong>
                        </span>
                      </div>
                      <div className="admin-case-actions">
                        <Button variant="secondary">Xem hồ sơ</Button>
                        <Button variant="danger">Từ chối</Button>
                        <Button>Phê duyệt Seller</Button>
                      </div>
                    </article>
                  ))}
                </section>
              )}

              {active === 'Phê duyệt hoàn tiền' && (
                <section className="admin-refund-list">
                  {refunds.map(([id, amount, product, evidence, suggestion]) => (
                    <article key={id}>
                      <div>
                        <span>HỒ SƠ TRANH CHẤP</span>
                        <h2>{id}</h2>
                        <p>{product}</p>
                      </div>
                      <strong>{amount}</strong>
                      <div>
                        <b>Bằng chứng</b>
                        <p>{evidence}</p>
                        <b>Đề xuất</b>
                        <p>{suggestion}</p>
                      </div>
                      <div>
                        <Button variant="secondary">Xem video & log</Button>
                        <Button variant="danger">Bác bỏ</Button>
                        <Button>Chấp thuận hoàn tiền</Button>
                      </div>
                    </article>
                  ))}
                </section>
              )}

              {active === 'Tài chính & Kỹ thuật' && (
                <section className="admin-finance-grid">
                  <article className="admin-data-card">
                    <div className="admin-section-heading">
                      <div>
                        <h2>Đối soát tài chính nền tảng</h2>
                        <p>Doanh thu và giải ngân theo cổng thanh toán</p>
                      </div>
                    </div>
                    <div className="admin-finance-stats">
                      <span>
                        Tổng giao dịch<strong>6,82 tỷ ₫</strong>
                        <small>+18,4% tháng này</small>
                      </span>
                      <span>
                        Đang khóa Escrow<strong>820 triệu ₫</strong>
                        <small>24 giao dịch</small>
                      </span>
                      <span>
                        Chờ giải ngân<strong>412 triệu ₫</strong>
                        <small>12 Seller</small>
                      </span>
                    </div>
                    <div className="admin-payment-row">
                      <span>PayOS QR Gateway</span>
                      <b>Hoạt động</b>
                      <strong>3,42 tỷ ₫</strong>
                    </div>
                    <div className="admin-payment-row">
                      <span>Stripe International</span>
                      <b>Hoạt động</b>
                      <strong>2,18 tỷ ₫</strong>
                    </div>
                    <div className="admin-payment-row">
                      <span>Ví NEXUS</span>
                      <b>Hoạt động</b>
                      <strong>1,22 tỷ ₫</strong>
                    </div>
                  </article>
                  <article className="admin-data-card">
                    <div className="admin-section-heading">
                      <div>
                        <h2>Hạ tầng kỹ thuật</h2>
                        <p>Trạng thái dịch vụ tích hợp</p>
                      </div>
                    </div>
                    {[
                      'WebGL Render Cluster',
                      'PayOS Webhook',
                      'Stripe Connect',
                      'GHN Logistics API',
                    ].map((service, index) => (
                      <div className="admin-service-row" key={service}>
                        <i />
                        <p>
                          <strong>{service}</strong>
                          <span>Độ trễ {12 + index * 11}ms</span>
                        </p>
                        <b>ONLINE</b>
                      </div>
                    ))}
                  </article>
                </section>
              )}

              {active === 'Giám sát hệ thống & Event Log' && (
                <section className="admin-monitor-grid">
                  <div className="admin-health-grid">
                    {[
                      ['CPU Cluster', '18%', '6 nodes'],
                      ['RAM sử dụng', '42%', 'Ổn định'],
                      ['WebSocket', '12ms', '4.280 kết nối'],
                      ['Error rate', '0,02%', 'Trong ngưỡng'],
                    ].map(([label, value, meta]) => (
                      <article key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <small>{meta}</small>
                        <i>
                          <b style={{ width: value.includes('%') ? value : '68%' }} />
                        </i>
                      </article>
                    ))}
                  </div>
                  <article className="admin-event-log">
                    <div className="admin-section-heading">
                      <div>
                        <h2>Nhật ký sự kiện thời gian thực</h2>
                        <p>Cập nhật trực tiếp từ hệ thống vận hành</p>
                      </div>
                      <span className="live-log">
                        <i /> LIVE
                      </span>
                    </div>
                    {[
                      ['14:32:01', 'Admin Alex Trần bắt đầu Stream Broadcast 3D #AUCT-109'],
                      ['14:31:45', 'Atomic Bid #9802 khớp lệnh thành công 128.500.000 ₫'],
                      ['14:30:12', 'Vận đơn GHN #VN88231 đã được bàn giao'],
                      ['14:28:55', 'PayOS Webhook xác nhận thanh toán đơn #991204'],
                      ['14:25:18', 'Seller Imperial Horology tải lên mô hình GLB mới'],
                    ].map(([time, event]) => (
                      <div key={time}>
                        <b>[{time}]</b>
                        <span>{event}</span>
                      </div>
                    ))}
                  </article>
                </section>
              )}

              {active === 'Cài đặt & Kiểm duyệt' && (
                <section className="admin-settings-grid">
                  <article className="admin-data-card">
                    <div className="admin-section-heading">
                      <div>
                        <h2>Kiểm duyệt nội dung</h2>
                        <p>Quy tắc tự động áp dụng toàn nền tảng</p>
                      </div>
                    </div>
                    {[
                      ['Bộ lọc từ khóa cấm', '18 từ vi phạm đang hoạt động', true],
                      ['Tự động khóa sản phẩm giả mạo', 'Dựa trên báo cáo và điểm rủi ro', true],
                      ['Yêu cầu duyệt mô hình 3D', 'Admin duyệt trước khi phát hành', true],
                      ['Cho phép Seller tự mở Live', 'Chỉ dành cho Seller hạng cao', false],
                    ].map(([name, desc, on]) => (
                      <div className="admin-setting-row" key={String(name)}>
                        <p>
                          <strong>{name}</strong>
                          <span>{desc}</span>
                        </p>
                        <button className={on ? 'on' : ''}>
                          <i />
                        </button>
                      </div>
                    ))}
                  </article>
                  <article className="admin-data-card">
                    <div className="admin-section-heading">
                      <div>
                        <h2>Cấu hình vận hành</h2>
                        <p>Thiết lập tài chính và phiên đấu giá</p>
                      </div>
                    </div>
                    <label>
                      Phí giao dịch bán lẻ
                      <input defaultValue="7%" />
                    </label>
                    <label>
                      Phí phiên đấu giá thành công
                      <input defaultValue="Theo danh mục" />
                    </label>
                    <label>
                      Thời gian gia hạn cuối phiên
                      <input defaultValue="5 phút" />
                    </label>
                    <label>
                      Thời hạn thanh toán người thắng
                      <input defaultValue="24 giờ" />
                    </label>
                    <Button className="full">Lưu cấu hình hệ thống</Button>
                  </article>
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function StaffInvitePage({ go }: { go: (page: Page) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [completed, setCompleted] = useState(false);
  return (
    <main className="staff-invite-page">
      <header className="login-header">
        <div className="login-container">
          <Logo onClick={() => go('home')} />
          <div className="login-header-actions">
            <button onClick={() => go('login')}>
              <ArrowLeft /> Về trang đăng nhập
            </button>
            <span />
            <div className="login-hotline">
              <HelpCircle />
              <p>
                <small>Hỗ trợ Staff</small>
                <strong>1900 8822</strong>
              </p>
            </div>
          </div>
        </div>
      </header>
      <section className="staff-invite-hero">
        <div className="login-container staff-invite-grid">
          <div className="staff-invite-story">
            <span className="login-eyebrow">● NEXUS TEAM INVITATION</span>
            <h1>
              Chào mừng bạn đến với
              <br />
              <em>đội ngũ NEXUS</em>
            </h1>
            <p>
              Admin đã mời bạn tham gia bộ phận Hỗ trợ khách hàng. Xác thực thông tin để kích hoạt
              tài khoản làm việc an toàn.
            </p>
            <div>
              <span>
                <Check /> Lời mời từ Admin Alex Trần
              </span>
              <span>
                <Check /> Vai trò: Support Staff
              </span>
              <span>
                <Check /> Liên kết có hiệu lực trong 24 giờ
              </span>
            </div>
          </div>
          <section className="staff-verify-card">
            {!completed ? (
              <>
                <div className="staff-verify-heading">
                  <span>
                    <ShieldCheck />
                  </span>
                  <div>
                    <h2>Xác nhận lời mời làm việc</h2>
                    <p>Kiểm tra thông tin và thiết lập mật khẩu của bạn</p>
                  </div>
                </div>
                <label>
                  Email nhận lời mời
                  <Input placeholder="staff.personal@gmail.com" type="email" icon={<Bell />} />
                </label>
                <div className="staff-name-grid">
                  <label>
                    Họ
                    <Input placeholder="Nguyễn" />
                  </label>
                  <label>
                    Tên đệm
                    <Input placeholder="Phương" />
                  </label>
                  <label>
                    Tên
                    <Input placeholder="Vy" />
                  </label>
                </div>
                <label>
                  Số điện thoại
                  <Input placeholder="0901 234 567" icon={<User />} />
                </label>
                <label>
                  Mật khẩu mới
                  <div className="password-field">
                    <Input
                      placeholder="Tối thiểu 8 ký tự"
                      type={showPassword ? 'text' : 'password'}
                      icon={<LockKeyhole />}
                    />
                    <button onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </label>
                <label>
                  Xác nhận lại mật khẩu
                  <Input
                    placeholder="Nhập lại mật khẩu mới"
                    type={showPassword ? 'text' : 'password'}
                    icon={<LockKeyhole />}
                  />
                </label>
                <div className="staff-password-rules">
                  <span>
                    <Check /> Tối thiểu 8 ký tự
                  </span>
                  <span>
                    <Check /> Có chữ hoa và số
                  </span>
                  <span>
                    <Check /> Hai mật khẩu trùng nhau
                  </span>
                </div>
                <label className="register-terms">
                  <input type="checkbox" defaultChecked />
                  <span>
                    Tôi xác nhận thông tin chính xác và đồng ý với{' '}
                    <b>Quy chế dành cho nhân sự NEXUS</b>.
                  </span>
                </label>
                <Button className="full" onClick={() => setCompleted(true)}>
                  Xác thực & kích hoạt tài khoản <ArrowRight />
                </Button>
              </>
            ) : (
              <div className="staff-account-success">
                <span>
                  <Check />
                </span>
                <h2>Tài khoản Staff đã được kích hoạt</h2>
                <p>Bạn có thể sử dụng email nền tảng và mật khẩu vừa tạo để đăng nhập.</p>
                <div>
                  <small>EMAIL ĐĂNG NHẬP DO NEXUS CẤP</small>
                  <strong>phuong.vy@nexus.vn</strong>
                  <button>Sao chép email</button>
                </div>
                <p className="staff-security-note">
                  <LockKeyhole /> Không chia sẻ thông tin đăng nhập với bất kỳ ai.
                </p>
                <Button className="full" onClick={() => go('login')}>
                  Đến trang đăng nhập <ArrowRight />
                </Button>
                <button className="staff-demo-link" onClick={() => go('staff')}>
                  Xem trước giao diện Staff
                </button>
              </div>
            )}
          </section>
        </div>
      </section>
      <section className="login-trust">
        <div className="login-container">
          <div>
            <ShieldCheck />
            <p>
              <strong>Tài khoản nội bộ</strong>
              <span>Phân quyền theo vai trò</span>
            </p>
          </div>
          <div>
            <LockKeyhole />
            <p>
              <strong>Xác thực hai lớp</strong>
              <span>Bảo vệ khi đăng nhập thiết bị mới</span>
            </p>
          </div>
          <div>
            <Bell />
            <p>
              <strong>Cảnh báo bảo mật</strong>
              <span>Thông báo hoạt động bất thường</span>
            </p>
          </div>
          <div>
            <HelpCircle />
            <p>
              <strong>IT Helpdesk</strong>
              <span>Hỗ trợ nhân sự 24/7</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function StaffDesk({ go }: { go: (page: Page) => void }) {
  const [active, setActive] = useState('Hộp thư trực tuyến');
  const staffMenu = [
    [ShoppingBag, 'Hộp thư trực tuyến', '12'],
    [Gavel, 'Khiếu nại & tranh chấp', '3'],
    [Box, 'Hỗ trợ đấu giá 3D', 'Live'],
    [List, 'Hướng dẫn & FAQ sàn', ''],
    [Star, 'Lịch sử & CSAT', ''],
    [TrendingUp, 'Hiệu suất cá nhân', ''],
  ] as const;
  const tickets = [
    [
      'TH',
      'Trần Hoài Nam',
      'VIP GOLD',
      'Cho mình hỏi hệ thống yêu cầu ký quỹ 10% tức là mình phải nạp 12.000.000đ...',
      '1m',
    ],
    ['TL', 'Lê Thùy Linh', 'BUYER', 'Hỏi về thời gian bưu tá GHN giao hàng đồng kiểm.', '3m'],
    ['HH', 'Hoàng Đức H', 'SELLER', 'Lỗi không tải được file GLB 48MB lên phòng đấu giá.', '7m'],
    ['VN', 'Victoria Nguyen', 'GLOBAL', 'Khách quốc tế hỏi tỷ giá chuyển đổi USD sang VND.', '12m'],
  ];
  return (
    <main className="staff-desk">
      <aside className="staff-sidebar">
        <div className="staff-brand">
          <Logo onClick={() => go('home')} />
          <b>STAFF</b>
          <small>Support Desk v2.4</small>
        </div>
        <p>NGHIỆP VỤ HỖ TRỢ</p>
        <nav>
          {staffMenu.map(([Icon, label, count]) => (
            <button
              key={label}
              className={active === label ? 'active' : ''}
              onClick={() => setActive(label)}
            >
              <Icon />
              <span>{label}</span>
              {count && <b>{count}</b>}
            </button>
          ))}
        </nav>
        <div className="staff-status">
          <span>
            <i /> WEBGL & ESCROW <b>Bình thường</b>
          </span>
          <span>
            Hết ca trực <b>Còn 3h 45m</b>
          </span>
          <small>NEXUS Staff Gateway　 SECURE SSL</small>
        </div>
      </aside>
      <section className="staff-workspace">
        <header className="staff-topbar">
          <div className="staff-search">
            <Search />
            <input placeholder="Tìm ticket, khách hàng hoặc mã đơn" />
          </div>
          <span className="staff-online">
            <i /> Trực tuyến sẵn sàng
          </span>
          <div className="staff-top-metric">
            <small>Đang chat</small>
            <strong>4</strong>
          </div>
          <div className="staff-top-metric">
            <small>Chờ phản hồi</small>
            <strong>8</strong>
          </div>
          <div className="staff-top-metric">
            <small>SLA</small>
            <strong>99,2%</strong>
          </div>
          <span className="staff-shift">
            <Clock3 /> Ca sáng: 08:00 – 16:00
          </span>
          <button className="seller-bell">
            <Bell />
            <i />
          </button>
          <div className="staff-user">
            <span>PV</span>
            <p>
              <strong>Nguyễn Phương Vy</strong>
              <small>Senior Specialist #ST-2041</small>
            </p>
          </div>
        </header>
        <div className="staff-content">
          <section className="staff-page-title">
            <div>
              <span>KÊNH NHÂN VIÊN　/　{active}</span>
              <h1>
                {active === 'Hộp thư trực tuyến'
                  ? 'Trung tâm tiếp nhận & giải đáp thắc mắc khách hàng'
                  : active}
              </h1>
            </div>
            <div>
              <span>CONSOLE ACTIVE</span>
              <b>Phiên làm việc #LIVE-VN204</b>
              <Button>
                <RotateCcw /> Đồng bộ Live
              </Button>
            </div>
          </section>
          {active === 'Hộp thư trực tuyến' ? (
            <>
              <section className="staff-kpis">
                {[
                  ['Hộp thoại đang xử lý', '4', 'phiên chat', ShoppingBag],
                  ['Hàng đợi chờ hỗ trợ', '8', 'khách hàng', Clock3],
                  ['Tỷ lệ hài lòng CSAT', '4,96', '/5.0', Star],
                  ['Tranh chấp cần can thiệp', '2', 'vụ việc', Gavel],
                ].map(([label, value, unit, Icon]) => (
                  <article key={String(label)}>
                    <div>
                      <span>{String(label)}</span>
                      <i>
                        <Icon />
                      </i>
                    </div>
                    <strong>
                      {String(value)} <small>{String(unit)}</small>
                    </strong>
                    <p>
                      {String(label).includes('Hộp')
                        ? 'SLA phản hồi TB: 38 giây'
                        : String(label).includes('Hàng')
                          ? 'Thời gian chờ TB: 1m 15s'
                          : String(label).includes('CSAT')
                            ? '142 lượt đánh giá hôm nay'
                            : 'PayOS Guard đang bảo vệ'}
                    </p>
                  </article>
                ))}
              </section>
              <section className="staff-console">
                <aside className="staff-ticket-list">
                  <div className="staff-console-heading">
                    <h2>Hàng đợi hỗ trợ</h2>
                    <span>12 ticket</span>
                  </div>
                  <div className="staff-ticket-tabs">
                    <button className="active">Tất cả (12)</button>
                    <button>Đang chat (4)</button>
                    <button>Chờ phản hồi</button>
                  </div>
                  <div className="staff-ticket-search">
                    <Search />
                    <input placeholder="Tìm khách hàng, SĐT, mã đơn" />
                  </div>
                  {tickets.map(([avatar, name, badge, preview, time], index) => (
                    <article key={name} className={index === 0 ? 'active' : ''}>
                      <span>{avatar}</span>
                      <div>
                        <div>
                          <strong>{name}</strong>
                          <b>{badge}</b>
                          <small>{time}</small>
                        </div>
                        <p>{preview}</p>
                        <label>
                          {index === 0
                            ? 'Đấu giá 3D'
                            : index === 1
                              ? 'Vận chuyển GHN'
                              : index === 2
                                ? 'Kỹ thuật WebGL'
                                : 'Thanh toán Escrow'}
                        </label>
                      </div>
                    </article>
                  ))}
                </aside>
                <section className="staff-chat">
                  <header>
                    <span>TH</span>
                    <div>
                      <h2>
                        Trần Hoài Nam <b>VIP GOLD</b>
                      </h2>
                      <p>
                        <i /> WebGL 3D Room Live　·　Ping: 18ms
                      </p>
                    </div>
                    <button>
                      <Bell />
                    </button>
                    <button>
                      <Tag />
                    </button>
                  </header>
                  <div className="staff-session">
                    PHIÊN BẮT ĐẦU LÚC 14:28:10 · MÃ #CHAT-9921-ROYAL
                  </div>
                  <div className="staff-messages">
                    <div className="customer-message">
                      <span>TH</span>
                      <p>
                        <strong>
                          Trần Hoài Nam <small>14:28</small>
                        </strong>
                        Chào bạn, mình đang muốn tham gia đấu giá chiếc đồng hồ AP Royal Oak tối
                        nay. Cho mình hỏi hệ thống yêu cầu ký quỹ 10% tức là mình phải nạp
                        12.000.000đ vào ví PayOS đúng không?
                      </p>
                    </div>
                    <div className="staff-message">
                      <span>Nguyễn Phương Vy · Support Desk</span>
                      <p>
                        Dạ em chào anh Nam! Em là Phương Vy từ đội ngũ Hỗ trợ NEXUS.
                        <br />
                        <br />
                        Mức ký quỹ được áp dụng theo điều kiện hiển thị riêng của phiên. Khoản tiền
                        hợp lệ sẽ được phong tỏa tạm thời qua PayOS Escrow và hoàn lại khi anh không
                        thắng phiên.
                      </p>
                    </div>
                    <div className="customer-message compact">
                      <span>TH</span>
                      <p>
                        Cảm ơn bạn, vậy khi phiên kết thúc khoản ký quỹ được hoàn trong bao lâu?
                      </p>
                    </div>
                  </div>
                  <div className="staff-reply">
                    <div>
                      <button>B</button>
                      <button>≡</button>
                      <button>⌕</button>
                      <span>
                        Mẫu trả lời:　<a>Quy trình ký quỹ</a>　<a>Chính sách hoàn tiền</a>
                      </span>
                    </div>
                    <textarea placeholder="Nhập câu trả lời cho khách hàng..." />
                    <footer>
                      <span>
                        <CheckCircle2 /> Chữ ký số: Nguyễn Phương Vy #ST-2041
                      </span>
                      <Button>
                        Gửi phản hồi <ArrowRight />
                      </Button>
                    </footer>
                  </div>
                </section>
                <aside className="staff-customer-panel">
                  <article>
                    <span>HỒ SƠ KHÁCH HÀNG</span>
                    <div className="staff-customer-name">
                      <b>TH</b>
                      <p>
                        <strong>Trần Hoài Nam</strong>
                        <small>nam.tran@pacific-capital.vn</small>
                        <small>+84 918 ••• 888</small>
                      </p>
                    </div>
                    <div className="staff-trust-score">
                      <span>
                        Điểm tín nhiệm giao dịch<strong>99,8%</strong>
                      </span>
                      <span>
                        Đấu giá thắng: <b>14 phiên</b>
                      </span>
                      <span>
                        Bùng cọc: <b>0 lần</b>
                      </span>
                    </div>
                    <div className="staff-wallet">
                      <Wallet />
                      <p>
                        Ví Escrow khả dụng<strong>45.000.000 ₫</strong>
                      </p>
                    </div>
                  </article>
                  <article className="staff-live-product">
                    <div>
                      <span>PHIÊN ĐẤU GIÁ TRỰC TIẾP</span>
                      <b>LIVE</b>
                    </div>
                    <img src={images.watch2} alt="Audemars Piguet Royal Oak" />
                    <h2>Audemars Piguet Royal Oak Chronograph 41mm</h2>
                    <p>Nhà đấu giá uy tín TechNova Chrono Hub</p>
                    <div>
                      <span>
                        Giá đặt cao nhất<strong>148.000.000 ₫</strong>
                      </span>
                      <span>
                        Thời gian còn<strong>15:37m</strong>
                      </span>
                    </div>
                    <Button variant="secondary">Viewport 3D</Button>
                  </article>
                  <article className="staff-quick-actions">
                    <h2>Hành động trợ lý viên</h2>
                    <button>
                      <RotateCcw /> Gửi xác thực hoàn cọc tự động
                    </button>
                    <button>
                      <HelpCircle /> Kích hoạt kỹ thuật WebGL
                    </button>
                    <button>
                      <Star /> Đóng ticket & khảo sát CSAT
                    </button>
                  </article>
                </aside>
              </section>
            </>
          ) : (
            <section className="staff-tool-page">
              <div>
                <h2>{active}</h2>
                <p>Dữ liệu nghiệp vụ được phân tách theo đúng chức năng đang chọn.</p>
              </div>
              {[
                ['Cần xử lý ngay', '03', 'Ưu tiên cao'],
                ['Đang theo dõi', '08', 'Trong SLA'],
                ['Đã hoàn tất hôm nay', '24', 'CSAT 4,96'],
              ].map(([label, value, meta]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{meta}</small>
                  <Button variant="secondary">Mở danh sách</Button>
                </article>
              ))}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function _AuthVisual() {
  return (
    <section className="auth-visual">
      <Logo onClick={() => window.scrollTo(0, 0)} />
      <div className="auth-intro">
        <span className="eyebrow light">CHÀO MỪNG ĐẾN NEXUS</span>
        <h1>
          Khám phá giá trị.
          <br />
          Kết nối đam mê.
        </h1>
        <p>Một tài khoản cho hành trình mua sắm và tham gia những phiên đấu giá tuyển chọn.</p>
        <div>
          <span>
            <Check /> Theo dõi sản phẩm yêu thích
          </span>
          <span>
            <Check /> Tham gia đấu giá trực tiếp
          </span>
          <span>
            <Check /> Quản lý giao dịch tập trung
          </span>
        </div>
      </div>
      <p className="photo-credit">Ảnh minh họa bởi Narek Hakobyan · Unsplash</p>
    </section>
  );
}

function Register({ go }: { go: (page: Page) => void }) {
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  return (
    <main className="nexus-register-page">
      <header className="login-header">
        <div className="login-container">
          <Logo onClick={() => go('home')} />
          <div className="login-header-actions">
            <button onClick={() => go('home')}>
              <ArrowLeft /> Quay lại trang chủ
            </button>
            <span />
            <div className="login-hotline">
              <HelpCircle />
              <p>
                <small>Hotline 24/7</small>
                <strong>1900 8822</strong>
              </p>
            </div>
            <button className="support-link">Trung tâm trợ giúp</button>
          </div>
        </div>
      </header>

      <section className="register-hero">
        <div className="login-container register-hero-grid">
          <div className="register-story">
            <span className="login-eyebrow">● NEXUS ONBOARDING</span>
            <h1>
              Khởi đầu cùng <em>NEXUS</em>
            </h1>
            <p>
              Gia nhập nền tảng đấu giá trực tuyến và mua sắm tài sản số 3D thế hệ mới chỉ trong vài
              bước đơn giản.
            </p>
            <div className="register-benefits">
              <div>
                <Box />
                <p>
                  <strong>Đấu giá 3D tương tác</strong>
                  <span>Chiêm ngưỡng và tương tác 360° với vật phẩm trước khi đặt giá.</span>
                </p>
              </div>
              <div>
                <ShieldCheck />
                <p>
                  <strong>Bảo chứng Escrow an toàn</strong>
                  <span>Ký quỹ minh bạch, hoàn tiền tự động theo điều kiện giao dịch.</span>
                </p>
              </div>
              <div>
                <Truck />
                <p>
                  <strong>Đồng kiểm & niêm phong</strong>
                  <span>Vận chuyển hỏa tốc, bảo hiểm giá trị vật phẩm khi giao nhận.</span>
                </p>
              </div>
            </div>
            <div className="register-security">
              <span>
                <LockKeyhole /> Mã hóa SSL 256-bit
              </span>
              <span>
                <ShieldCheck /> Bảo mật dữ liệu tuyệt đối
              </span>
            </div>
          </div>

          <section className="register-form-card">
            {step === 'form' && (
              <>
                <div className="register-heading">
                  <h2>Tạo tài khoản NEXUS</h2>
                  <p>Đăng ký nhanh chóng để khám phá các phiên đấu giá độc quyền</p>
                </div>
                <label>
                  Họ và tên <b>*</b>
                  <Input placeholder="VD: Nguyễn Văn An" icon={<User size={17} />} />
                </label>
                <label>
                  Email <b>*</b>
                  <div className="register-email-field">
                    <Input placeholder="email@domain.com" type="email" icon={<Bell size={17} />} />
                    <button onClick={() => setStep('otp')}>Gửi mã OTP</button>
                  </div>
                </label>
                <label>
                  Mật khẩu <b>*</b>
                  <Input
                    placeholder="Tối thiểu 6 ký tự"
                    type="password"
                    icon={<LockKeyhole size={17} />}
                  />
                </label>
                <label className="register-terms">
                  <input type="checkbox" defaultChecked />
                  <span>
                    Tôi đồng ý với <b>Điều khoản dịch vụ</b> và <b>Chính sách bảo mật</b> của NEXUS.
                  </span>
                </label>
                <Button className="full register-submit" onClick={() => setStep('otp')}>
                  Gửi mã OTP để tiếp tục <ArrowRight size={16} />
                </Button>
                <p className="register-switch">
                  Đã có tài khoản NEXUS? <button onClick={() => go('login')}>Đăng nhập ngay</button>
                </p>
              </>
            )}
            {step === 'otp' && (
              <>
                <button className="register-back" onClick={() => setStep('form')}>
                  <ArrowLeft /> Sửa thông tin đăng ký
                </button>
                <div className="register-otp-icon">
                  <Bell />
                </div>
                <div className="register-heading centered">
                  <span>BƯỚC 2 / 2</span>
                  <h2>Xác minh email</h2>
                  <p>
                    Mã OTP gồm 6 chữ số đã được gửi đến
                    <br />
                    <strong>email@domain.com</strong>
                  </p>
                </div>
                <label>
                  Mã xác thực OTP <b>*</b>
                </label>
                <div className="register-otp-row">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      maxLength={1}
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => {
                        const copy = [...otp];
                        copy[index] = e.target.value.replace(/\D/g, '');
                        setOtp(copy);
                      }}
                    />
                  ))}
                </div>
                <p className="register-otp-note">
                  Mã hết hạn sau 10 phút. Khi gửi lại, chỉ mã mới nhất có hiệu lực.
                </p>
                <Button className="full register-submit" onClick={() => setStep('success')}>
                  Xác minh & tạo tài khoản <ArrowRight size={16} />
                </Button>
                <p className="register-resend">
                  Chưa nhận được mã? Gửi lại sau <strong>00:42</strong>
                </p>
              </>
            )}
            {step === 'success' && (
              <div className="register-success">
                <span>
                  <Check />
                </span>
                <h2>Tạo tài khoản thành công!</h2>
                <p>Email của bạn đã được xác minh. Hãy đăng nhập để bắt đầu khám phá NEXUS.</p>
                <Button className="full register-submit" onClick={() => go('login')}>
                  Tiếp tục đăng nhập <ArrowRight size={16} />
                </Button>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="login-trust">
        <div className="login-container">
          <div>
            <ShieldCheck />
            <p>
              <strong>Bộ Công Thương</strong>
              <span>Đã thông báo & cấp phép sàn TMĐT</span>
            </p>
          </div>
          <div>
            <LockKeyhole />
            <p>
              <strong>Chuẩn PCI-DSS</strong>
              <span>Mã hóa dữ liệu thanh toán thẻ</span>
            </p>
          </div>
          <div>
            <Wallet />
            <p>
              <strong>PayOS & Stripe Verified</strong>
              <span>Ký quỹ cọc đấu giá tự động</span>
            </p>
          </div>
          <div>
            <Truck />
            <p>
              <strong>GHN Express & Viettel Post</strong>
              <span>Vận chuyển đồng kiểm niêm phong</span>
            </p>
          </div>
        </div>
      </section>

      <section className="login-footer">
        <div className="login-container login-footer-grid">
          <div>
            <strong>HỆ SINH THÁI 3D</strong>
            <span>Đấu giá 3D trực tuyến</span>
            <span>NEXUS Virtual Mall</span>
            <span>Mô hình không gian AR/VR</span>
            <span>Phòng đấu giá VIP Lounge</span>
          </div>
          <div>
            <strong>CHĂM SÓC KHÁCH HÀNG</strong>
            <span>Trung tâm trợ giúp 24/7</span>
            <span>Quy chế trả hàng & hoàn tiền</span>
            <span>Chính sách bảo chứng ký quỹ</span>
            <span>Liên hệ: support@nexus.vn</span>
          </div>
          <div>
            <strong>VỀ NEXUS PLATFORM</strong>
            <span>Giới thiệu NEXUS Inc.</span>
            <span>Kênh dành cho nhà bán lẻ</span>
            <span>Tuyển dụng kỹ sư 3D</span>
            <span>Chính sách quyền riêng tư</span>
          </div>
          <div>
            <strong>ĐỐI TÁC THANH TOÁN</strong>
            <div className="login-partners">
              <b>PayOS</b>
              <b>VISA</b>
              <b>Stripe</b>
              <b>Master</b>
              <b>Napas</b>
              <b>JCB</b>
            </div>
            <strong>KẾT NỐI MẠNG XÃ HỘI</strong>
            <span>Facebook　YouTube　LinkedIn</span>
          </div>
          <div>
            <strong>ỨNG DỤNG NEXUS 3D</strong>
            <div className="login-app">
              <Grid2X2 />
              <p>
                <b>App Store</b>
                <b>Google Play</b>
              </p>
            </div>
            <span>Hỗ trợ trải nghiệm AR không gian ba chiều.</span>
          </div>
        </div>
        <div className="login-container login-copyright">
          <span>© 2025 NEXUS E-Commerce & 3D Auction Inc.</span>
          <span>
            Bảo mật　•　Điều khoản　•　Sơ đồ sàn　•　<b>Việt Nam (VN)</b>
          </span>
        </div>
      </section>
    </main>
  );
}

function ForgotPassword({ go }: { go: (page: Page) => void }) {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [cooldown, setCooldown] = useState(60);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (step !== 'otp') return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [step]);
  return (
    <main className="forgot-page">
      <header className="login-header">
        <div className="login-container">
          <Logo onClick={() => go('home')} />
          <div className="login-header-actions">
            <button onClick={() => go('login')}>
              <ArrowLeft /> Quay lại đăng nhập
            </button>
            <span />
            <div className="login-hotline">
              <HelpCircle />
              <p>
                <small>Hỗ trợ tài khoản</small>
                <strong>1900 8822</strong>
              </p>
            </div>
            <button className="support-link">Trung tâm trợ giúp</button>
          </div>
        </div>
      </header>
      <section className="forgot-hero">
        <div className="login-container forgot-grid">
          <div className="forgot-story">
            <span className="login-eyebrow">● NEXUS ACCOUNT SECURITY</span>
            <h1>
              Khôi phục quyền truy cập
              <br />
              <em>an toàn và nhanh chóng</em>
            </h1>
            <p>
              Xác minh email đăng ký để tạo lại mật khẩu. NEXUS không bao giờ yêu cầu bạn cung cấp
              mật khẩu hoặc mã OTP cho nhân viên hỗ trợ.
            </p>
            <div>
              <span>
                <ShieldCheck />
                <p>
                  <strong>Mã xác minh một lần</strong>
                  <small>OTP có hiệu lực trong 10 phút</small>
                </p>
              </span>
              <span>
                <LockKeyhole />
                <p>
                  <strong>Mật khẩu được mã hóa</strong>
                  <small>Không lưu trữ mật khẩu ở dạng văn bản</small>
                </p>
              </span>
              <span>
                <Bell />
                <p>
                  <strong>Cảnh báo bảo mật</strong>
                  <small>Email thông báo sau khi mật khẩu thay đổi</small>
                </p>
              </span>
            </div>
          </div>
          <section className="forgot-card">
            {step === 'email' && (
              <>
                <div className="forgot-card-icon">
                  <LockKeyhole />
                </div>
                <div className="forgot-heading">
                  <span>BƯỚC 1 / 2</span>
                  <h2>Quên mật khẩu?</h2>
                  <p>Nhập email đã đăng ký để nhận mã xác minh.</p>
                </div>
                <label>
                  Email tài khoản <b>*</b>
                  <Input placeholder="email@domain.com" type="email" icon={<Bell />} />
                </label>
                <div className="forgot-alert">
                  <ShieldCheck />
                  <span>Mã OTP chỉ được gửi sau khi yêu cầu thành công.</span>
                </div>
                <Button
                  className="full forgot-submit"
                  onClick={() => {
                    setCooldown(60);
                    setStep('otp');
                  }}
                >
                  Gửi mã xác minh <ArrowRight />
                </Button>
                <button className="forgot-back-login" onClick={() => go('login')}>
                  <ArrowLeft /> Trở lại đăng nhập
                </button>
              </>
            )}
            {step === 'otp' && (
              <>
                <button className="register-back" onClick={() => setStep('email')}>
                  <ArrowLeft /> Sửa địa chỉ email
                </button>
                <div className="forgot-heading centered">
                  <span>BƯỚC 2 / 2</span>
                  <h2>Xác minh & tạo mật khẩu mới</h2>
                  <p>
                    Nhập mã OTP đã gửi đến <strong>email@domain.com</strong>
                  </p>
                </div>
                <label>
                  Mã xác minh OTP <b>*</b>
                </label>
                <div className="register-otp-row">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      maxLength={1}
                      inputMode="numeric"
                      value={digit}
                      onChange={(event) => {
                        const copy = [...otp];
                        copy[index] = event.target.value.replace(/\D/g, '');
                        setOtp(copy);
                      }}
                    />
                  ))}
                </div>
                <label>
                  Mật khẩu mới <b>*</b>
                  <div className="password-field">
                    <Input
                      placeholder="Tối thiểu 8 ký tự"
                      type={showPassword ? 'text' : 'password'}
                      icon={<LockKeyhole />}
                    />
                    <button onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </label>
                <label>
                  Xác nhận mật khẩu mới <b>*</b>
                  <Input
                    placeholder="Nhập lại mật khẩu mới"
                    type={showPassword ? 'text' : 'password'}
                    icon={<LockKeyhole />}
                  />
                </label>
                <div className="staff-password-rules">
                  <span>
                    <Check /> Tối thiểu 8 ký tự
                  </span>
                  <span>
                    <Check /> Có chữ hoa và số
                  </span>
                  <span>
                    <Check /> Hai mật khẩu trùng nhau
                  </span>
                </div>
                <Button className="full forgot-submit" onClick={() => setStep('success')}>
                  Xác nhận mật khẩu mới <ArrowRight />
                </Button>
                <p className="forgot-resend">
                  {cooldown > 0 ? (
                    <>
                      Gửi lại mã sau <strong>00:{String(cooldown).padStart(2, '0')}</strong>
                    </>
                  ) : (
                    <button onClick={() => setCooldown(60)}>Gửi lại mã OTP</button>
                  )}
                </p>
                <p className="forgot-expiry">
                  Mã hết hạn sau 10 phút. Khi gửi lại, chỉ mã mới nhất có hiệu lực.
                </p>
              </>
            )}
            {step === 'success' && (
              <div className="forgot-success">
                <span>
                  <Check />
                </span>
                <h2>Đổi mật khẩu thành công</h2>
                <p>
                  Mật khẩu của bạn đã được cập nhật. Bạn có thể sử dụng mật khẩu mới để đăng nhập
                  vào NEXUS.
                </p>
                <div>
                  <ShieldCheck />
                  <span>Một email xác nhận thay đổi đã được gửi đến tài khoản của bạn.</span>
                </div>
                <Button className="full forgot-submit" onClick={() => go('login')}>
                  Đăng nhập ngay <ArrowRight />
                </Button>
              </div>
            )}
          </section>
        </div>
      </section>
      <section className="login-trust">
        <div className="login-container">
          <div>
            <ShieldCheck />
            <p>
              <strong>Bảo vệ tài khoản</strong>
              <span>Xác minh qua email đăng ký</span>
            </p>
          </div>
          <div>
            <LockKeyhole />
            <p>
              <strong>Chuẩn PCI-DSS</strong>
              <span>Mã hóa dữ liệu nhạy cảm</span>
            </p>
          </div>
          <div>
            <Bell />
            <p>
              <strong>Thông báo thay đổi</strong>
              <span>Cảnh báo hoạt động bảo mật</span>
            </p>
          </div>
          <div>
            <HelpCircle />
            <p>
              <strong>Hỗ trợ 24/7</strong>
              <span>Liên hệ khi phát hiện bất thường</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Login({ go }: { go: (page: Page) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="nexus-login-page">
      <header className="login-header">
        <div className="login-container">
          <Logo onClick={() => go('home')} />
          <div className="login-header-actions">
            <button onClick={() => go('home')}>
              <ArrowLeft /> Quay lại trang chủ
            </button>
            <span />
            <div className="login-hotline">
              <HelpCircle />
              <p>
                <small>Hotline 24/7</small>
                <strong>1900 8822</strong>
              </p>
            </div>
            <button className="support-link">Trung tâm trợ giúp</button>
          </div>
        </div>
      </header>

      <section className="login-hero">
        <div className="login-container login-hero-grid">
          <div className="login-story">
            <span className="login-eyebrow">● NEXUS PLATFORM 4.0 · CÔNG NGHỆ ĐỘC QUYỀN</span>
            <h1>
              Trải nghiệm mua sắm &<br />
              <em>đấu giá 3D đỉnh cao</em>
            </h1>
            <p>
              Môi trường giao dịch tài sản số và thương mại cao cấp với tương tác mô hình không gian
              ba chiều, chốt phiên thời gian thực minh bạch tuyệt đối.
            </p>
            <article className="login-auction-preview">
              <div className="login-preview-visual">
                <img src={images.watch2} alt="Đồng hồ cơ Skeleton Chrono Precision 3D" />
                <span>
                  <RotateCcw /> Xoay 360°
                </span>
                <b>LIVE BID</b>
                <small>
                  Giá hiện tại <strong>128.500.000 ₫</strong>
                </small>
              </div>
              <div className="login-preview-info">
                <div>
                  <span>PHIÊN VIP ĐANG DIỄN RA</span>
                  <small>MÃ: #NX-9982</small>
                </div>
                <h2>Đồng hồ cơ Skeleton Chrono Precision 3D</h2>
                <p>
                  Đấu giá công nghệ phòng chống sniping tự động gia hạn, cam kết kiểm định và niêm
                  phong vật lý.
                </p>
                <div className="preview-stats">
                  <span>
                    LƯỢT TRẢ GIÁ <b>42 bids</b>
                  </span>
                  <span>
                    CÒN LẠI <b>04:18m</b>
                  </span>
                  <span>
                    BẢO CHỨNG <b>PayOS Escrow</b>
                  </span>
                </div>
                <small>
                  <ShieldCheck /> Đăng nhập để tham gia đấu giá và tương tác 3D ngay lập tức
                </small>
              </div>
            </article>
            <div className="login-feature-grid">
              <div>
                <Box />
                <p>
                  <strong>Mô hình 3D xoay 360°</strong>
                  <span>Khảo sát chi tiết góc cạnh chân thực</span>
                </p>
              </div>
              <div>
                <TimerReset />
                <p>
                  <strong>Anti-Sniping Realtime</strong>
                  <span>Chống cướp phiên tích tắc</span>
                </p>
              </div>
              <div>
                <ShieldCheck />
                <p>
                  <strong>Bảo chứng ký quỹ</strong>
                  <span>Điều kiện rõ ràng theo từng phiên</span>
                </p>
              </div>
            </div>
          </div>

          <section className="login-form-card">
            <i className="login-card-accent" />
            <h2>Đăng nhập NEXUS</h2>
            <label>
              Email
              <Input placeholder="user@nexus.vn" type="email" icon={<User size={17} />} />
            </label>
            <label>
              <span>
                Mật khẩu <button onClick={() => go('forgot-password')}>Quên mật khẩu?</button>
              </span>
              <div className="password-field">
                <Input
                  placeholder="Nhập mật khẩu an toàn của bạn"
                  type={showPassword ? 'text' : 'password'}
                  icon={<LockKeyhole size={17} />}
                />
                <button onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            <div className="login-options">
              <label>
                <input type="checkbox" defaultChecked /> Duy trì đăng nhập
              </label>
              <span>
                <LockKeyhole /> Mã hóa SSL 256-bit
              </span>
            </div>
            <Button className="full login-submit">
              ĐĂNG NHẬP <ArrowRight />
            </Button>
            <div className="login-divider">
              <span>HOẶC TIẾP TỤC VỚI</span>
            </div>
            <div className="social-login">
              <button>
                <b>G</b> Google
              </button>
              <button title="Luồng OAuth đang được hoàn thiện">
                <b>f</b> Facebook
              </button>
            </div>
            <p className="login-register">
              Bạn mới tham gia NEXUS?{' '}
              <button onClick={() => go('register')}>Tạo tài khoản ngay</button>
            </p>
            <p className="login-admin-access">
              <ShieldCheck /> Bạn thuộc đội ngũ vận hành?{' '}
              <button onClick={() => go('admin')}>Đăng nhập với vai trò Admin</button>
            </p>
            <p className="login-admin-access staff-access">
              <User /> Bạn là nhân viên NEXUS?{' '}
              <button onClick={() => go('staff')}>Đăng nhập với vai trò Staff</button>
            </p>
            <div className="login-voucher">
              <Tag /> Tặng ngay Voucher 500.000đ trải nghiệm đấu giá 3D
            </div>
          </section>
        </div>
      </section>

      <section className="login-trust">
        <div className="login-container">
          <div>
            <ShieldCheck />
            <p>
              <strong>Bộ Công Thương</strong>
              <span>Đã thông báo & cấp phép sàn TMĐT</span>
            </p>
          </div>
          <div>
            <LockKeyhole />
            <p>
              <strong>Chuẩn PCI-DSS</strong>
              <span>Mã hóa dữ liệu thanh toán thẻ</span>
            </p>
          </div>
          <div>
            <Wallet />
            <p>
              <strong>PayOS & Stripe Verified</strong>
              <span>Ký quỹ cọc đấu giá tự động</span>
            </p>
          </div>
          <div>
            <Truck />
            <p>
              <strong>GHN Express & Viettel Post</strong>
              <span>Vận chuyển đồng kiểm niêm phong</span>
            </p>
          </div>
        </div>
      </section>

      <section className="login-footer">
        <div className="login-container login-footer-grid">
          <div>
            <strong>HỆ SINH THÁI 3D</strong>
            <span>Đấu giá 3D trực tuyến</span>
            <span>NEXUS Virtual Mall</span>
            <span>Mô hình không gian AR/VR</span>
            <span>Phòng đấu giá VIP Lounge</span>
          </div>
          <div>
            <strong>CHĂM SÓC KHÁCH HÀNG</strong>
            <span>Trung tâm trợ giúp 24/7</span>
            <span>Quy chế trả hàng & hoàn tiền</span>
            <span>Chính sách bảo chứng ký quỹ</span>
            <span>Liên hệ: support@nexus.vn</span>
          </div>
          <div>
            <strong>VỀ NEXUS PLATFORM</strong>
            <span>Giới thiệu NEXUS Inc.</span>
            <span>Kênh dành cho nhà bán lẻ</span>
            <span>Tuyển dụng kỹ sư 3D</span>
            <span>Chính sách quyền riêng tư</span>
          </div>
          <div>
            <strong>ĐỐI TÁC THANH TOÁN</strong>
            <div className="login-partners">
              <b>PayOS</b>
              <b>VISA</b>
              <b>Stripe</b>
              <b>Master</b>
              <b>Napas</b>
              <b>JCB</b>
            </div>
            <strong>KẾT NỐI MẠNG XÃ HỘI</strong>
            <span>Facebook　YouTube　LinkedIn</span>
          </div>
          <div>
            <strong>ỨNG DỤNG NEXUS 3D</strong>
            <div className="login-app">
              <Grid2X2 />
              <p>
                <b>App Store</b>
                <b>Google Play</b>
              </p>
            </div>
            <span>Hỗ trợ trải nghiệm AR không gian ba chiều.</span>
          </div>
        </div>
        <div className="login-container login-copyright">
          <span>© 2025 NEXUS E-Commerce & 3D Auction Inc.</span>
          <span>
            Bảo mật　•　Điều khoản　•　Sơ đồ sàn　•　<b>Việt Nam (VN)</b>
          </span>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('admin');
  const [searchQuery, setSearchQuery] = useState('đồng hồ cao cấp');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const go = (next: Page) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const search = (query: string) => {
    setSearchQuery(query);
    go('search');
  };
  const addToCart = (product: (typeof homeProducts)[number]) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.title === product.title);
      return existing
        ? current.map((item) =>
            item.product.title === product.title ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...current, { product, quantity: 1 }];
    });
  };
  const updateQuantity = (title: string, change: number) => {
    setCart((current) =>
      current.map((item) =>
        item.product.title === title
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item,
      ),
    );
  };
  const removeFromCart = (title: string) =>
    setCart((current) => current.filter((item) => item.product.title !== title));
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (page === 'search') return <SearchPage go={go} query={searchQuery} />;
  if (page === 'auction-list')
    return <AuctionListPage go={go} onSearch={search} cartCount={cartCount} />;
  if (page === 'auction') return <AuctionPage go={go} />;
  if (page === 'seller') return <SellerCenter go={go} />;
  if (page === 'admin') return <AdminPanel go={go} />;
  if (page === 'staff-invite') return <StaffInvitePage go={go} />;
  if (page === 'staff') return <StaffDesk go={go} />;
  if (page === 'cart')
    return (
      <CartPage
        go={go}
        onSearch={search}
        cart={cart}
        onAdd={addToCart}
        onQuantity={updateQuantity}
        onRemove={removeFromCart}
      />
    );
  if (page === 'register') return <Register go={go} />;
  if (page === 'forgot-password') return <ForgotPassword go={go} />;
  if (page === 'login') return <Login go={go} />;
  return <Home go={go} onSearch={search} onAddToCart={addToCart} cartCount={cartCount} />;
}
