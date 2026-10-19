import { useEffect, useRef, useState, type FormEvent } from 'react';
import { register, verifyEmail } from '../../services/auth';
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
    // Chặn gửi trùng, gửi sau khi xác thực hoặc gửi lại trước 60 giây.
    if (requestInFlight.current || verified || Date.now() < resendAt) return;
    const email = contact.trim();
    if (
      !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email) ||
      !fullName.trim() ||
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[^a-zA-Z0-9\s]/.test(password) ||
      !agreement
    ) {
      setFailed(true);
      setFeedback(
        'Vui lòng nhập họ tên, Gmail, mật khẩu tối thiểu 8 ký tự có chữ hoa và ký tự đặc biệt, rồi đồng ý điều khoản.',
      );
      return;
    }
    requestInFlight.current = true;
    setPending(true);
    setFailed(false);
    setFeedback('');
    // Gửi lại sẽ thay OTP cũ: xóa mã đã nhập và chờ mã mới, kể cả khi request timeout.
    setSentEmail('');
    setCode('');
    setResendAt(Date.now() + 60000);
    setResendSeconds(60);
    try {
      // Gọi service Axios: backend tạo tài khoản chưa xác thực và gửi OTP.
      const result = await register(email, password, fullName.trim());
      // Chỉ mở bước nhập OTP sau khi API trả về thành công.
      setSentEmail(email);
      if (result.devOtpCode) {
        setCode(result.devOtpCode);
        setFeedback(`${result.message} [Đã tự động điền mã OTP: ${result.devOtpCode}]`);
      } else {
        setCode('');
        setFeedback(result.message);
      }
      window.requestAnimationFrame(() => document.getElementById('register-otp')?.focus());
    } catch (error: unknown) {
      setFailed(true);
      setFeedback(error instanceof Error ? error.message : 'Không thể gửi mã OTP.');
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (requestInFlight.current || verified) return;
    if (!sentEmail || sentEmail !== contact.trim()) {
      setFailed(true);
      setFeedback('Vui lòng gửi mã OTP cho email này trước khi xác thực.');
      return;
    }
    if (!/^[0-9]{6}$/.test(code) || !agreement) {
      setFailed(true);
      setFeedback('Vui lòng nhập mã OTP gồm 6 chữ số và đồng ý điều khoản.');
      return;
    }
    requestInFlight.current = true;
    setPending(true);
    setFailed(false);
    setFeedback('');
    try {
      const result = await verifyEmail(sentEmail, code);
      setVerified(true);
      setPassword('');
      setFeedback(result.message);
      try {
        sessionStorage.setItem('nexus:verified-email', sentEmail);
      } catch {
        /* Storage may be disabled. */
      }
      window.location.assign('/login?verified=1');
    } catch (error: unknown) {
      setFailed(true);
      setFeedback(error instanceof Error ? error.message : 'Xác thực thất bại.');
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* <Header /> */}

      <main className="flex flex-1 items-center justify-center bg-[linear-gradient(135deg,#eaf0fb_0%,#f3f7fb_60%,#f0f2fc_100%)] px-5 py-8 text-slate-900 sm:px-9">
        <div className="grid w-full max-w-[1100px] items-center gap-8 min-[900px]:grid-cols-[0.82fr_1.18fr] min-[900px]:gap-12">
          <section
            className="mx-auto w-full max-w-[440px] min-[900px]:mx-0"
            aria-labelledby="register-intro-title"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-blue-600">
              <span className="size-1.5 rounded-full bg-blue-600" aria-hidden="true" />
              NEXUS ONBOARDING
            </span>
            <h1
              id="register-intro-title"
              className="mt-3 mb-2 text-[30px] leading-tight font-bold sm:text-4xl"
            >
              Khởi Đầu Cùng <span className="text-blue-600">NEXUS</span>
            </h1>
            <p className="max-w-[380px] text-sm leading-[1.65] text-slate-600">
              Gia nhập nền tảng đấu giá trực tuyến và mua sắm tài sản số 3D thế hệ mới chỉ trong vài
              bước đơn giản.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              {benefits.map(({ icon: Icon, title, description }) => (
                <div className="flex items-start gap-4" key={title}>
                  <span className="flex h-8 w-7 shrink-0 items-center justify-center text-blue-600">
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="mb-0.5 text-sm leading-5 font-semibold">{title}</h2>
                    <p className="max-w-[325px] text-xs leading-[1.65] text-slate-500">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <LockKeyhole size={12} className="text-emerald-600" aria-hidden="true" />
                Mã hóa SSL 256-Bit
              </span>
              <span className="text-slate-300" aria-hidden="true">
                •
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck size={13} className="text-blue-600" aria-hidden="true" />
                Bảo mật dữ liệu tuyệt đối
              </span>
            </div>
          </section>

          <section
            className="mx-auto w-full max-w-[526px] rounded-2xl border border-slate-200/80 bg-white px-6 py-8 shadow-[0_18px_24px_-14px_rgb(15_23_42_/_25%),0_4px_6px_-4px_rgb(15_23_42_/_12%)] sm:px-[30px]"
            aria-labelledby="register-form-title"
          >
            <h2 id="register-form-title" className="text-xl leading-7 font-bold">
              Tạo tài khoản NEXUS
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Đăng ký nhanh chóng để khám phá các phiên đấu giá độc quyền
            </p>

            <form
              className="mt-4 flex flex-col gap-3.5"
              onSubmit={handleSubmit}
              aria-busy={pending}
            >
              <div>
                <label
                  className="mb-1 block text-xs leading-5 font-medium text-slate-700"
                  htmlFor="register-name"
                >
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <div className="flex min-h-9 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <UserRound size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
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
                    className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-900 outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-1 block text-xs leading-5 font-medium text-slate-700"
                  htmlFor="register-contact"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="flex min-h-9 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <Mail size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                  <input
                    id="register-contact"
                    name="contact"
                    type="email"
                    disabled={pending || Boolean(sentEmail)}
                    autoComplete="username"
                    placeholder="example@gmail.com"
                    required
                    value={contact}
                    onChange={(event) => {
                      setContact(event.target.value);
                      setFeedback('');
                    }}
                    className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-900 outline-none placeholder:text-slate-500"
                  />
                  <button
                    className="shrink-0 cursor-pointer rounded-md bg-blue-50 px-2 py-1.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={handleSendOtp}
                    disabled={pending || verified || resendSeconds > 0}
                  >
                    {pending
                      ? 'Đang xử lý…'
                      : resendSeconds > 0
                        ? `Gửi lại sau ${resendSeconds}s`
                        : sentEmail
                          ? 'Gửi lại OTP'
                          : 'Gửi mã OTP'}
                  </button>
                </div>
              </div>

              {sentEmail && !verified && (
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
                  <p className="mb-2">
                    Mã OTP đã gửi đến {sentEmail}. Mã có hiệu lực 10 phút. Kiểm tra cả thư mục spam.
                  </p>
                  <button
                    type="button"
                    className="shrink-0 cursor-pointer rounded-md bg-blue-50 px-2 py-1.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={pending}
                    onClick={editDetails}
                  >
                    Sửa email hoặc thông tin đăng ký
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-xs leading-5 font-medium text-slate-700"
                    htmlFor="register-password"
                  >
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="flex min-h-9 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                    <LockKeyhole size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                    <input
                      id="register-password"
                      name="password"
                      value={password}
                      disabled={pending || Boolean(sentEmail)}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      autoComplete="new-password"
                      aria-describedby="register-password-hint"
                      placeholder="Tối thiểu 8 ký tự"
                      minLength={8}
                      required
                      className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-900 outline-none placeholder:text-slate-500"
                    />
                  </div>
                  <p
                    id="register-password-hint"
                    className="mt-1 text-[10px] leading-4 text-slate-500"
                  >
                    Ít nhất 8 ký tự, có một chữ hoa và một ký tự đặc biệt.
                  </p>
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs leading-5 font-medium text-slate-700"
                    htmlFor="register-otp"
                  >
                    Mã xác thực OTP <span className="text-red-500">*</span>
                  </label>
                  <div className="flex min-h-9 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                    <RectangleEllipsis
                      size={14}
                      className="shrink-0 text-slate-400"
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
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      placeholder="Mã 6 chữ số"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      title="Nhập mã OTP gồm 6 chữ số"
                      required
                      className="min-w-0 flex-1 bg-transparent py-2 font-mono text-xs tracking-wider text-slate-900 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-1 flex items-start gap-2 text-[11px] leading-[1.7] text-slate-500">
                <input
                  id="register-agreement"
                  name="agreement"
                  checked={agreement}
                  disabled={pending || verified}
                  onChange={(event) => setAgreement(event.target.checked)}
                  type="checkbox"
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                />
                <label
                  className="[&_a]:text-blue-600 [&_a:hover]:underline"
                  htmlFor="register-agreement"
                >
                  Tôi đồng ý với <a href="/terms">Điều khoản dịch vụ</a> và{' '}
                  <a href="/privacy">Chính sách bảo mật</a> của NEXUS.
                </label>
              </div>

              {feedback && (
                <p
                  className={`rounded-lg px-3 py-2 text-xs leading-5 ${failed ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}
                  role={failed ? 'alert' : 'status'}
                  aria-live="polite"
                >
                  {feedback}
                </p>
              )}

              <button
                className="mt-2 flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                type="submit"
                disabled={pending || !sentEmail || verified}
              >
                {pending ? 'Đang xử lý…' : verified ? 'Đã xác thực' : 'Xác Thực Tài Khoản'}{' '}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>

            <p className="mt-[18px] border-t border-slate-100 pt-4 text-center text-xs leading-5 text-slate-500">
              Đã có tài khoản NEXUS?{' '}
              <a className="ml-1 font-medium text-blue-600 hover:underline" href="/login">
                Đăng nhập ngay
              </a>
            </p>
          </section>
        </div>
      </main>
      {/* <Footer /> */}
    </div>
  );
}
