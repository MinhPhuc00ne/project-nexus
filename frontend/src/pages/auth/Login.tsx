import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@nexus/contracts';
import { login, startGoogleLogin } from '@/features/auth/services/auth';
import { useAuth } from '../../contexts/AuthContext';
import {
  clearPasswordChangedNotice,
  hasPasswordChangedNotice,
} from '@/features/auth/services/authNotice';
import { ROUTES } from '../../routes/paths';
import { useToast } from '../../components/ToastNotification';
import ForgotPasswordModal from './ForgotPasswordModal';
import AuthHeroSection from './AuthHeroSection';
import { Lock, Eye, EyeOff, Gift, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Login: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { login: establishSession } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const toast = useToast();
  const initialEmail = (() => {
    try {
      return sessionStorage.getItem('nexus:verified-email') || '';
    } catch {
      return '';
    }
  })();
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: initialEmail, password: '' },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(() =>
    (location.state as { passwordChanged?: boolean } | null)?.passwordChanged ||
    hasPasswordChangedNotice()
      ? t('login.passwordChangedNotice')
      : searchParams.get('verified') === '1'
        ? t('login.emailVerifiedNotice')
        : '',
  );
  const [failed, setFailed] = useState(false);
  const requestInFlight = useRef(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  useEffect(() => {
    clearPasswordChangedNotice();
    try {
      sessionStorage.removeItem('nexus:verified-email');
    } catch {
      /* Storage may be disabled. */
    }
    const routeState = location.state as { passwordChanged?: boolean; from?: string } | null;
    if (searchParams.get('verified') === '1' || routeState?.passwordChanged) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('verified');
      const nextState = { ...routeState };
      delete nextState.passwordChanged;
      navigate(
        {
          pathname: location.pathname,
          search: nextParams.toString() ? `?${nextParams}` : '',
          hash: location.hash,
        },
        { replace: true, state: Object.keys(nextState).length ? nextState : null },
      );
    }
  }, [searchParams, location.pathname, location.hash, location.state, navigate]);
  async function handleLogin(values: LoginInput): Promise<void> {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(true);
    setFeedback('');
    setFailed(false);
    try {
      const result = await login(values.email.trim(), values.password);

      // Lưu session & nạp thông tin user
      const sessionPromise = establishSession(result.user, result.accessToken, result.refreshToken);

      // Hiển thị thông báo Toast thành công ngay lập tức
      toast.success(t('login.successToast', { name: result.user.fullName || result.user.email }));

      // Xác định ngay trang đích trực tiếp không qua redirect trung gian
      const redirectPath = (location.state as { from?: string })?.from;
      let target: string = ROUTES.HOME;
      if (redirectPath && redirectPath !== '/login') {
        target = redirectPath;
      } else if (result.user.role === 'ADMIN') {
        target = '/admin/overview';
      } else if (result.user.role === 'SUPPORT_STAFF') {
        target = ROUTES.STAFF_INBOX;
      } else if (result.user.role === 'SELLER') {
        target = ROUTES.SELLER;
      }

      await sessionPromise;
      navigate(target, { replace: true });
    } catch (error: unknown) {
      setFailed(true);
      const msg = error instanceof Error ? error.message : t('login.failedDefault');
      setFeedback(msg);
      toast.error(msg);
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="nexus-shell flex flex-col [font-family:var(--font-sans,_system-ui,_-apple-system,_sans-serif)]">
      <main className="[flex:1] [max-width:80rem] w-full [margin:0_auto] [padding:2.5rem_1.5rem] max-[480px]:[padding:1.5rem_1rem]">
        <div className="grid [grid-template-columns:repeat(12,_minmax(0,_1fr))] gap-8 items-stretch max-[1024px]:[grid-template-columns:minmax(0,_1fr)] max-[1024px]:gap-10">
          <AuthHeroSection />

          <div className="order-1 min-[1025px]:order-2 [grid-column:span_5_/_span_5] flex items-center max-[1024px]:[grid-column:1_/_-1] max-[1024px]:min-w-0 max-[1024px]:mx-auto max-[1024px]:w-full max-[1024px]:max-w-lg">
            <div className="nexus-auth-card w-full [padding:2.25rem_2rem] relative overflow-hidden max-[480px]:[padding:1.75rem_1.25rem]">
              <div className="mb-6">
                <h2 className="text-3xl font-semibold text-ink [letter-spacing:-0.025em]">
                  {t('login.title')}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('login.subtitle')}</p>
              </div>

              <form
                onSubmit={(e) => {
                  void handleSubmit(handleLogin)(e);
                }}
                className="flex flex-col gap-4"
                aria-busy={pending}
              >
                <div className="flex flex-col">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-700 mb-1.5">
                    {t('login.emailLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute [inset-block:0] left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 [&_svg]:w-4 [&_svg]:h-4">
                      <User />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="username"
                      disabled={pending}
                      className="block w-full [padding:0.625rem_0.875rem_0.625rem_2.5rem] [background-color:rgba(248,_250,_252,_0.5)] [border:1px_solid_#e2e8f0] rounded-xl text-sm text-slate-800 [outline:none] [transition:all_0.15s_ease] [&::placeholder]:text-slate-400 focus:bg-white focus:border-blue-600 focus:[box-shadow:0_0_0_3px_rgba(37,_99,_235,_0.15)]"
                      placeholder={t('login.emailPlaceholder')}
                      {...register('email', {
                        onChange: () => {
                          setFeedback('');
                          setFailed(false);
                        },
                      })}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      htmlFor="password"
                      className="text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      {t('login.passwordLabel')}
                    </label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-blue-600 no-underline hover:underline bg-transparent border-0 cursor-pointer text-indigo-600 hover:text-indigo-800"
                      onClick={() => setShowForgotModal(true)}
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute [inset-block:0] left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 [&_svg]:w-4 [&_svg]:h-4">
                      <Lock />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="block w-full [padding:0.625rem_0.875rem_0.625rem_2.5rem] [background-color:rgba(248,_250,_252,_0.5)] [border:1px_solid_#e2e8f0] rounded-xl text-sm text-slate-800 [outline:none] [transition:all_0.15s_ease] [&::placeholder]:text-slate-400 focus:bg-white focus:border-blue-600 focus:[box-shadow:0_0_0_3px_rgba(37,_99,_235,_0.15)]"
                      placeholder={t('login.passwordPlaceholder')}
                      autoComplete="current-password"
                      disabled={pending}
                      {...register('password', {
                        onChange: () => {
                          setFeedback('');
                          setFailed(false);
                        },
                      })}
                    />
                    <button
                      type="button"
                      className="absolute [inset-block:0] right-0 pr-3.5 flex items-center [background:none] [border:none] cursor-pointer text-slate-400 [transition:color_0.15s_ease] hover:text-slate-600 [&_svg]:w-4 [&_svg]:h-4"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('login.sslNotice')}</span>
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
                  className="w-full mt-2 h-11 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-sm flex justify-center items-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={pending}
                >
                  {pending ? t('login.submitting') : t('login.submit')}{' '}
                </Button>
              </form>

              <div className="mt-6 relative">
                <div className="absolute [inset:0] flex items-center [&_hr]:w-full [&_hr]:[border-top:1px_solid_#f1f5f9]">
                  <hr />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="[padding:0_0.75rem] bg-white text-slate-400 font-medium [letter-spacing:0.05em]">
                    {t('login.orContinueWith')}
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
                  <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  {t('login.googleButton')}
                </Button>
              </div>

              <div className="mt-6 text-center text-xs">
                <span className="text-slate-500">{t('login.noAccount')}</span>
                <Link
                  to={ROUTES.REGISTER}
                  className="font-bold [color:#2f54eb] no-underline ml-1 hover:underline"
                >
                  {t('login.registerLink')}
                </Link>
              </div>

              <div className="mt-5 [background-color:#fffbeb] [border:1px_solid_#fef3c7] rounded-xl [padding:0.625rem_0.75rem] flex items-center justify-center gap-2">
                <Gift className="w-4 h-4 text-amber-500 [flex-shrink:0]" />
                <span className="text-xs font-semibold [color:#92400e]">
                  {t('login.voucherBanner')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <ForgotPasswordModal
        isOpen={showForgotModal}
        initialEmail={getValues('email').trim()}
        onClose={() => setShowForgotModal(false)}
        onSuccess={(resetEmail, msg) => {
          setValue('email', resetEmail);
          setValue('password', '');
          setFeedback(msg);
          setFailed(false);
        }}
      />
    </div>
  );
};

export default Login;
