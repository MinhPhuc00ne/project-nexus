import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  forgotPassword,
  login,
  resetPassword,
  saveAuthSession,
  startGoogleLogin,
} from '../../services/auth';
import Popup from '../../components/popup/Popup';
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
  Gift,
  Rotate3d,
  ShieldAlert,
  SquareCheckBig,
  User,
  KeyRound,
  Mail,
} from 'lucide-react';
import Header from '../../components/Header/Header';
import './Login.css';
import Footer from '../../components/footer/footer';

// Google "G" brand icon
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const Login: React.FC = () => {
  const [email, setEmail] = useState(() => {
    try {
      const verifiedEmail = sessionStorage.getItem('nexus:verified-email') || '';
      return verifiedEmail;
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(() =>
    new URLSearchParams(window.location.search).get('verified') === '1'
      ? 'Email đã được xác thực. Vui lòng đăng nhập.'
      : '',
  );
  const [failed, setFailed] = useState(false);
  const requestInFlight = useRef(false);

  // Quên mật khẩu modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotPending, setForgotPending] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  async function handleSendForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    const targetEmail = forgotEmail.trim();
    if (!targetEmail) {
      setForgotError('Vui lòng nhập địa chỉ email.');
      return;
    }
    setForgotPending(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await forgotPassword(targetEmail);
      if (res.devOtpCode) {
        setForgotCode(res.devOtpCode);
        setForgotSuccess(
          `${res.message || 'Mã OTP đã được tạo.'} [Đã tự động điền mã OTP: ${res.devOtpCode}]`,
        );
      } else {
        setForgotSuccess(res.message || 'Mã OTP đặt lại mật khẩu đã được gửi đến email của bạn.');
      }
      setForgotStep(2);
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Không thể gửi mã xác thực.');
    } finally {
      setForgotPending(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotCode.trim()) {
      setForgotError('Vui lòng nhập mã OTP.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    setForgotPending(true);
    setForgotError('');
    try {
      const res = await resetPassword(forgotEmail.trim(), forgotCode.trim(), forgotNewPassword);
      setShowForgotModal(false);
      setEmail(forgotEmail.trim());
      setPassword('');
      setFeedback(
        res.message || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.',
      );
      setFailed(false);
      setForgotStep(1);
      setForgotCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotSuccess('');
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại.');
    } finally {
      setForgotPending(false);
    }
  }
  useEffect(() => {
    try {
      sessionStorage.removeItem('nexus:verified-email');
    } catch {
      /* Storage may be disabled. */
    }
    if (new URLSearchParams(window.location.search).has('verified')) {
      window.history.replaceState(null, '', '/login');
    }
  }, []);
  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(true);
    setFeedback('');
    setFailed(false);
    try {
      const result = await login(email.trim(), password);
      saveAuthSession(result.user, result.accessToken, result.refreshToken);
      setFeedback(result.message + ' Xin chào ' + result.user.fullName + '.');
      if (result.user.role === 'ADMIN') {
        window.location.assign('/admin');
      } else if (result.user.role === 'SUPPORT_STAFF') {
        window.location.assign('/staff');
      } else {
        window.location.assign('/');
      }
    } catch (error: unknown) {
      setFailed(true);
      setFeedback(error instanceof Error ? error.message : 'Đăng nhập thất bại.');
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="nexus-login-page">
      {/* 1. SHARED HEADER / NAVBAR */}
      <Header />

      {/* 2. MAIN CONTENT */}
      <main className="login-main">
        <div className="login-grid">
          {/* LEFT COLUMN (Hero + Auction Card) */}
          <div className="login-left-col">
            <div className="hero-intro">
              <div className="platform-pill">
                <div className="platform-dot"></div>
                <span className="platform-text">NEXUS PLATFORM 4.0 • CÔNG NGHỆ ĐỘC QUYỀN</span>
              </div>
              <h2 className="hero-heading">
                Trải Nghiệm Mua Sắm &<br />
                <span className="hero-heading-highlight">Đấu Giá 3D Đỉnh Cao</span>
              </h2>
              <p className="hero-desc">
                Môi trường giao dịch tài sản số & thương mại cao cấp với tương tác mô hình không
                gian ba chiều, chốt phiên thời gian thực minh bạch tuyệt đối.
              </p>
            </div>

            {/* Auction Preview Card */}
            <div className="auction-card">
              {/* Card Left - 3D Preview Area */}
              <div className="auction-preview-box">
                <div className="auction-preview-bg"></div>

                <div className="auction-preview-header">
                  <span className="badge-360">
                    <Rotate3d className="badge-360-icon" /> XOAY 360°
                  </span>
                  <span className="badge-live-bid">
                    <div className="live-dot"></div> LIVE BID
                  </span>
                </div>

                {/* Stylized 3D Watch Graphic */}
                <div className="tourbillon-graphic-wrap">
                  <div className="tourbillon-circle-outer">
                    <div className="tourbillon-ring-dashed"></div>
                    <div className="tourbillon-ring-inner"></div>
                    <div className="tourbillon-ring-core"></div>
                    <div className="tourbillon-center-dot">
                      <div className="tourbillon-core-point"></div>
                    </div>
                  </div>
                </div>

                <div className="auction-preview-footer">
                  <p className="preview-item-name">Skeleton Tourbillon 3D</p>
                  <p className="preview-price-text">
                    Giá hiện tại: <span className="preview-price-value">128.500.000 đ</span>
                  </p>
                </div>
              </div>

              {/* Card Right - Details */}
              <div className="auction-details-box">
                <div>
                  <div className="auction-meta-row">
                    <span className="tag-vip">Phiên VIP Đang Diễn Ra</span>
                    <span className="auction-id">
                      Mã: <strong>#NX-9982</strong>
                    </span>
                  </div>

                  <h3 className="auction-item-title">Đồng Hồ Cơ Skeleton Chrono Precision 3D</h3>

                  <p className="auction-item-desc">
                    Đấu giá công nghệ phòng chống sniping tự động gia hạn 60s cuối, cam kết kiểm
                    định và niêm phong vật lý.
                  </p>
                </div>

                <div className="auction-stats-box">
                  <div className="stat-item">
                    <p className="stat-label">LƯỢT TRẢ GIÁ</p>
                    <p className="stat-value">42 Bids</p>
                  </div>
                  <div className="stat-item bordered">
                    <p className="stat-label">CÒN LẠI</p>
                    <p className="stat-value danger">04:18m</p>
                  </div>
                  <div className="stat-item">
                    <p className="stat-label">BẢO CHỨNG CỌC</p>
                    <p className="stat-value success">50% PayOS</p>
                  </div>
                </div>

                <div className="auction-join-callout">
                  <CheckCircle className="auction-join-icon" />
                  <span>Đăng nhập để tham gia đấu giá & tương tác 3D ngay lập tức</span>
                </div>
              </div>
            </div>

            {/* 3 Feature Cards */}
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper blue">
                  <Rotate3d />
                </div>
                <h4 className="feature-title">Mô Hình 3D Xoay 360°</h4>
                <p className="feature-desc">Khảo sát chi tiết góc cạnh chuẩn thực tế.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon-wrapper red">
                  <ShieldAlert />
                </div>
                <h4 className="feature-title">Anti-Sniping Realtime</h4>
                <p className="feature-desc">Chống cướp phiên tin tặc, công bằng tuyệt đối.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon-wrapper green">
                  <SquareCheckBig />
                </div>
                <h4 className="feature-title">Bảo Chứng Ký Quỹ</h4>
                <p className="feature-desc">Cọc 50% minh bạch qua PayOS & Stripe.</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Login Form) */}
          <div className="login-right-col">
            <div className="login-card">
              <div className="login-card-top-accent"></div>

              <div className="login-form-header">
                <h2 className="login-card-title">Đăng nhập NEXUS</h2>
              </div>

              <form onSubmit={handleLogin} className="login-form" aria-busy={pending}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="input-box">
                    <div className="input-left-icon">
                      <User />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      disabled={pending}
                      className="form-input"
                      placeholder="user@gmail.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFeedback('');
                        setFailed(false);
                      }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="form-label-row">
                    <label className="form-label">Mật khẩu</label>
                    <button
                      type="button"
                      className="forgot-password-link bg-transparent border-0 cursor-pointer text-indigo-600 hover:text-indigo-800"
                      onClick={() => {
                        setForgotEmail(email.trim());
                        setForgotError('');
                        setForgotSuccess('');
                        setForgotStep(1);
                        setShowForgotModal(true);
                      }}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="input-box">
                    <div className="input-left-icon">
                      <Lock />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Nhập mật khẩu an toàn của bạn"
                      required
                      minLength={6}
                      autoComplete="current-password"
                      disabled={pending}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFeedback('');
                        setFailed(false);
                      }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>

                <div className="form-options-row">
                  <div className="ssl-encryption-badge">
                    <Shield className="ssl-icon" />
                    <span>Mã hóa SSL 256-bit</span>
                  </div>
                </div>

                {feedback && (
                  <p
                    className={`login-feedback ${failed ? 'login-feedback--error' : ''}`}
                    role={failed ? 'alert' : 'status'}
                    aria-live="polite"
                  >
                    {feedback}
                  </p>
                )}
                <button type="submit" className="submit-btn" disabled={pending}>
                  {pending ? 'ĐANG ĐĂNG NHẬP…' : 'ĐĂNG NHẬP'}{' '}
                  <ArrowLeft className="submit-btn-icon" />
                </button>
              </form>

              <div className="social-divider">
                <div className="divider-line">
                  <hr />
                </div>
                <div className="divider-text-wrap">
                  <span className="divider-text">HOẶC TIẾP TỤC VỚI</span>
                </div>
              </div>

              <div className="social-login-grid">
                <button
                  type="button"
                  className="social-login-btn"
                  onClick={startGoogleLogin}
                  disabled={pending}
                >
                  <GoogleIcon className="social-icon" />
                  Đăng nhập với Google
                </button>
              </div>

              <div className="signup-prompt">
                <span className="signup-prompt-text">Bạn mới tham gia NEXUS?</span>
                <a href="/register" className="signup-link">
                  Tạo tài khoản ngay
                </a>
              </div>

              <div className="flex flex-col gap-1 text-center text-xs text-slate-500 py-1">
                <span>
                  Đội ngũ quản trị / vận hành?{' '}
                  <a href="/admin" className="font-semibold text-blue-600 hover:underline">
                    Vào NEXUS Admin Panel
                  </a>
                </span>
              </div>

              <div className="voucher-banner">
                <Gift className="voucher-icon" />
                <span className="voucher-text">
                  Tặng ngay Voucher 500.000đ trải nghiệm đấu giá 3D
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. TRUST BAR
      <div className="trust-bar">
        <div className="trust-container">
          <div className="trust-grid">
            <div className="trust-item">
              <div className="trust-icon-box">
                <BadgeCheck className="trust-icon" />
              </div>
              <div className="trust-text-box">
                <h5 className="trust-title">Bộ Công Thương</h5>
                <p className="trust-desc">Đã thông báo & cấp phép sàn TMDT</p>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon-box">
                <Shield className="trust-icon" />
              </div>
              <div className="trust-text-box">
                <h5 className="trust-title">Chuẩn PCI-DSS</h5>
                <p className="trust-desc">Mã hóa dữ liệu thanh toán toàn thể</p>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon-box">
                <SquareCheckBig className="trust-icon" />
              </div>
              <div className="trust-text-box">
                <h5 className="trust-title">PayOS & Stripe Verified</h5>
                <p className="trust-desc">Ký quỹ cọc đấu giá tự động</p>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon-box">
                <Truck className="trust-icon" />
              </div>
              <div className="trust-text-box">
                <h5 className="trust-title">GHN Express & Viettel Post</h5>
                <p className="trust-desc">Vận chuyển đồng kiểm niêm phong</p>
              </div>
            </div>
          </div>
        </div>
      </div>*/}

      {/* 4. FOOTER
      <footer className="login-footer">
        <div className="footer-container">
          <div className="footer-grid">

            <div className="footer-col">
              <h4 className="footer-col-title">HỆ SINH THÁI 3D</h4>
              <ul className="footer-link-list">
                <li><a href="#" className="footer-link">Đấu giá 3D Trực tuyến</a></li>
                <li><a href="#" className="footer-link">NEXUS Virtual Mall</a></li>
                <li><a href="#" className="footer-link">Mô hình không gian AR/VR</a></li>
                <li><a href="#" className="footer-link">Phòng đấu giá VIP Lounge</a></li>
                <li><a href="#" className="footer-link">Quy chuẩn chống cướp bid</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">CHĂM SÓC KHÁCH HÀNG</h4>
              <ul className="footer-link-list">
                <li><a href="#" className="footer-link">Trung tâm trợ giúp 24/7</a></li>
                <li><a href="#" className="footer-link">Quy chế trả hàng & hoàn tiền</a></li>
                <li><a href="#" className="footer-link">Chính sách bảo chứng ký quỹ</a></li>
                <li><a href="#" className="footer-link">Kiểm định vật phẩm 3D</a></li>
                <li><a href="#" className="footer-link">Liên hệ: support@nexus.vn</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">VỀ NEXUS PLATFORM</h4>
              <ul className="footer-link-list">
                <li><a href="#" className="footer-link">Giới thiệu NEXUS Inc.</a></li>
                <li><a href="#" className="footer-link">Kênh dành cho Nhà bán lẻ</a></li>
                <li><a href="#" className="footer-link">Tuyển dụng kỹ sư 3D</a></li>
                <li><a href="#" className="footer-link">Điều khoản dịch vụ</a></li>
                <li><a href="#" className="footer-link">Chính sách quyền riêng tư</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">ĐỐI TÁC THANH TOÁN</h4>
              <div className="payment-badges-row">
                {['PayOS', 'VISA', 'Stripe', 'Master', 'Napas', 'JCB'].map(pt => (
                  <div key={pt} className="payment-badge">{pt}</div>
                ))}
              </div>
              <h4 className="footer-col-title">KẾT NỐI MẠNG XÃ HỘI</h4>
              <div className="social-links-row">
                <a href="#" className="social-circle-btn">FB</a>
                <a href="#" className="social-circle-btn">YT</a>
                <a href="#" className="social-circle-btn">IN</a>
              </div>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">ỨNG DỤNG NEXUS 3D</h4>
              <div className="app-download-card">
                <div className="app-download-inner">
                  <div className="qr-placeholder">
                    QR CODE
                  </div>
                  <div className="store-buttons-col">
                    <button className="store-btn">App Store</button>
                    <button className="store-btn">Google Play</button>
                  </div>
                </div>
                <p className="app-download-note">Hỗ trợ trải nghiệm AR không gian ba chiều.</p>
              </div>
            </div>

          </div>

          <div className="footer-bottom-bar">
            <p className="copyright-text">
              © 2025 NEXUS E-Commerce & 3D Auction Inc. Toàn bộ quyền sở hữu trí tuệ và công nghệ đã được đăng ký bảo hộ.
            </p>
            <div className="legal-links">
              <a href="#" className="legal-link">Bảo mật</a>
              <span className="legal-dot">•</span>
              <a href="#" className="legal-link">Điều khoản</a>
              <span className="legal-dot">•</span>
              <a href="#" className="legal-link">Sơ đồ sàn</a>
              <span className="legal-dot">•</span>
              <a href="#" className="legal-link">Việt Nam (VN)</a>
            </div>
          </div>
        </div>
      </footer> */}
      {/* QUÊN MẬT KHẨU MODAL */}
      <Popup
        isOpen={showForgotModal}
        onClose={() => {
          if (!forgotPending) setShowForgotModal(false);
        }}
        title={
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <span>{forgotStep === 1 ? 'Khôi Phục Mật Khẩu' : 'Đặt Lại Mật Khẩu Mới'}</span>
          </div>
        }
        size="md"
      >
        {forgotStep === 1 ? (
          <form onSubmit={handleSendForgotOtp} className="space-y-4">
            <p className="text-sm text-slate-600">
              Nhập địa chỉ email đăng ký tài khoản của bạn. Hệ thống sẽ gửi mã xác thực (OTP) về hộp
              thư để khôi phục mật khẩu.
            </p>

            {forgotError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                {forgotError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="user@gmail.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={forgotPending}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                onClick={() => setShowForgotModal(false)}
                disabled={forgotPending}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={forgotPending}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
              >
                {forgotPending ? 'Đang gửi mã...' : 'Gửi mã xác thực'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-slate-600">
              Mã xác thực đã được gửi đến <strong>{forgotEmail}</strong>. Vui lòng kiểm tra hộp thư
              và nhập mã cùng mật khẩu mới.
            </p>

            {forgotSuccess && (
              <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                {forgotSuccess}
              </div>
            )}

            {forgotError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                {forgotError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Mã xác thực (OTP)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Nhập 6 ký tự"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tracking-widest text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={forgotCode}
                onChange={(e) => setForgotCode(e.target.value)}
                disabled={forgotPending}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Mật khẩu mới (tối thiểu 6 ký tự)
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Nhập mật khẩu mới"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                disabled={forgotPending}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                disabled={forgotPending}
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                className="text-xs text-indigo-600 hover:underline"
                onClick={() => {
                  setForgotStep(1);
                  setForgotError('');
                }}
                disabled={forgotPending}
              >
                Quay lại / Gửi lại mã
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  onClick={() => setShowForgotModal(false)}
                  disabled={forgotPending}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={forgotPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                >
                  {forgotPending ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Popup>

      <Footer />
    </div>
  );
};

export default Login;
