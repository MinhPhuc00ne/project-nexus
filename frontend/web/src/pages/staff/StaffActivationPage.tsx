import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  activateStaff,
  getStaffInvitationInfo,
  type StaffInvitationInfo,
} from '../../services/staff';

// Link trong thư mời mở trang này; không đặt trong layout yêu cầu đăng nhập.
export default function StaffActivationPage() {
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [info, setInfo] = useState<StaffInvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [assignedEmail, setAssignedEmail] = useState('');
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    setInfo(null);
    setAssignedEmail('');
    setPassword('');
    setConfirmation('');
    setError('');
    setLoading(true);
    if (!token) {
      setError('Link kích hoạt thiếu mã token. Vui lòng mở đúng link trong email mời.');
      setLoading(false);
      return;
    }
    void getStaffInvitationInfo(token)
      .then((result) => {
        if (!active) return;
        setInfo(result);
        setFullName(result.fullName);
        setPhoneNumber(result.phoneNumber ?? '');
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải lời mời.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, retry]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current || !info) return;
    if (!fullName.trim() || !phoneNumber.trim()) {
      setError('Vui lòng nhập họ tên và số điện thoại.');
      return;
    }
    if (password !== confirmation) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const result = await activateStaff({
        token,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        newPassword: password,
        confirmPassword: confirmation,
      });
      setAssignedEmail(result.assignedEmail);
      setPassword('');
      setConfirmation('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể kích hoạt tài khoản.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm';
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-lg space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-primary">Kích hoạt tài khoản Staff</h1>
        {loading ? (
          <p role="status">Đang kiểm tra lời mời…</p>
        ) : assignedEmail ? (
          <div role="status" className="space-y-3">
            <p>
              Kích hoạt thành công. Đăng nhập bằng <b>{assignedEmail}</b> và mật khẩu vừa tạo.
            </p>
            <Link to="/login" className="text-primary underline">
              Đến trang đăng nhập
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            {!info && token && (
              <button onClick={() => setRetry((value) => value + 1)}>Thử lại</button>
            )}
            {info && (
              <form onSubmit={submit} className="space-y-4">
                <p className="break-all text-sm">
                  Tài khoản được cấp: <b>{info.assignedEmail || 'Được cấp khi kích hoạt'}</b>
                </p>
                <p className="break-all text-sm text-slate-500">
                  Email nhận lời mời: {info.personalEmail}
                </p>
                <fieldset disabled={pending} className="space-y-4">
                  <label className="block text-sm">
                    Họ và tên
                    <input
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      autoComplete="name"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    Số điện thoại
                    <input
                      required
                      type="tel"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    Mật khẩu mới
                    <input
                      required
                      type="password"
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    Xác nhận mật khẩu
                    <input
                      required
                      type="password"
                      minLength={6}
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </label>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-primary p-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {pending ? 'Đang kích hoạt…' : 'Kích hoạt tài khoản'}
                  </button>
                </fieldset>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
