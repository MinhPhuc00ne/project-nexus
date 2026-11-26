import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { register, RegistrationError, verifyEmail } from '@/features/auth/services/auth';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  RectangleEllipsis,
  UserRound,
} from 'lucide-react';

type RegistrationField =
  'fullName' | 'email' | 'password' | 'confirmPassword' | 'code' | 'agreement';
type FieldErrors = Partial<Record<RegistrationField, string[]>>;

function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
  t: TFunction<'auth'>,
): string[] | undefined {
  if (!confirmPassword) return [t('registerForm.errors.confirmRequired')];
  if (confirmPassword !== password) return [t('registerForm.errors.confirmMismatch')];
  return undefined;
}

function validateRegistration(
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
  agreement: boolean,
  t: TFunction<'auth'>,
) {
  const errors: FieldErrors = {};
  if (!fullName.trim()) errors.fullName = [t('registerForm.errors.fullNameRequired')];
  if (!email.trim()) {
    errors.email = [t('registerForm.errors.emailRequired')];
  } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim())) {
    errors.email = [t('registerForm.errors.emailInvalid')];
  }
  if (!password) {
    errors.password = [t('registerForm.errors.passwordRequired')];
  } else {
    const passwordErrors = [];
    if (password.length < 8) passwordErrors.push(t('registerForm.errors.passwordMinLength'));
    if (!/[A-Z]/.test(password) || !/[^a-zA-Z0-9\s]/.test(password)) {
      passwordErrors.push(t('registerForm.errors.passwordComplexity'));
    }
    if (passwordErrors.length) errors.password = passwordErrors;
  }
  const confirmationErrors = validatePasswordConfirmation(password, confirmPassword, t);
  if (confirmationErrors) errors.confirmPassword = confirmationErrors;
  if (!agreement) errors.agreement = [t('registerForm.errors.agreementRequired')];
  return errors;
}

// Backend hiện trả thông báo văn bản, chưa kèm tên trường cho từng lỗi.
function getRegistrationField(message: string, verifying: boolean): RegistrationField | undefined {
  const text = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/email|gmail/.test(text)) return 'email';
  if (/password|mat khau/.test(text)) return 'password';
  if (/fullname|full name|ho va ten/.test(text)) return 'fullName';
  if (verifying && /\botp\b|\bcode\b|ma xac thuc/.test(text)) return 'code';
  return undefined;
}

