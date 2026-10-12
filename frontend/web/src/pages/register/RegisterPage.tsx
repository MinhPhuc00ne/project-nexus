import { useEffect, useRef, useState, type FormEvent } from 'react';
import { register, verifyEmail } from '../../services/auth';
import Header from '../../components/Header/Header';
import {
  ArrowRight,
  BadgeCheck,
  LockKeyhole,
  Mail,
  RectangleEllipsis,
  Scan,
  ShieldCheck,
  Truck,
  UserRound,
} from 'lucide-react';
import './RegisterPage.css';
import Footer from '../../components/footer/footer';

const benefits = [
  {
    icon: Scan,
    title: 'Đấu Giá 3D Tương Tác',
    description: 'Chiêm ngưỡng và tương tác 360° với vật phẩm trước khi gõ búa.',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo Chứng Escrow An Toàn',
    description: 'Ký quỹ minh bạch, hoàn cọc tự động qua cổng thanh toán liên ngân hàng.',
  },
  {
    icon: Truck,
    title: 'Đồng Kiểm & Niêm Phong',
    description: 'Vận chuyển hỏa tốc, bảo hiểm 100% giá trị vật phẩm khi giao nhận.',
  },
];

export default function RegisterPage() {
  const [contact, setContact] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pending, setPending] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [failed, setFailed] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (!resendAt) return;
    const update = (): void => {
      setResendSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  function editDetails(): void {
    setSentEmail('');
    setCode('');
    setFeedback('');
    setFailed(false);
    window.requestAnimationFrame(() => document.getElementById('register-contact')?.focus());
  }

  async function handleSendOtp(): Promise<void> {
    if (requestInFlight.current || verified || Date.now() < resendAt) return;
    const email = contact.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName.trim() || password.length < 6 || !agreement) {
      setFailed(true);
      setFeedback('Vui lòng nhập họ tên, email hợp lệ, mật khẩu tối thiểu 6 ký tự và đồng ý điều khoản.');
      return;
    }
    requestInFlight.current = true;
    setPending(true); setFailed(false); setFeedback('');
    // A resend replaces the previous OTP; require the latest code even if the response is lost.
    setSentEmail('');
    setCode('');
    setResendAt(Date.now() + 60000);
    setResendSeconds(60);
    try {
      const result = await register(email, password, fullName.trim());
      setSentEmail(email); setCode(''); setFeedback(result.message);
      window.requestAnimationFrame(() => document.getElementById('register-otp')?.focus());
    } catch (error: unknown) {
      setFailed(true); setFeedback(error instanceof Error ? error.message : 'Không thể gửi mã OTP.');
    } finally { requestInFlight.current = false; setPending(false); }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (requestInFlight.current || verified) return;
    if (!sentEmail || sentEmail !== contact.trim()) {
      setFailed(true); setFeedback('Vui lòng gửi mã OTP cho email này trước khi xác thực.'); return;
    }
    if (!/^[0-9]{6}$/.test(code) || !agreement) {
      setFailed(true);
      setFeedback('Vui lòng nhập mã OTP gồm 6 chữ số và đồng ý điều khoản.');
      return;
    }
    requestInFlight.current = true;
    setPending(true); setFailed(false); setFeedback('');
    try {
      const result = await verifyEmail(sentEmail, code);
      setVerified(true); setPassword(''); setFeedback(result.message);
      try { sessionStorage.setItem('nexus:verified-email', sentEmail); } catch { /* Storage may be disabled. */ }
      window.location.assign('/login?verified=1');
    } catch (error: unknown) {
      setFailed(true); setFeedback(error instanceof Error ? error.message : 'Xác thực thất bại.');
    } finally { requestInFlight.current = false; setPending(false); }
  }

  return (
    <div className="register-shell">
      <Header />

      <main className="register-page">
        <div className="register-layout">
          <section className="register-intro" aria-labelledby="register-intro-title">
            <span className="register-eyebrow">
              <span className="register-eyebrow-dot" aria-hidden="true" />
              NEXUS ONBOARDING
            </span>
            <h1 id="register-intro-title" className="register-title">
              Khởi Đầu Cùng <span>NEXUS</span>
            </h1>
            <p className="register-intro-description">
              Gia nhập nền tảng đấu giá trực tuyến và mua sắm tài sản số 3D thế hệ mới chỉ trong vài
              bước đơn giản.
            </p>

            <div className="register-benefits">
              {benefits.map(({ icon: Icon, title, description }) => (
                <div className="register-benefit" key={title}>
                  <span className="register-benefit-icon">
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="register-security">
              <span>
                <LockKeyhole size={12} className="text-emerald-600" aria-hidden="true" />
                Mã hóa SSL 256-Bit
              </span>
              <span className="text-slate-300" aria-hidden="true">
                •
              </span>
              <span>
                <BadgeCheck size={13} className="text-blue-600" aria-hidden="true" />
                Bảo mật dữ liệu tuyệt đối
              </span>
            </div>
          </section>

          <section className="register-card" aria-labelledby="register-form-title">
            <h2 id="register-form-title" className="register-card-title">
              Tạo tài khoản NEXUS
            </h2>
            <p className="register-card-description">
              Đăng ký nhanh chóng để khám phá các phiên đấu giá độc quyền
            </p>

            <form className="register-form" onSubmit={handleSubmit} aria-busy={pending}>
              <div className="register-field">
                <label htmlFor="register-name">
                  Họ và tên <span className="register-required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <UserRound size={14} className="register-input-icon" aria-hidden="true" />
                  <input
                    id="register-name"
                    name="name"
                    value={fullName}
                    disabled={pending || Boolean(sentEmail)}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    placeholder="VD: Nguyễn Văn An"
                    required
                    maxLength={100}
                    pattern=".*\S.*"
                  />
                </div>
              </div>

              <div className="register-field">
                <label htmlFor="register-contact">
                  Email <span className="register-required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <Mail size={14} className="register-input-icon" aria-hidden="true" />
                  <input
                    id="register-contact"
                    name="contact"
                    type="email"
                    disabled={pending || Boolean(sentEmail)}
                    autoComplete="username"
                    placeholder="email@domain.com"
                    required
                    value={contact}
                    onChange={(event) => {
                      setContact(event.target.value);
                      setFeedback('');
                    }}
                  />
                  <button className="register-otp-button" type="button" onClick={handleSendOtp} disabled={pending || verified || resendSeconds > 0}>
                    {pending ? 'Đang xử lý…' : resendSeconds > 0 ? `Gửi lại sau ${resendSeconds}s` : sentEmail ? 'Gửi lại OTP' : 'Gửi mã OTP'}
                  </button>
                </div>
              </div>

              {sentEmail && !verified && (
                <div className="register-feedback">
                  <p>Mã OTP đã gửi đến {sentEmail}. Mã có hiệu lực 10 phút. Kiểm tra cả thư mục spam.</p>
                  <button type="button" className="register-otp-button" disabled={pending} onClick={editDetails}>
                    Sửa email hoặc thông tin đăng ký
                  </button>
                </div>
              )}

              <div className="register-field-row">
                <div className="register-field">
                  <label htmlFor="register-password">
                    Mật khẩu <span className="register-required">*</span>
                  </label>
                  <div className="register-input-wrapper">
                    <LockKeyhole size={14} className="register-input-icon" aria-hidden="true" />
                    <input
                      id="register-password"
                      name="password"
                      value={password}
                      disabled={pending || Boolean(sentEmail)}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Tối thiểu 6 ký tự"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <div className="register-field">
                  <label htmlFor="register-otp">
                    Mã xác thực OTP <span className="register-required">*</span>
                  </label>
                  <div className="register-input-wrapper">
                    <RectangleEllipsis
                      size={14}
                      className="register-input-icon"
                      aria-hidden="true"
                    />
                    <input
                      id="register-otp"
                      name="otp"
                      value={code}
                      disabled={pending || !sentEmail || verified}
                      onChange={(event) => {
                        setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                        setFeedback('');
                        setFailed(false);
                      }}
                      className="font-mono tracking-wider"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      placeholder="Mã 6 chữ số"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      title="Nhập mã OTP gồm 6 chữ số"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="register-agreement">
                <input id="register-agreement" name="agreement" checked={agreement} disabled={pending || verified} onChange={(event) => setAgreement(event.target.checked)} type="checkbox" required />
                <label htmlFor="register-agreement">
                  Tôi đồng ý với <a href="/terms">Điều khoản dịch vụ</a> và{' '}
                  <a href="/privacy">Chính sách bảo mật</a> của NEXUS.
                </label>
              </div>

              {feedback && (
                <p className={`register-feedback ${failed ? 'register-feedback--error' : ''}`} role={failed ? 'alert' : 'status'} aria-live="polite">
                  {feedback}
                </p>
              )}

              <button className="register-submit" type="submit" disabled={pending || !sentEmail || verified}>
                {pending ? 'Đang xử lý…' : verified ? 'Đã xác thực' : 'Xác Thực Tài Khoản'} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>

            <p className="register-login">
              Đã có tài khoản NEXUS? <a href="/login">Đăng nhập ngay</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
