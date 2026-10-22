import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import Popup from '../Popup';
import { useAuth } from '../../contexts/AuthContext';
import useChangePassword from './useChangePassword';

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

export default function ChangePasswordModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const state = useChangePassword(
    userId,
    () => {
      logout();
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    },
    onClose,
  );
  const busy = Boolean(state.pending);
  return (
    <Popup
      isOpen
      onClose={state.close}
      title="Đổi mật khẩu"
      closeOnOverlay={!busy}
      closeOnEsc={!busy}
      showCloseButton={!busy}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void state.confirm();
        }}
        className="space-y-5"
        aria-busy={busy}
      >
        <p className="text-sm leading-6 text-slate-600">
          Nhận mã OTP qua email để xác nhận đổi mật khẩu. Sau khi đổi thành công, bạn cần đăng nhập
          lại.
        </p>
        <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <button
            type="button"
            disabled={busy || state.resendWait > 0}
            onClick={() => void state.requestOtp()}
            className={buttonClass}
          >
            <MailOutlined />{' '}
            {state.pending === 'request'
              ? 'Đang gửi mã…'
              : state.resendWait > 0
                ? `Gửi lại sau ${state.resendWait}s`
                : state.sent
                  ? 'Gửi lại mã OTP'
                  : 'Gửi mã OTP qua email'}
          </button>
          {state.message && (
            <p role="status" className="break-words text-sm leading-6 text-blue-800">
              {state.message}
            </p>
          )}
          {state.sent && (
            <p className="text-xs text-slate-600">
              {state.remaining > 0
                ? `Mã có hiệu lực còn ${Math.floor(state.remaining / 60)} phút ${state.remaining % 60} giây.`
                : 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.'}
            </p>
          )}
        </div>
        {state.sent && (
          <fieldset disabled={busy} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Mã OTP
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={state.otp}
                onChange={(event) =>
                  state.setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                className={inputClass}
                placeholder="Nhập 6 chữ số trong email"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Mật khẩu mới
              <div className="relative">
                <input
                  type={visible ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={state.newPassword}
                  onChange={(event) => state.setNewPassword(event.target.value)}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={visible}
                  onClick={() => setVisible((value) => !value)}
                  className="absolute bottom-0 right-0 flex h-12 w-12 items-center justify-center text-slate-500"
                >
                  {visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
              <span className="mt-2 block text-xs font-normal text-slate-500">
                Ít nhất 8 ký tự, có chữ hoa và ký tự đặc biệt.
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Xác nhận mật khẩu mới
              <input
                type={visible ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={state.confirmation}
                onChange={(event) => state.setConfirmation(event.target.value)}
                className={inputClass}
              />
            </label>
          </fieldset>
        )}
        {state.error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={state.close}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm disabled:opacity-50"
          >
            Hủy
          </button>
          {state.sent && (
            <button type="submit" disabled={busy || state.remaining === 0} className={buttonClass}>
              <LockOutlined /> {state.pending === 'confirm' ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}
            </button>
          )}
        </div>
      </form>
    </Popup>
  );
}