function FieldError({ field, errors }: { field: RegistrationField; errors: FieldErrors }) {
  if (!errors[field]?.length) return null;
  return (
    <div
      id={`register-${field}-error`}
      className="mt-1 space-y-1 text-xs text-red-600"
      role="alert"
    >
      {errors[field].map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  );
}

export default function RegisterForm() {
  const { t } = useTranslation('auth');
  const [contact, setContact] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pending, setPending] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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

  function clearFieldError(field: RegistrationField): void {
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  function validateDetailsField(
    field: 'fullName' | 'email' | 'password' | 'confirmPassword',
  ): void {
    const errors = validateRegistration(fullName, contact, password, confirmPassword, agreement, t);
    setFieldErrors((previous) => ({ ...previous, [field]: errors[field] }));
  }

  function showRequestError(error: unknown, verifying: boolean): void {
    const errors: FieldErrors = {};
    const generalMessages: string[] = [];
    if (error instanceof RegistrationError && (error.status === 400 || error.status === 409)) {
      for (const message of error.messages) {
        const field = getRegistrationField(message, verifying);
        if (field) errors[field] = [...(errors[field] ?? []), message];
        else generalMessages.push(message);
      }
    } else {
      generalMessages.push(
        error instanceof Error ? error.message : t('registerForm.errors.requestFailed'),
      );
    }
    setFieldErrors(errors);
    setFailed(true);
    setFeedback(generalMessages.join(' · '));
  }

  function editDetails(): void {
    setSentEmail('');
    setCode('');
    setFeedback('');
    setFailed(false);
    setFieldErrors({});
    window.requestAnimationFrame(() => document.getElementById('register-contact')?.focus());
  }

  async function handleSendOtp(): Promise<void> {
    // Chặn gửi trùng, gửi sau khi xác thực hoặc gửi lại trước 60 giây.
    if (requestInFlight.current || verified || Date.now() < resendAt) return;
    const email = contact.trim();
    const validationErrors = validateRegistration(
      fullName,
      email,
      password,
      confirmPassword,
      agreement,
      t,
    );
    setFieldErrors(validationErrors);
    setFeedback('');
    if (Object.keys(validationErrors).length) {
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
      setCode('');
      setFeedback(result.message);
      window.requestAnimationFrame(() => document.getElementById('register-otp')?.focus());
    } catch (error: unknown) {
      showRequestError(error, false);
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (requestInFlight.current || verified) return;
    if (!sentEmail || sentEmail !== contact.trim()) {
      setFieldErrors({ email: [t('registerForm.errors.sendOtpFirst')] });
      setFeedback('');
      return;
    }
    const validationErrors: FieldErrors = {};
    if (!/^[0-9]{6}$/.test(code)) {
      validationErrors.code = [
        code ? t('registerForm.errors.otpSixDigits') : t('registerForm.errors.otpRequired'),
      ];
    }
    if (!agreement) validationErrors.agreement = [t('registerForm.errors.agreementRequired')];
    setFieldErrors(validationErrors);
    setFeedback('');
    if (Object.keys(validationErrors).length) {
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
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setFeedback(result.message);
      try {
        sessionStorage.setItem('nexus:verified-email', sentEmail);
      } catch {
        /* Storage may be disabled. */
      }
      window.location.assign('/login?verified=1');
    } catch (error: unknown) {
      showRequestError(error, true);
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  }

  return (
    <section
      className="mx-auto w-full max-w-[526px] rounded-2xl border border-slate-200/80 bg-white px-6 py-8 shadow-[0_18px_24px_-14px_rgb(15_23_42_/_25%),0_4px_6px_-4px_rgb(15_23_42_/_12%)] sm:px-[30px]"
      aria-labelledby="register-form-title"
    >
      <h2 id="register-form-title" className="text-xl leading-7 font-bold">
        {t('registerForm.title')}
      </h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{t('registerForm.subtitle')}</p>

      <form
        noValidate
        className="mt-4 flex flex-col gap-3.5"
        onSubmit={handleSubmit}
        aria-busy={pending}
      >
        <div>
          <label
            className="mb-1 block text-xs leading-5 font-medium text-slate-700"
            htmlFor="register-name"
          >
            {t('registerForm.fullNameLabel')} <span className="text-red-500">*</span>
          </label>
          <div className="flex min-h-9 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <UserRound size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input
              id="register-name"
              name="name"
              value={fullName}
              disabled={pending || Boolean(sentEmail)}
              onChange={(event) => {
                setFullName(event.target.value);
                clearFieldError('fullName');
              }}
              onBlur={() => validateDetailsField('fullName')}
              aria-invalid={Boolean(fieldErrors.fullName?.length)}
              aria-describedby={
                fieldErrors.fullName?.length ? 'register-fullName-error' : undefined
              }
              autoComplete="name"
              placeholder={t('registerForm.fullNamePlaceholder')}
              required
              maxLength={100}
              pattern=".*\S.*"
              className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-900 outline-none placeholder:text-slate-500"
            />
          </div>
          <FieldError field="fullName" errors={fieldErrors} />
        </div>

        <div>
          <label
            className="mb-1 block text-xs leading-5 font-medium text-slate-700"
            htmlFor="register-contact"
          >
            {t('registerForm.emailLabel')} <span className="text-red-500">*</span>
          </label>
          <div className="flex min-h-9 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <Mail size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input
              id="register-contact"
              name="contact"
              type="email"
              disabled={pending || Boolean(sentEmail)}
              autoComplete="username"
              placeholder={t('registerForm.emailPlaceholder')}
              required
              value={contact}
              onChange={(event) => {
                setContact(event.target.value);
                clearFieldError('email');
                setFeedback('');
              }}
              onBlur={() => validateDetailsField('email')}
              aria-invalid={Boolean(fieldErrors.email?.length)}
              aria-describedby={fieldErrors.email?.length ? 'register-email-error' : undefined}
              className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-900 outline-none placeholder:text-slate-500"
            />
            <button
              className="shrink-0 cursor-pointer rounded-md bg-blue-50 px-2 py-1.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={handleSendOtp}
              disabled={pending || verified || resendSeconds > 0}
            >
              {pending
                ? t('registerForm.processing')
                : resendSeconds > 0
                  ? t('registerForm.resendIn', { seconds: resendSeconds })
                  : sentEmail
                    ? t('registerForm.resendOtp')
                    : t('registerForm.sendOtp')}
            </button>
          </div>
          <FieldError field="email" errors={fieldErrors} />
        </div>

        {sentEmail && !verified && (
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
            <p className="mb-2">{t('registerForm.otpSentBanner', { email: sentEmail })}</p>
            <button
              type="button"
              className="shrink-0 cursor-pointer rounded-md bg-blue-50 px-2 py-1.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
              onClick={editDetails}
            >
              {t('registerForm.editDetails')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              className="mb-1 block text-xs leading-5 font-medium text-slate-700"
              htmlFor="register-password"
            >
              {t('registerForm.passwordLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="flex min-h-9 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <LockKeyhole size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
              <input
                id="register-password"
                name="password"
                value={password}
                disabled={pending || Boolean(sentEmail)}
                onChange={(event) => {
                  const nextPassword = event.target.value;
                  setPassword(nextPassword);
                  setFieldErrors((previous) => ({
                    ...previous,
                    password: undefined,
                    confirmPassword: confirmPassword
                      ? validatePasswordConfirmation(nextPassword, confirmPassword, t)
                      : previous.confirmPassword,
                  }));
                }}
                onBlur={() => validateDetailsField('password')}
                aria-invalid={Boolean(fieldErrors.password?.length)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-describedby={`register-password-hint${fieldErrors.password?.length ? ' register-password-error' : ''}`}
                placeholder={t('registerForm.passwordPlaceholder')}
                minLength={8}
                required
                className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-900 outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                aria-label={
                  showPassword ? t('registerForm.hidePassword') : t('registerForm.showPassword')
                }
                aria-pressed={showPassword}
                aria-controls="register-password"
                disabled={pending || verified}
                onClick={() => setShowPassword((previous) => !previous)}
                className="shrink-0 rounded p-1 text-slate-500 hover:text-blue-600 disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            <FieldError field="password" errors={fieldErrors} />
            <p id="register-password-hint" className="mt-1 text-[10px] leading-4 text-slate-500">
              {t('registerForm.passwordHint')}
            </p>
          </div>
          <div>
            <label
              className="mb-1 block text-xs leading-5 font-medium text-slate-700"
              htmlFor="register-confirm-password"
            >
              {t('registerForm.confirmPasswordLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="flex min-h-9 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <LockKeyhole size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                disabled={pending || Boolean(sentEmail)}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  clearFieldError('confirmPassword');
                }}
                onBlur={() => validateDetailsField('confirmPassword')}
                aria-invalid={Boolean(fieldErrors.confirmPassword?.length)}
                aria-describedby={
                  fieldErrors.confirmPassword?.length ? 'register-confirmPassword-error' : undefined
                }
                autoComplete="new-password"
                placeholder={t('registerForm.confirmPasswordPlaceholder')}
                required
                className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-900 outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                aria-label={
                  showConfirmPassword
                    ? t('registerForm.hideConfirmPassword')
                    : t('registerForm.showConfirmPassword')
                }
                aria-pressed={showConfirmPassword}
                aria-controls="register-confirm-password"
                disabled={pending || verified}
                onClick={() => setShowConfirmPassword((previous) => !previous)}
                className="shrink-0 rounded p-1 text-slate-500 hover:text-blue-600 disabled:opacity-50"
              >
                {showConfirmPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            <FieldError field="confirmPassword" errors={fieldErrors} />
          </div>
          <div className="sm:col-span-2">
            <label
              className="mb-1 block text-xs leading-5 font-medium text-slate-700"
              htmlFor="register-otp"
            >
              {t('registerForm.otpLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="flex min-h-9 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <RectangleEllipsis size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
              <input
                id="register-otp"
                name="otp"
                value={code}
                disabled={pending || !sentEmail || verified}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                  clearFieldError('code');
                  setFeedback('');
                  setFailed(false);
                }}
                aria-invalid={Boolean(fieldErrors.code?.length)}
                aria-describedby={fieldErrors.code?.length ? 'register-code-error' : undefined}
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder={t('registerForm.otpPlaceholder')}
                pattern="[0-9]{6}"
                maxLength={6}
                title={t('registerForm.otpTitle')}
                required
                className="min-w-0 flex-1 bg-transparent py-2 font-mono text-xs tracking-wider text-slate-900 outline-none placeholder:text-slate-500"
              />
            </div>
            <FieldError field="code" errors={fieldErrors} />
          </div>
        </div>

        <div className="mt-1 flex items-start gap-2 text-[11px] leading-[1.7] text-slate-500">
          <input
            id="register-agreement"
            name="agreement"
            checked={agreement}
            disabled={pending || verified}
            onChange={(event) => {
              setAgreement(event.target.checked);
              clearFieldError('agreement');
            }}
            aria-invalid={Boolean(fieldErrors.agreement?.length)}
            aria-describedby={
              fieldErrors.agreement?.length ? 'register-agreement-error' : undefined
            }
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          />
          <label className="[&_a]:text-blue-600 [&_a:hover]:underline" htmlFor="register-agreement">
            {t('registerForm.agreementPrefix')} <a href="/terms">{t('registerForm.termsLink')}</a>{' '}
            {t('registerForm.agreementAnd')} <a href="/privacy">{t('registerForm.privacyLink')}</a>{' '}
            {t('registerForm.agreementSuffix')}
          </label>
        </div>
        <FieldError field="agreement" errors={fieldErrors} />

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
          {pending
            ? t('registerForm.processing')
            : verified
              ? t('registerForm.verified')
              : t('registerForm.submitVerify')}{' '}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>

      <p className="mt-[18px] border-t border-slate-100 pt-4 text-center text-xs leading-5 text-slate-500">
        {t('registerForm.alreadyHaveAccount')}{' '}
        <a className="ml-1 font-medium text-blue-600 hover:underline" href="/login">
          {t('registerForm.loginNow')}
        </a>
      </p>
    </section>
  );
}
