import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { GoogleOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  forgotPassword,
  login,
  resetPassword,
  saveAuthSession,
  startGoogleLogin,
} from '../../services/auth';
import { ROUTES } from '../../routes/AppRouter';
import Popup from '../../components/Popup';
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
import Header from '../../components/Header';
import Footer from '../../components/footer';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
    searchParams.get('verified') === '1' ? 'Email đã được xác thực. Vui lòng đăng nhập.' : '',
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
    if (searchParams.get('verified') === '1') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('verified');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
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
        navigate(ROUTES.ADMIN);
      } else if (result.user.role === 'SUPPORT_STAFF') {
        navigate(ROUTES.STAFF);
      } else {
        navigate(ROUTES.HOME);
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 [font-family:var(--font-sans,_system-ui,_-apple-system,_sans-serif)]">
      {/* 1. SHARED HEADER / NAVBAR */}
      <Header />

      {/* 2. MAIN CONTENT */}
      <main className="[flex:1] [max-width:80rem] w-full [margin:0_auto] [padding:2.5rem_1.5rem] max-[480px]:[padding:1.5rem_1rem]">
        <div className="grid [grid-template-columns:repeat(12,_minmax(0,_1fr))] gap-12 items-center max-[1024px]:[grid-template-columns:minmax(0,_1fr)] max-[1024px]:gap-10">
          {/* LEFT COLUMN (Hero + Auction Card) */}
          <div className="[grid-column:span_7_/_span_7] flex flex-col justify-center max-[1024px]:[grid-column:1_/_-1] max-[1024px]:min-w-0">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 [background-color:#eaf0ff] [border:1px_solid_#d2e0ff] [padding:0.375rem_0.875rem] rounded-full mb-6">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <span className="text-xs font-bold text-blue-600 [letter-spacing:0.025em] uppercase">
                  NEXUS PLATFORM 4.0 • CÔNG NGHỆ ĐỘC QUYỀN
                </span>
              </div>
              <h2 className="[font-size:2.75rem] font-black text-slate-900 [line-height:1.15] mb-4 max-[768px]:[font-size:2rem]">
                Trải Nghiệm Mua Sắm &<br />
                <span className="[color:#3b5bdb]">Đấu Giá 3D Đỉnh Cao</span>
              </h2>
              <p className="text-slate-500 text-base [max-width:36rem] leading-relaxed">
                Môi trường giao dịch tài sản số & thương mại cao cấp với tương tác mô hình không
                gian ba chiều, chốt phiên thời gian thực minh bạch tuyệt đối.
              </p>
            </div>

            {/* Auction Preview Card */}
            <div className="bg-white rounded-2xl [box-shadow:0_10px_25px_-5px_rgba(226,_232,_240,_0.8),_0_8px_10px_-6px_rgba(226,_232,_240,_0.8)] overflow-hidden [border:1px_solid_#f1f5f9] flex mb-10 max-[768px]:flex-col">
              {/* Card Left - 3D Preview Area */}
              <div className="[background-color:#0b1329] relative [width:40%] p-5 flex flex-col justify-between items-center text-center overflow-hidden [min-height:250px] max-[768px]:w-full">
                <div className="absolute [inset:0] [background:radial-gradient(_ellipse_at_center,_rgba(8,_145,_178,_0.25)_0%,_rgba(15,_23,_42,_0.8)_60%,_#0b1329_100%_)]"></div>

                <div className="relative z-10 w-full flex justify-between items-center">
                  <span className="[background-color:rgba(0,_0,_0,_0.45)] [backdrop-filter:blur(8px)] [border:1px_solid_rgba(255,_255,_255,_0.15)] text-white text-[10px] font-semibold [padding:0.25rem_0.625rem] rounded-full flex items-center gap-1">
                    <Rotate3d className="w-3 h-3 [color:#22d3ee]" /> XOAY 360°
                  </span>
                  <span className="[background-color:rgba(16,_185,_129,_0.15)] [color:#34d399] [border:1px_solid_rgba(16,_185,_129,_0.3)] text-[10px] font-bold [padding:0.125rem_0.5rem] rounded-full flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full [background-color:#34d399] [animation:pulse-glow_2s_cubic-bezier(0.4,_0,_0.6,_1)_infinite]"></div>{' '}
                    LIVE BID
                  </span>
                </div>

                {/* Stylized 3D Watch Graphic */}
                <div className="relative z-10 [margin:auto_0] [padding:0.5rem_0]">
                  <div className="relative [width:6rem] [height:6rem] [margin:0_auto] flex items-center justify-center">
                    <div className="absolute [inset:0] rounded-full [border:2px_dashed_rgba(6,_182,_212,_0.35)] [animation:rotate-360_20s_linear_infinite]"></div>
                    <div className="absolute [inset:0.5rem] rounded-full [border:1px_solid_rgba(34,_211,_238,_0.5)]"></div>
                    <div className="absolute [inset:1rem] rounded-full [border:2px_solid_rgba(99,_102,_241,_0.4)]"></div>
                    <div className="w-8 h-8 rounded-full [background-color:rgba(6,_182,_212,_0.2)] flex items-center justify-center [box-shadow:0_0_15px_rgba(6,_182,_212,_0.6)]">
                      <div className="w-3 h-3 rounded-full [background-color:#22d3ee]"></div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 w-full">
                  <p className="text-slate-400 text-xs font-medium mb-1">Skeleton Tourbillon 3D</p>
                  <p className="text-white text-xs font-medium">
                    Giá hiện tại:{' '}
                    <span className="[color:#22d3ee] font-bold text-sm">128.500.000 đ</span>
                  </p>
                </div>
              </div>

              {/* Card Right - Details */}
              <div className="p-6 [width:60%] flex flex-col justify-between max-[768px]:w-full">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="[background-color:#eef2ff] [color:#3b5bdb] text-[11px] font-bold [padding:0.125rem_0.625rem] rounded uppercase [letter-spacing:0.05em]">
                      Phiên VIP Đang Diễn Ra
                    </span>
                    <span className="text-xs font-medium text-slate-400 [&_strong]:text-slate-600">
                      Mã: <strong>#NX-9982</strong>
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 [line-height:1.35] mb-2">
                    Đồng Hồ Cơ Skeleton Chrono Precision 3D
                  </h3>

                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Đấu giá công nghệ phòng chống sniping tự động gia hạn 60s cuối, cam kết kiểm
                    định và niêm phong vật lý.
                  </p>
                </div>

                <div className="grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-2.5 mb-4 [padding:0.5rem_0.75rem] bg-slate-50 rounded-xl [border:1px_solid_#f1f5f9]">
                  <div className="text-center [&.bordered]:[border-left:1px_solid_#e2e8f0] [&.bordered]:[border-right:1px_solid_#e2e8f0]">
                    <p className="text-[10px] text-slate-400 font-semibold mb-0.5">LƯỢT TRẢ GIÁ</p>
                    <p className="font-bold text-sm text-slate-900 [&.danger]:text-blue-600 [&.success]:text-xs [&.success]:text-emerald-600">
                      42 Bids
                    </p>
                  </div>
                  <div className="text-center [&.bordered]:[border-left:1px_solid_#e2e8f0] [&.bordered]:[border-right:1px_solid_#e2e8f0] bordered">
                    <p className="text-[10px] text-slate-400 font-semibold mb-0.5">CÒN LẠI</p>
                    <p className="font-bold text-sm text-slate-900 [&.danger]:text-blue-600 [&.success]:text-xs [&.success]:text-emerald-600 danger">
                      04:18m
                    </p>
                  </div>
                  <div className="text-center [&.bordered]:[border-left:1px_solid_#e2e8f0] [&.bordered]:[border-right:1px_solid_#e2e8f0]">
                    <p className="text-[10px] text-slate-400 font-semibold mb-0.5">BẢO CHỨNG CỌC</p>
                    <p className="font-bold text-sm text-slate-900 [&.danger]:text-blue-600 [&.success]:text-xs [&.success]:text-emerald-600 success">
                      50% PayOS
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600 [flex-shrink:0]" />
                  <span>Đăng nhập để tham gia đấu giá & tương tác 3D ngay lập tức</span>
                </div>
              </div>
            </div>

            {/* 3 Feature Cards */}
            <div className="grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-4 max-[768px]:[grid-template-columns:minmax(0,_1fr)]">
              <div className="bg-white p-4 rounded-xl [border:1px_solid_#e2e8f0] shadow-sm">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 [&.blue]:bg-blue-50 [&.blue]:text-blue-600 [&.red]:bg-red-50 [&.red]:text-red-500 [&.green]:bg-green-50 [&.green]:text-green-600 [&_svg]:w-4 [&_svg]:h-4 blue">
                  <Rotate3d />
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Mô Hình 3D Xoay 360°</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  Khảo sát chi tiết góc cạnh chuẩn thực tế.
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl [border:1px_solid_#e2e8f0] shadow-sm">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 [&.blue]:bg-blue-50 [&.blue]:text-blue-600 [&.red]:bg-red-50 [&.red]:text-red-500 [&.green]:bg-green-50 [&.green]:text-green-600 [&_svg]:w-4 [&_svg]:h-4 red">
                  <ShieldAlert />
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Anti-Sniping Realtime</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  Chống cướp phiên tin tặc, công bằng tuyệt đối.
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl [border:1px_solid_#e2e8f0] shadow-sm">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 [&.blue]:bg-blue-50 [&.blue]:text-blue-600 [&.red]:bg-red-50 [&.red]:text-red-500 [&.green]:bg-green-50 [&.green]:text-green-600 [&_svg]:w-4 [&_svg]:h-4 green">
                  <SquareCheckBig />
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Bảo Chứng Ký Quỹ</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  Cọc 50% minh bạch qua PayOS & Stripe.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Login Form) */}
          <div className="[grid-column:span_5_/_span_5] flex items-center max-[1024px]:[grid-column:1_/_-1] max-[1024px]:min-w-0">
            <div className="bg-white w-full rounded-2xl [box-shadow:0_20px_25px_-5px_rgba(226,_232,_240,_0.8),_0_8px_10px_-6px_rgba(226,_232,_240,_0.8)] [border:1px_solid_#f1f5f9] [padding:2.25rem_2rem] relative overflow-hidden max-[480px]:[padding:1.75rem_1.25rem]">
              <div className="absolute top-0 left-0 w-full h-1 [background:linear-gradient(to_right,_#2563eb,_#06b6d4,_#3b82f6)]"></div>

              <div className="mb-6">
                <h2 className="[font-size:1.75rem] font-extrabold text-slate-900 [letter-spacing:-0.025em]">
                  Đăng nhập NEXUS
                </h2>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4" aria-busy={pending}>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-700 mb-1.5">Email</label>
                  <div className="relative">
                    <div className="absolute [inset-block:0] left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 [&_svg]:w-4 [&_svg]:h-4">
                      <User />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      disabled={pending}
                      className="block w-full [padding:0.625rem_0.875rem_0.625rem_2.5rem] [background-color:rgba(248,_250,_252,_0.5)] [border:1px_solid_#e2e8f0] rounded-xl text-sm text-slate-800 [outline:none] [transition:all_0.15s_ease] [&::placeholder]:text-slate-400 focus:bg-white focus:border-blue-600 focus:[box-shadow:0_0_0_3px_rgba(37,_99,_235,_0.15)]"
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

                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 mb-1.5">Mật khẩu</label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-blue-600 no-underline hover:underline bg-transparent border-0 cursor-pointer text-indigo-600 hover:text-indigo-800"
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
                  <div className="relative">
                    <div className="absolute [inset-block:0] left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 [&_svg]:w-4 [&_svg]:h-4">
                      <Lock />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="block w-full [padding:0.625rem_0.875rem_0.625rem_2.5rem] [background-color:rgba(248,_250,_252,_0.5)] [border:1px_solid_#e2e8f0] rounded-xl text-sm text-slate-800 [outline:none] [transition:all_0.15s_ease] [&::placeholder]:text-slate-400 focus:bg-white focus:border-blue-600 focus:[box-shadow:0_0_0_3px_rgba(37,_99,_235,_0.15)]"
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
                      className="absolute [inset-block:0] right-0 pr-3.5 flex items-center [background:none] [border:none] cursor-pointer text-slate-400 [transition:color_0.15s_ease] hover:text-slate-600 [&_svg]:w-4 [&_svg]:h-4"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mã hóa SSL 256-bit</span>
                  </div>
                </div>

                {feedback && (
                  <p
                    className={`[padding:10px_12px] [border-radius:8px] [background:#eff6ff] text-blue-700 text-[13px] ${failed ? '[background:#fef2f2] [color:#b91c1c]' : ''}`}
                    role={failed ? 'alert' : 'status'}
                    aria-live="polite"
                  >
                    {feedback}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full mt-2 [padding:0.75rem_1rem] [background-color:#2f54eb] text-white text-sm font-bold rounded-xl [border:none] cursor-pointer [box-shadow:0_10px_15px_-3px_rgba(47,_84,_235,_0.25)] flex justify-center items-center gap-2 [transition:all_0.15s_ease] hover:[background-color:#2040c7] active:[transform:scale(0.99)] disabled:[opacity:0.5] disabled:cursor-not-allowed"
                  disabled={pending}
                >
                  {pending ? 'ĐANG ĐĂNG NHẬP…' : 'ĐĂNG NHẬP'}{' '}
                  <ArrowLeft className="w-4 h-4 [transform:rotate(180deg)]" />
                </button>
              </form>

              <div className="mt-6 relative">
                <div className="absolute [inset:0] flex items-center [&_hr]:w-full [&_hr]:[border-top:1px_solid_#f1f5f9]">
                  <hr />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="[padding:0_0.75rem] bg-white text-slate-400 font-medium [letter-spacing:0.05em]">
                    HOẶC TIẾP TỤC VỚI
                  </span>
                </div>
              </div>

              <div className="mt-5 flex justify-center items-center w-full gap-3">
                <button
                  type="button"
                  className="flex justify-center items-center gap-[0.65rem] [width:300px] [min-height:46px] [padding:0.875rem_1.5rem] bg-white [border:1px_solid_#e2e8f0] rounded-2xl text-base font-semibold text-slate-700 cursor-pointer [box-shadow:0_1px_2px_0_rgba(0,_0,_0,_0.03)] [transition:background-color_0.15s_ease] hover:bg-slate-50"
                  onClick={startGoogleLogin}
                  disabled={pending}
                >
                  <GoogleOutlined className="text-base" />
                  Đăng nhập với Google
                </button>
              </div>

              <div className="mt-6 text-center text-xs">
                <span className="text-slate-500">Bạn mới tham gia NEXUS?</span>
                <Link
                  to={ROUTES.REGISTER}
                  className="font-bold [color:#2f54eb] no-underline ml-1 hover:underline"
                >
                  Tạo tài khoản ngay
                </Link>
              </div>

              <div className="mt-5 [background-color:#fffbeb] [border:1px_solid_#fef3c7] rounded-xl [padding:0.625rem_0.75rem] flex items-center justify-center gap-2">
                <Gift className="w-4 h-4 text-amber-500 [flex-shrink:0]" />
                <span className="text-xs font-semibold [color:#92400e]">
                  Tặng ngay Voucher 500.000đ trải nghiệm đấu giá 3D
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. TRUST BAR
      <div className="bg-slate-100 [border-top:1px_solid_#e2e8f0] [border-bottom:1px_solid_#e2e8f0] [padding:1.5rem_0]">
        <div className="[max-width:80rem] [margin:0_auto] [padding:0_1.5rem]">
          <div className="grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] gap-6 max-[768px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[480px]:[grid-template-columns:minmax(0,_1fr)]">
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm [border:1px_solid_#e2e8f0] flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <h5 className="font-bold text-sm text-slate-900">Bộ Công Thương</h5>
                <p className="text-xs text-slate-500 mt-0.5">Đã thông báo & cấp phép sàn TMDT</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm [border:1px_solid_#e2e8f0] flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <h5 className="font-bold text-sm text-slate-900">Chuẩn PCI-DSS</h5>
                <p className="text-xs text-slate-500 mt-0.5">Mã hóa dữ liệu thanh toán toàn thể</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm [border:1px_solid_#e2e8f0] flex items-center justify-center">
                <SquareCheckBig className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <h5 className="font-bold text-sm text-slate-900">PayOS & Stripe Verified</h5>
                <p className="text-xs text-slate-500 mt-0.5">Ký quỹ cọc đấu giá tự động</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm [border:1px_solid_#e2e8f0] flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <h5 className="font-bold text-sm text-slate-900">GHN Express & Viettel Post</h5>
                <p className="text-xs text-slate-500 mt-0.5">Vận chuyển đồng kiểm niêm phong</p>
              </div>
            </div>
          </div>
        </div>
      </div>*/}

      {/* 4. FOOTER
      <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
        <div className="[max-width:80rem] [margin:0_auto] [padding:0_1.5rem]">
          <div className="grid [grid-template-columns:repeat(5,_minmax(0,_1fr))] gap-8 mb-12 max-[1024px]:[grid-template-columns:repeat(3,_minmax(0,_1fr))] max-[768px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[480px]:[grid-template-columns:minmax(0,_1fr)]">

            <div className="flex flex-col">
              <h4 className="text-white font-bold text-sm mb-4 uppercase [letter-spacing:0.05em]">HỆ SINH THÁI 3D</h4>
              <ul className="[list-style:none] p-0 m-0 flex flex-col gap-2.5">
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Đấu giá 3D Trực tuyến</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">NEXUS Virtual Mall</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Mô hình không gian AR/VR</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Phòng đấu giá VIP Lounge</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Quy chuẩn chống cướp bid</a></li>
              </ul>
            </div>

            <div className="flex flex-col">
              <h4 className="text-white font-bold text-sm mb-4 uppercase [letter-spacing:0.05em]">CHĂM SÓC KHÁCH HÀNG</h4>
              <ul className="[list-style:none] p-0 m-0 flex flex-col gap-2.5">
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Trung tâm trợ giúp 24/7</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Quy chế trả hàng & hoàn tiền</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Chính sách bảo chứng ký quỹ</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Kiểm định vật phẩm 3D</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Liên hệ: support@nexus.vn</a></li>
              </ul>
            </div>

            <div className="flex flex-col">
              <h4 className="text-white font-bold text-sm mb-4 uppercase [letter-spacing:0.05em]">VỀ NEXUS PLATFORM</h4>
              <ul className="[list-style:none] p-0 m-0 flex flex-col gap-2.5">
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Giới thiệu NEXUS Inc.</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Kênh dành cho Nhà bán lẻ</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Tuyển dụng kỹ sư 3D</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Điều khoản dịch vụ</a></li>
                <li><a href="#" className="text-sm text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-blue-500">Chính sách quyền riêng tư</a></li>
              </ul>
            </div>

            <div className="flex flex-col">
              <h4 className="text-white font-bold text-sm mb-4 uppercase [letter-spacing:0.05em]">ĐỐI TÁC THANH TOÁN</h4>
              <div className="flex flex-wrap gap-2 mb-6">
                {['PayOS', 'VISA', 'Stripe', 'Master', 'Napas', 'JCB'].map(pt => (
                  <div key={pt} className="[background-color:rgba(255,_255,_255,_0.1)] [padding:0.25rem_0.5rem] rounded text-xs font-medium [border:1px_solid_rgba(255,_255,_255,_0.05)] text-slate-100">{pt}</div>
                ))}
              </div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase [letter-spacing:0.05em]">KẾT NỐI MẠNG XÃ HỘI</h4>
              <div className="flex gap-3">
                <a href="#" className="w-8 h-8 rounded-full [background-color:rgba(255,_255,_255,_0.1)] flex items-center justify-center no-underline text-white font-bold text-xs [transition:background-color_0.15s_ease] hover:bg-blue-600">FB</a>
                <a href="#" className="w-8 h-8 rounded-full [background-color:rgba(255,_255,_255,_0.1)] flex items-center justify-center no-underline text-white font-bold text-xs [transition:background-color_0.15s_ease] hover:bg-blue-600">YT</a>
                <a href="#" className="w-8 h-8 rounded-full [background-color:rgba(255,_255,_255,_0.1)] flex items-center justify-center no-underline text-white font-bold text-xs [transition:background-color_0.15s_ease] hover:bg-blue-600">IN</a>
              </div>
            </div>

            <div className="flex flex-col">
              <h4 className="text-white font-bold text-sm mb-4 uppercase [letter-spacing:0.05em]">ỨNG DỤNG NEXUS 3D</h4>
              <div className="[background-color:rgba(255,_255,_255,_0.05)] p-4 rounded-xl [border:1px_solid_rgba(255,_255,_255,_0.1)]">
                <div className="flex gap-4 items-center mb-3">
                  <div className="w-16 h-16 bg-white rounded flex items-center justify-center text-slate-800 text-xs font-bold text-center p-1">
                    QR CODE
                  </div>
                  <div className="flex flex-col gap-2 [flex:1]">
                    <button className="[background-color:rgba(255,_255,_255,_0.1)] [border:1px_solid_rgba(255,_255,_255,_0.1)] rounded text-white text-xs font-semibold [padding:0.375rem_0.5rem] cursor-pointer [transition:background-color_0.15s_ease] hover:[background-color:rgba(255,_255,_255,_0.2)]">App Store</button>
                    <button className="[background-color:rgba(255,_255,_255,_0.1)] [border:1px_solid_rgba(255,_255,_255,_0.1)] rounded text-white text-xs font-semibold [padding:0.375rem_0.5rem] cursor-pointer [transition:background-color_0.15s_ease] hover:[background-color:rgba(255,_255,_255,_0.2)]">Google Play</button>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Hỗ trợ trải nghiệm AR không gian ba chiều.</p>
              </div>
            </div>

          </div>

          <div className="pt-8 [border-top:1px_solid_rgba(255,_255,_255,_0.1)] flex justify-between items-center max-[768px]:flex-col max-[768px]:gap-4 max-[768px]:text-center">
            <p className="text-xs text-slate-500">
              © 2025 NEXUS E-Commerce & 3D Auction Inc. Toàn bộ quyền sở hữu trí tuệ và công nghệ đã được đăng ký bảo hộ.
            </p>
            <div className="flex gap-4 items-center text-xs font-medium">
              <a href="#" className="text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-white">Bảo mật</a>
              <span className="text-slate-700">•</span>
              <a href="#" className="text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-white">Điều khoản</a>
              <span className="text-slate-700">•</span>
              <a href="#" className="text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-white">Sơ đồ sàn</a>
              <span className="text-slate-700">•</span>
              <a href="#" className="text-slate-300 no-underline [transition:color_0.15s_ease] hover:text-white">Việt Nam (VN)</a>
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
