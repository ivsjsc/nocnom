import { useEffect, useRef, useState } from 'react';
import { LogOut, Settings2, UserRound } from 'lucide-react';
import { signOut, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ProfileModal from './ProfileModal';

const getInitials = (value?: string | null) => {
  if (!value) return 'NG';
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

type LoginProps = {
  user: User | null;
  darkMode: boolean;
  onRequestAuth: () => void;
};

export default function Login({ user, darkMode, onRequestAuth }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!user) {
      setMenuOpen(false);
      setProfileOpen(false);
    }
  }, [user]);

  const handleAvatarClick = () => {
    if (loading) return;

    if (user) {
      setMenuOpen(value => !value);
      return;
    }

    onRequestAuth();
  };

  const handleLogout = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await signOut(auth);
      setMenuOpen(false);
      setProfileOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đăng xuất.';
      window.alert(message);
    } finally {
      setLoading(false);
    }
  };

  const initials = user
    ? getInitials(user.displayName || user.email?.split('@')[0])
    : 'NG';

  const menuSurface = darkMode
    ? 'bg-slate-900 border-slate-700 text-slate-100'
    : 'bg-white border-slate-200 text-slate-950';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleAvatarClick}
        disabled={loading}
        title={user ? 'Mở tài khoản nOcnOm' : 'Đăng nhập hoặc tạo tài khoản'}
        aria-label={user ? 'Mở tài khoản nOcnOm' : 'Đăng nhập hoặc tạo tài khoản'}
        aria-haspopup={user ? 'menu' : 'dialog'}
        aria-expanded={user ? menuOpen : undefined}
        className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 border border-blue-400 flex items-center justify-center overflow-hidden transition-transform active:scale-95 disabled:opacity-60"
      >
        {loading ? (
          <span aria-hidden="true">…</span>
        ) : user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : user ? (
          initials
        ) : (
          <UserRound className="w-5 h-5" aria-hidden="true" />
        )}
      </button>

      {user && menuOpen && (
        <div
          role="menu"
          aria-label="Tài khoản nOcnOm"
          className={
            'absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-[24px] border p-3 shadow-2xl shadow-slate-950/15 ' +
            menuSurface
          }
        >
          <div className="px-2 pb-2 pt-1">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Tài khoản nOcnOm
            </div>
          </div>

          <div
            className={
              'flex items-center gap-3 rounded-2xl border p-3 ' +
              (darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100')
            }
          >
            <div className="w-12 h-12 shrink-0 overflow-hidden rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-black">
                {user.displayName || 'Người dùng nOcnOm'}
              </div>
              <div className="mt-0.5 truncate text-xs font-medium text-slate-500" title={user.email || undefined}>
                {user.email || 'Tài khoản nOcnOm'}
              </div>
            </div>
          </div>

          <div className="mt-2 space-y-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setProfileOpen(true);
              }}
              className={
                'flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-3 text-sm font-bold transition-colors ' +
                (darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50')
              }
            >
              <span>Quản lý tài khoản nOcnOm</span>
              <Settings2 className="w-4 h-4 text-slate-400" aria-hidden="true" />
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              disabled={loading}
              className={
                'flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-3 text-sm font-bold text-red-600 transition-colors disabled:opacity-60 ' +
                (darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50')
              }
            >
              <span>Đăng xuất</span>
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {user && profileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
}
