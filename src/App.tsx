import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Home, Menu as MenuIcon, Moon, Sun } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { isAuthPopupDismissed, signInWithGoogle } from './lib/auth';
import HomePage from './components/HomePage';
import WeeklyTable from './components/WeeklyTable';
import LogsPage from './components/LogsPage';
import MenuPage from './components/MenuPage';
import Login from './components/Login';

type Tab = 'home' | 'weekly' | 'logs' | 'menu';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [menuAuthLoading, setMenuAuthLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('nocnom_theme') || localStorage.getItem('unifood_theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('nocnom_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setAuthChecked(true);

      if (!user) {
        setActiveTab(tab => tab === 'menu' ? 'home' : tab);
      }
    });
  }, []);

  const handleTabSelect = async (tab: Tab) => {
    if (tab !== 'menu' || currentUser) {
      setActiveTab(tab);
      return;
    }

    if (menuAuthLoading) return;

    setMenuAuthLoading(true);
    try {
      const credential = await signInWithGoogle();
      setCurrentUser(credential.user);
      setActiveTab('menu');
    } catch (error) {
      if (!isAuthPopupDismissed(error)) {
        const message = error instanceof Error ? error.message : 'Không thể đăng nhập.';
        window.alert('Không thể mở Kho món. Vui lòng đăng nhập lại.\n\n' + message);
      }
    } finally {
      setMenuAuthLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 text-sm font-semibold text-slate-500">
        Đang tải nOcnOm...
      </div>
    );
  }

  const navItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'weekly', label: 'Lịch ăn', icon: CalendarDays },
    { id: 'logs', label: 'Lịch sử', icon: Clock3 },
    { id: 'menu', label: 'Kho món', icon: MenuIcon }
  ];

  return (
    <div className={'app-shell min-h-screen transition-colors ' + (darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950')}>
      <header className={'app-header sticky top-0 z-40 border-b backdrop-blur-xl ' + (darkMode ? 'bg-slate-950/92 border-slate-800' : 'bg-white/94 border-slate-100')}>
        <div className="app-container h-[78px] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            aria-label="Về Trang chủ nOcnOm"
            className="min-w-0 flex items-center gap-2.5 text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {/* Stable logo slot: replace public/brand/logo.svg with the final brand asset when available. */}
            <span className={'w-11 h-11 shrink-0 overflow-hidden rounded-2xl border shadow-sm ' + (darkMode ? 'border-slate-700 bg-slate-900' : 'border-blue-100 bg-blue-50')}>
              <img
                src="/brand/logo.svg"
                alt=""
                className="w-full h-full object-cover"
              />
            </span>

            <span className="min-w-0">
              <span className="block text-[23px] leading-none font-black tracking-[-0.045em] text-blue-600">
                nOcnOm
              </span>
              <span className="mt-2 block truncate text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                KTX KHU B SMART FOOD
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode(value => !value)}
              className={'touch-target rounded-2xl border flex items-center justify-center transition-all active:scale-95 ' + (darkMode ? 'bg-slate-900 border-slate-700 text-yellow-300' : 'bg-blue-50 border-blue-100 text-blue-600')}
              aria-label={darkMode ? 'Bật giao diện sáng' : 'Bật giao diện tối'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Login user={currentUser} darkMode={darkMode} />
          </div>
        </div>
      </header>

      <main className="app-container app-main">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'weekly' && <WeeklyTable />}
        {activeTab === 'logs' && <LogsPage />}
        {activeTab === 'menu' && currentUser && <MenuPage canManage />}
      </main>

      <nav
        aria-label="Điều hướng chính"
        className={'app-bottom-nav ' + (darkMode ? 'bg-slate-900/96 border-slate-700' : 'bg-white/96 border-slate-200')}
      >
        {navItems.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          const requiresLogin = item.id === 'menu' && !currentUser;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => void handleTabSelect(item.id)}
              disabled={item.id === 'menu' && menuAuthLoading}
              aria-label={requiresLogin ? item.label + ' - yêu cầu đăng nhập' : item.label}
              aria-current={active ? 'page' : undefined}
              aria-busy={item.id === 'menu' && menuAuthLoading ? 'true' : undefined}
              title={requiresLogin ? 'Đăng nhập để quản lý kho món' : undefined}
              className={
                'app-nav-item disabled:opacity-60 ' +
                (active
                  ? (darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600')
                  : (darkMode ? 'text-slate-400' : 'text-slate-500'))
              }
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
