import { useState, type FormEvent } from 'react';
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

function isValidContact(contact: string) {
  const value = contact.trim();
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
    /^(?:0|\+84)[0-9]{9}$/.test(value.replace(/\s/g, ''))
  );
}

export default function RegisterPage() {
  const [contact, setContact] = useState('');
  const [feedback, setFeedback] = useState('');

  function handleSendOtp() {
    if (!isValidContact(contact)) {
      setFeedback('Vui lòng nhập số điện thoại Việt Nam hoặc địa chỉ email hợp lệ.');
      return;
    }
    setFeedback('Giao diện đang ở chế độ demo. Gửi OTP sẽ hoạt động khi kết nối API.');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidContact(contact)) {
      setFeedback('Vui lòng nhập số điện thoại Việt Nam hoặc địa chỉ email hợp lệ.');
      return;
    }
    setFeedback('Thông tin đã đúng định dạng. Trang demo chưa gửi dữ liệu hoặc tạo tài khoản.');
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

            <form className="register-form" onSubmit={handleSubmit}>
              <div className="register-field">
                <label htmlFor="register-name">
                  Họ và tên <span className="register-required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <UserRound size={14} className="register-input-icon" aria-hidden="true" />
                  <input
                    id="register-name"
                    name="name"
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
                  Số điện thoại hoặc Email <span className="register-required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <Mail size={14} className="register-input-icon" aria-hidden="true" />
                  <input
                    id="register-contact"
                    name="contact"
                    autoComplete="username"
                    placeholder="0912 345 678 hoặc email@domain.com"
                    required
                    value={contact}
                    onChange={(event) => {
                      setContact(event.target.value);
                      setFeedback('');
                    }}
                  />
                  <button className="register-otp-button" type="button" onClick={handleSendOtp}>
                    Gửi mã OTP
                  </button>
                </div>
              </div>

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
                      type="password"
                      autoComplete="new-password"
                      placeholder="Tối thiểu 8 ký tự"
                      minLength={8}
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
                <input id="register-agreement" name="agreement" type="checkbox" required />
                <label htmlFor="register-agreement">
                  Tôi đồng ý với <a href="/terms">Điều khoản dịch vụ</a> và{' '}
                  <a href="/privacy">Chính sách bảo mật</a> của NEXUS.
                </label>
              </div>

              {feedback && (
                <p className="register-feedback" role="status">
                  {feedback}
                </p>
              )}

              <button className="register-submit" type="submit">
                Đăng Ký Tài Khoản <ArrowRight size={16} aria-hidden="true" />
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
