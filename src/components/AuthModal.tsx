import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  createAccountWithEmail,
  getAuthErrorMessage,
  isAuthPopupDismissed,
  resetPasswordByEmail,
  signInWithEmail,
  signInWithGoogle
} from '../lib/auth';

type AuthMode = 'signin' | 'signup';

type Props = {
  darkMode: boolean;
  onClose: () => void;
  onAuthenticated: (user: User) => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthModal({ darkMode, onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  const switchMode = (nextMode: AuthMode) => {
    if (loading) return;
    setMode(nextMode);
    setPassword('');
    setPasswordConfirm('');
    setStatus(null);
  };

  const validate = () => {
    const normalizedEmail = email.trim();

    if (!emailPattern.test(normalizedEmail)) {
      return 'Vui lòng nhập email hợp lệ.';
    }

    if (mode === 'signup' && fullName.trim().length < 2) {
      return 'Vui lòng nhập họ và tên.';
    }

    if (password.length < 8) {
      return 'Mật khẩu cần ít nhất 8 ký tự.';
    }

    if (mode === 'signup' && password !== passwordConfirm) {
      return 'Mật khẩu nhập lại chưa khớp.';
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const validationMessage = validate();
    if (validationMessage) {
      setStatus({ type: 'error', message: validationMessage });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const credential = mode === 'signup'
        ? await createAccountWithEmail(fullName, email, password)
        : await signInWithEmail(email, password);

      onAuthenticated(credential.user);
    } catch (error) {
      setStatus({ type: 'error', message: getAuthErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;

    setLoading(true);
    setStatus(null);

    try {
      const credential = await signInWithGoogle();
      onAuthenticated(credential.user);
    } catch (error) {
      if (!isAuthPopupDismissed(error)) {
        setStatus({ type: 'error', message: getAuthErrorMessage(error) });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (loading) return;

    const normalizedEmail = email.trim();
    if (!emailPattern.test(normalizedEmail)) {
      setStatus({ type: 'error', message: 'Nhập email trước để nhận liên kết đặt lại mật khẩu.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await resetPasswordByEmail(normalizedEmail);
      setStatus({
        type: 'success',
        message: 'Đã gửi email đặt lại mật khẩu. Kiểm tra Hộp thư đến hoặc Spam.'
      });
    } catch (error) {
      setStatus({ type: 'error', message: getAuthErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const surface = darkMode
    ? 'border-slate-700 bg-slate-900 text-slate-100'
    : 'border-slate-200 bg-white text-slate-950';
  const mutedSurface = darkMode
    ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500'
    : 'border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nocnom-auth-title"
      onMouseDown={event => {
        if (event.currentTarget === event.target && !loading) onClose();
      }}
    >
      <div className={'w-full max-w-md overflow-hidden rounded-[28px] border shadow-2xl ' + surface}>
        <div className={'flex items-start justify-between gap-4 border-b p-5 ' + (darkMode ? 'border-slate-800' : 'border-slate-100')}>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">nOcnOm Account</div>
            <h2 id="nocnom-auth-title" className="mt-1 text-xl font-black">
              {mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Dùng Email hoặc Google. Không bắt buộc tài khoản Google.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl disabled:opacity-50 ' + (darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500')}
            aria-label="Đóng đăng nhập"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className={'grid grid-cols-2 rounded-2xl p-1 ' + (darkMode ? 'bg-slate-950' : 'bg-slate-100')}>
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={
                'min-h-10 rounded-xl px-3 text-xs font-black transition-colors ' +
                (mode === 'signin'
                  ? (darkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-950 shadow-sm')
                  : 'text-slate-500')
              }
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={
                'min-h-10 rounded-xl px-3 text-xs font-black transition-colors ' +
                (mode === 'signup'
                  ? (darkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-950 shadow-sm')
                  : 'text-slate-500')
              }
            >
              Tạo tài khoản
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3" noValidate>
            {mode === 'signup' && (
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Họ và tên</span>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={fullName}
                    onChange={event => {
                      setFullName(event.target.value);
                      setStatus(null);
                    }}
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    className={'h-12 w-full rounded-2xl border pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 ' + mutedSurface}
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    setStatus(null);
                  }}
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="ten@email.com"
                  className={'h-12 w-full rounded-2xl border pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 ' + mutedSurface}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Mật khẩu</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={event => {
                    setPassword(event.target.value);
                    setStatus(null);
                  }}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'signup' ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'}
                  className={'h-12 w-full rounded-2xl border pl-10 pr-12 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 ' + mutedSurface}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {mode === 'signup' && (
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Nhập lại mật khẩu</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={event => {
                    setPasswordConfirm(event.target.value);
                    setStatus(null);
                  }}
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  className={'h-12 w-full rounded-2xl border px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 ' + mutedSurface}
                />
              </label>
            )}

            {mode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleResetPassword()}
                  disabled={loading}
                  className="min-h-9 px-1 text-xs font-black text-blue-600 disabled:opacity-50"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {status && (
              <div
                role="status"
                aria-live="polite"
                className={
                  'rounded-2xl px-4 py-3 text-xs font-bold ' +
                  (status.type === 'success'
                    ? (darkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
                    : (darkMode ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-700'))
                }
              >
                {status.message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-12 w-full rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {loading
                ? 'Đang xử lý...'
                : mode === 'signin'
                  ? 'Đăng nhập bằng Email'
                  : 'Tạo tài khoản bằng Email'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className={'h-px flex-1 ' + (darkMode ? 'bg-slate-800' : 'bg-slate-200')} />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">hoặc</span>
            <div className={'h-px flex-1 ' + (darkMode ? 'bg-slate-800' : 'bg-slate-200')} />
          </div>

          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={loading}
            className={
              'min-h-12 w-full rounded-2xl border px-4 text-sm font-black transition-colors disabled:opacity-60 ' +
              (darkMode
                ? 'border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')
            }
          >
            Tiếp tục bằng Google
          </button>

          <p className="mt-4 text-center text-[10px] font-medium leading-relaxed text-slate-500">
            Mật khẩu được Firebase Authentication xử lý trực tiếp và không được lưu trong dữ liệu ứng dụng nOcnOm.
          </p>
        </div>
      </div>
    </div>
  );
}
