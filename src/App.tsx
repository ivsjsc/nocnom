import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Home, Menu as MenuIcon, Moon, RefreshCw, RotateCw, Sun, Sparkles } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useVersionCheck } from './hooks/useVersionCheck';
import HomePage from './components/HomePage';
import WeeklyTable from './components/WeeklyTable';
import LogsPage from './components/LogsPage';
import MenuPage from './components/MenuPage';
import Login from './components/Login';
import AuthModal from './components/AuthModal';

type Tab = 'home' | 'weekly' | 'logs' | 'menu';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDestination, setAuthDestination] = useState<Tab | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { hasNewVersion, reloadApp } = useVersionCheck(45000);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('nocnom_theme') || localStorage.getItem('unifood_theme');
    return saved ? saved === 'dark' : false;
  });

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

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

  const openAuth = (destination: Tab | null = null) => {
    setAuthDestination(destination);
    setAuthModalOpen(true);
  };

  const closeAuth = () => {
    setAuthModalOpen(false);
    setAuthDestination(null);
  };

  const handleAuthenticated = (user: User) => {
    setCurrentUser(user);

    if (authDestination) {
      setActiveTab(authDestination);
    }

    setAuthDestination(null);
    setAuthModalOpen(false);
  };

  const handleTabSelect = (tab: Tab) => {
    if (tab === 'menu' && !currentUser) {
      openAuth('menu');
      return;
    }

    setActiveTab(tab);
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
      {hasNewVersion && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 shadow-lg flex items-center justify-between text-xs sm:text-sm font-medium animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-yellow-300" />
            <span>Đã có phiên bản nOcnOm mới nhất!</span>
          </div>
          <button
            type="button"
            onClick={reloadApp}
            className="bg-white text-blue-700 px-3 py-1 rounded-full font-bold shadow hover:bg-blue-50 transition-all flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Cập nhật ngay
          </button>
        </div>
      )}

      <header className={'app-header sticky top-0 z-40 border-b backdrop-blur-xl ' + (darkMode ? 'bg-slate-950/92 border-slate-800' : 'bg-white/94 border-slate-100')}>
        <div className="app-container h-[78px] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            aria-label="Về Trang chủ nOcnOm"
            className="min-w-0 flex items-center gap-2.5 text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
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

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              className={'touch-target rounded-2xl border flex items-center justify-center transition-all active:scale-95 ' + (darkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100')}
              aria-label="Làm mới trang"
              title="Làm mới dữ liệu & tải lại ứng dụng"
            >
              <RotateCw className={'w-5 h-5 ' + (isRefreshing ? 'animate-spin text-blue-500' : '')} />
            </button>
            <button
              type="button"
              onClick={() => setDarkMode(value => !value)}
              className={'touch-target rounded-2xl border flex items-center justify-center transition-all active:scale-95 ' + (darkMode ? 'bg-slate-900 border-slate-700 text-yellow-300' : 'bg-blue-50 border-blue-100 text-blue-600')}
              aria-label={darkMode ? 'Bật giao diện sáng' : 'Bật giao diện tối'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Login
              user={currentUser}
              darkMode={darkMode}
              onRequestAuth={() => openAuth()}
            />
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
              onClick={() => handleTabSelect(item.id)}
              aria-label={requiresLogin ? item.label + ' - yêu cầu đăng nhập' : item.label}
              aria-current={active ? 'page' : undefined}
              title={requiresLogin ? 'Đăng nhập để quản lý kho món' : undefined}
              className={
                'app-nav-item ' +
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

      {authModalOpen && (
        <AuthModal
          darkMode={darkMode}
          onClose={closeAuth}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </div>
  );
}
