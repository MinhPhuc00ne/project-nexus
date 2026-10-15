import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gavel,
  Grid2X2,
  Menu,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  User,
  Wallet,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import './AdminDashboard.css';

const images = {
  watch1:
    'https://images.unsplash.com/photo-1670177257750-9b47927f68eb?auto=format&fit=crop&w=900&q=85',
  watch2:
    'https://images.unsplash.com/photo-1633869699811-cd4f63049b36?auto=format&fit=crop&w=900&q=85',
  decor:
    'https://images.unsplash.com/photo-1723902499495-e31fda518516?auto=format&fit=crop&w=900&q=85',
};

function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
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
  onChange?: (val: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="input-wrap">
      {icon}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState('Tổng quan');
  const [inviteSent, setInviteSent] = useState(false);
  const [dateFrom, setDateFrom] = useState('2026-06-01');
  const [dateTo, setDateTo] = useState('2026-06-24');
  const [userSearch, setUserSearch] = useState('');
  const [settingFilter, setSettingFilter] = useState({
    keywordFilter: true,
    autoBlockFake: true,
    require3DReview: true,
    allowSellerLive: false,
  });

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

  const initialUsers = [
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
    ['Nguyễn Văn An', 'admin@nexus.com', 'Admin', 'Đang hoạt động', 'Quản trị viên tối cao'],
  ];
  const [usersList, setUsersList] = useState(initialUsers);

  const filteredUsers = usersList.filter(
    (u) =>
      u[0].toLowerCase().includes(userSearch.toLowerCase()) ||
      u[1].toLowerCase().includes(userSearch.toLowerCase()) ||
      u[2].toLowerCase().includes(userSearch.toLowerCase()),
  );

  const toggleUserStatus = (email: string) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u[1] === email) {
          const newStatus = u[3] === 'Đã khóa' ? 'Đang hoạt động' : 'Đã khóa';
          return [u[0], u[1], u[2], newStatus, u[4]];
        }
        return u;
      }),
    );
  };

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
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-logo-row">
            <img
              src="/images/NEXUS.png"
              alt="NEXUS"
              className="admin-logo-img"
              onClick={() => navigate('/')}
            />
            <span className="admin-brand-title">NEXUS</span>
          </div>
          <span>ADMIN PANEL 4.0</span>
        </div>

        <button className="admin-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          <span>Quay lại Trang Chủ</span>
        </button>

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

      {/* Main Workspace */}
      <section className="admin-workspace">
        <header className="admin-topbar">
          <button className="admin-mobile-menu">
            <Menu size={20} />
          </button>
          <span className="admin-panel-pill">
            <ShieldCheck /> NEXUS SUPER ADMIN
          </span>
          <span className="admin-server">
            <i /> Cụm máy chủ: 99,98%
          </span>

          <div className="admin-top-spacer" />

          <button
            onClick={() => navigate('/staff')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors mr-2"
          >
            <ExternalLink size={14} />
            <span>Duyệt Hồ Sơ Live (Database)</span>
          </button>

          <button className="seller-bell" title="Thông báo hệ thống">
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
                    <i /> WebSocket Engine: <strong>12ms</strong> · PayOS & Stripe:{' '}
                    <strong>Sẵn sàng</strong> · WebGL Cluster: <strong>6 nodes online</strong>
                  </p>
                </div>
                <div>
                  <Button onClick={() => setActive('Studio phát trực tiếp')}>
                    <Radio size={16} /> Bắt đầu phát trực tiếp 3D
                  </Button>
                  <Button variant="secondary" onClick={() => setActive('Quản lý đấu giá 3D')}>
                    <Plus size={16} /> Tạo phiên đấu giá 3D
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setInviteSent(false);
                      setActive('Thêm Staff');
                    }}
                  >
                    <User size={16} /> Thêm Staff
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
                  [
                    'Người dùng & phân quyền',
                    `${usersList.length * 7680} users`,
                    '+280 tài khoản trong 24 giờ',
                    User,
                  ],
                ].map(([label, value, meta, Icon]) => {
                  const LucideIcon = Icon as LucideIcon;
                  return (
                    <article key={String(label)}>
                      <div>
                        <span>{String(label)}</span>
                        <i>
                          <LucideIcon />
                        </i>
                      </div>
                      <strong>{String(value)}</strong>
                      <p>{String(meta)}</p>
                    </article>
                  );
                })}
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
                            onChange={(e) => setDateFrom(e.target.value)}
                          />
                        </label>
                        <span>→</span>
                        <label>
                          Đến ngày
                          <input
                            type="date"
                            value={dateTo}
                            min={dateFrom}
                            onChange={(e) => setDateTo(e.target.value)}
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
                      TỔNG DOANH THU GIAI ĐOẠN
                      <strong>438.500.000 ₫</strong>
                    </span>
                    <span>
                      DOANH THU ĐẤU GIÁ 3D
                      <strong>226.200.000 ₫</strong>
                    </span>
                    <span>
                      DOANH THU ĐƠN THƯỜNG
                      <strong>212.300.000 ₫</strong>
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
                      <Button onClick={() => setActive('Phê duyệt nâng cấp Seller')}>
                        Phê duyệt
                      </Button>
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
                        <RotateCcw size={16} />
                      </span>
                      <p>
                        <strong>
                          {item[0]} · {item[1]}
                        </strong>
                        <small>{item[3]}</small>
                      </p>
                      <Button onClick={() => setActive('Phê duyệt hoàn tiền')}>Kiểm tra</Button>
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
                  <Plus size={16} />{' '}
                  {active.includes('Đấu giá')
                    ? 'Tạo phiên mới'
                    : active.includes('người dùng')
                      ? 'Thêm tài khoản'
                      : active.includes('Event')
                        ? 'Xuất Event Log'
                        : 'Tạo tác vụ'}
                </Button>
              </section>

              {/* Tab: Thêm Staff */}
              {active === 'Thêm Staff' && (
                <section className="admin-staff-create">
                  {!inviteSent ? (
                    <article className="admin-staff-form">
                      <div className="admin-section-heading">
                        <div>
                          <h2>Tạo lời mời nhân sự mới</h2>
                          <p>Staff sẽ nhận email để xác thực thông tin và tự thiết lập mật khẩu.</p>
                        </div>
                        <span className="safe-badge">Quyền Super Admin</span>
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
                            icon={<Bell size={16} />}
                          />
                        </label>
                        <label>
                          Số điện thoại <b>*</b>
                          <Input placeholder="0901 234 567" icon={<User size={16} />} />
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
                            <option value="support">Hỗ trợ khách hàng & Khiếu nại</option>
                            <option value="refund">Thẩm định hoàn tiền & Escrow</option>
                            <option value="auction">Vận hành phòng đấu giá 3D</option>
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
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked />
                          <span>Bắt buộc xác thực 2 lớp khi đăng nhập</span>
                        </label>
                      </div>
                      <Button className="full" onClick={() => setInviteSent(true)}>
                        <Bell size={16} /> Tạo tài khoản & gửi email mời
                      </Button>
                    </article>
                  ) : (
                    <article className="admin-invite-success">
                      <span>
                        <Check size={32} />
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
                      <Button onClick={() => navigate('/staff')}>
                        Mở Bàn làm việc Staff <ArrowRight size={16} />
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

              {/* Tab: Quản lý đấu giá 3D */}
              {active === 'Quản lý đấu giá 3D' && (
                <section className="admin-data-card">
                  <div className="admin-section-heading">
                    <div>
                      <h2>Lịch điều hành phiên đấu giá</h2>
                      <p>Kiểm tra mô hình, mức giá và lịch phát sóng</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded bg-blue-50 text-blue-700 font-bold text-xs">
                        Tất cả (8)
                      </button>
                      <button className="px-3 py-1.5 rounded bg-slate-100 text-slate-600 text-xs">
                        Đang Live (3)
                      </button>
                      <button className="px-3 py-1.5 rounded bg-slate-100 text-slate-600 text-xs">
                        Chờ duyệt (5)
                      </button>
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
                        <Button variant="secondary" onClick={() => navigate('/auction')}>
                          Xem 3D
                        </Button>
                        <Button>Duyệt lịch</Button>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Tab: Studio phát trực tiếp */}
              {active === 'Studio phát trực tiếp' && (
                <section className="admin-live-grid">
                  {auctions.map((item, index) => (
                    <article key={item.name}>
                      <div>
                        <img src={item.image} alt={item.name} />
                        <span>
                          <Radio size={14} /> {index === 0 ? 'ĐANG PHÁT' : 'PHÒNG CHỜ'}
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
                          Độ trễ
                          <b>{12 + index * 5}ms</b>
                        </span>
                      </div>
                      <Button className="full" onClick={() => navigate('/auction')}>
                        {index === 0 ? 'Mở bàn điều khiển Live' : 'Kiểm tra trước phát sóng'}
                      </Button>
                    </article>
                  ))}
                </section>
              )}

              {/* Tab: Quản trị người dùng */}
              {active === 'Quản trị người dùng' && (
                <section className="admin-data-card">
                  <div className="admin-list-toolbar">
                    <div>
                      <Search size={16} />
                      <input
                        placeholder="Tìm theo email, họ tên hoặc vai trò..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    <button>
                      Tất cả vai trò <ChevronDown size={14} />
                    </button>
                    <button>
                      Trạng thái <ChevronDown size={14} />
                    </button>
                  </div>
                  <div className="admin-table-head users">
                    <span>NGƯỜI DÙNG</span>
                    <span>VAI TRÒ</span>
                    <span>TRẠNG THÁI</span>
                    <span>GHI CHÚ QUẢN TRỊ</span>
                    <span>THAO TÁC</span>
                  </div>
                  {filteredUsers.map(([name, email, role, status, note]) => (
                    <div className="admin-user-row" key={email}>
                      <div>
                        <span>{name.slice(0, 1)}</span>
                        <p>
                          <strong>{name}</strong>
                          <small>{email}</small>
                        </p>
                      </div>
                      <b>{role}</b>
                      <span
                        className={
                          status === 'Đã khóa'
                            ? 'text-red-600 font-bold'
                            : 'text-emerald-600 font-medium'
                        }
                      >
                        {status}
                      </span>
                      <p>{note}</p>
                      <div>
                        <Button
                          variant={status === 'Đã khóa' ? 'primary' : 'danger'}
                          onClick={() => toggleUserStatus(email)}
                        >
                          {status === 'Đã khóa' ? 'Mở khóa' : 'Khóa'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Tab: Phê duyệt nâng cấp Seller */}
              {active === 'Phê duyệt nâng cấp Seller' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-indigo-900 text-sm">
                        Kết nối cơ sở dữ liệu thời gian thực
                      </h3>
                      <p className="text-xs text-indigo-700">
                        Bạn có thể duyệt hồ sơ seller thực tế từ Neon PostgreSQL qua bàn làm việc
                        Staff.
                      </p>
                    </div>
                    <Button onClick={() => navigate('/staff')}>
                      <ExternalLink size={14} /> Mở Trang Duyệt Staff Live
                    </Button>
                  </div>

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
                </div>
              )}

              {/* Tab: Phê duyệt hoàn tiền */}
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
                        <b>Bằng chứng: </b>
                        <p>{evidence}</p>
                        <b>Đề xuất: </b>
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

              {/* Tab: Tài chính & Kỹ thuật */}
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
                      <span>Ví NEXUS Escrow</span>
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

              {/* Tab: Giám sát hệ thống & Event Log */}
              {active === 'Giám sát hệ thống & Event Log' && (
                <section className="admin-monitor-grid">
                  <div className="admin-health-grid">
                    {[
                      ['CPU Cluster', '18%', '6 nodes active'],
                      ['RAM sử dụng', '42%', 'Ổn định'],
                      ['WebSocket Ping', '12ms', '4.280 kết nối'],
                      ['Tỷ lệ lỗi', '0,02%', 'Trong ngưỡng an toàn'],
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
                        <i /> LIVE STREAM
                      </span>
                    </div>
                    {[
                      ['14:32:01', 'Admin Alex Trần bắt đầu Stream Broadcast 3D #AUCT-109'],
                      ['14:31:45', 'Atomic Bid #9802 khớp lệnh thành công 128.500.000 ₫'],
                      ['14:30:12', 'Vận đơn GHN Express #VN88231 đã được bàn giao'],
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

              {/* Tab: Cài đặt & Kiểm duyệt */}
              {active === 'Cài đặt & Kiểm duyệt' && (
                <section className="admin-settings-grid">
                  <article className="admin-data-card">
                    <div className="admin-section-heading">
                      <div>
                        <h2>Kiểm duyệt nội dung tự động</h2>
                        <p>Quy tắc tự động áp dụng toàn nền tảng</p>
                      </div>
                    </div>
                    {[
                      [
                        'Bộ lọc từ khóa cấm',
                        '18 từ vi phạm đang hoạt động',
                        settingFilter.keywordFilter,
                        () => setSettingFilter((p) => ({ ...p, keywordFilter: !p.keywordFilter })),
                      ],
                      [
                        'Tự động khóa sản phẩm giả mạo',
                        'Dựa trên báo cáo và điểm rủi ro',
                        settingFilter.autoBlockFake,
                        () => setSettingFilter((p) => ({ ...p, autoBlockFake: !p.autoBlockFake })),
                      ],
                      [
                        'Yêu cầu duyệt mô hình 3D',
                        'Admin duyệt trước khi phát hành',
                        settingFilter.require3DReview,
                        () =>
                          setSettingFilter((p) => ({ ...p, require3DReview: !p.require3DReview })),
                      ],
                      [
                        'Cho phép Seller tự mở Live',
                        'Chỉ dành cho Seller hạng cao',
                        settingFilter.allowSellerLive,
                        () =>
                          setSettingFilter((p) => ({
                            ...p,
                            allowSellerLive: !p.allowSellerLive,
                          })),
                      ],
                    ].map(([name, desc, on, toggle]) => (
                      <div className="admin-setting-row" key={String(name)}>
                        <p>
                          <strong>{String(name)}</strong>
                          <span>{String(desc)}</span>
                        </p>
                        <button
                          className={on ? 'on' : ''}
                          onClick={toggle as () => void}
                          aria-label={`Bật tắt ${String(name)}`}
                        >
                          <i />
                        </button>
                      </div>
                    ))}
                  </article>

                  <article className="admin-data-card">
                    <div className="admin-section-heading">
                      <div>
                        <h2>Cấu hình vận hành sàn</h2>
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
