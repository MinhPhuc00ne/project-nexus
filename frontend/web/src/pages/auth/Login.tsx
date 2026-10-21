import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { GoogleOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { login, saveAuthSession, startGoogleLogin } from '../../services/auth';
import { mergeGuestCartAfterLogin } from '../../services/cart';
import { ROUTES } from '../../routes/AppRouter';
import ForgotPasswordModal from './ForgotPasswordModal';
import AuthHeroSection from './AuthHeroSection';
import { ArrowLeft, Lock, Eye, EyeOff, Gift, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const [showForgotModal, setShowForgotModal] = useState(false);
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

      // Gộp giỏ hàng khách vào database tài khoản trước khi chuyển trang
      try {
        await mergeGuestCartAfterLogin();
      } catch (mergeErr) {
        console.error('Lỗi khi gộp giỏ hàng khách vào tài khoản:', mergeErr);
      }

      const redirectPath = (location.state as { from?: string })?.from;
      if (redirectPath) {
        navigate(redirectPath);
      } else if (result.user.role === 'ADMIN') {
        navigate(ROUTES.ADMIN);
      } else if (result.user.role === 'SUPPORT_STAFF') {
        navigate(ROUTES.STAFF);
      } else if (result.user.role === 'SELLER') {
        navigate(ROUTES.SELLER);
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
      <main className="[flex:1] [max-width:80rem] w-full [margin:0_auto] [padding:2.5rem_1.5rem] max-[480px]:[padding:1.5rem_1rem]">
        <div className="grid [grid-template-columns:repeat(12,_minmax(0,_1fr))] gap-12 items-center max-[1024px]:[grid-template-columns:minmax(0,_1fr)] max-[1024px]:gap-10">
          <AuthHeroSection />

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
                      id="email"
                      name="email"
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
                    <label
                      htmlFor="password"
                      className="text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-blue-600 no-underline hover:underline bg-transparent border-0 cursor-pointer text-indigo-600 hover:text-indigo-800"
                      onClick={() => setShowForgotModal(true)}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute [inset-block:0] left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 [&_svg]:w-4 [&_svg]:h-4">
                      <Lock />
                    </div>
                    <input
                      id="password"
                      name="password"
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
                <Button
                  id="login-submit-button"
                  type="submit"
                  className="w-full mt-2 h-11 bg-[#2f54eb] hover:bg-[#2040c7] text-white text-sm font-bold rounded-xl shadow-[0_10px_15px_-3px_rgba(47,84,235,0.25)] flex justify-center items-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={pending}
                >
                  {pending ? 'ĐANG ĐĂNG NHẬP…' : 'ĐĂNG NHẬP'}{' '}
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Button>
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
                <Button
                  type="button"
                  variant="outline"
                  className="flex justify-center items-center gap-[0.65rem] w-[300px] min-h-[46px] px-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                  onClick={startGoogleLogin}
                  disabled={pending}
                >
                  <GoogleOutlined className="text-base" />
                  Đăng nhập với Google
                </Button>
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
      <ForgotPasswordModal
        isOpen={showForgotModal}
        initialEmail={email.trim()}
        onClose={() => setShowForgotModal(false)}
        onSuccess={(resetEmail, msg) => {
          setEmail(resetEmail);
          setPassword('');
          setFeedback(msg);
          setFailed(false);
        }}
      />
    </div>
  );
};

export default Login;
