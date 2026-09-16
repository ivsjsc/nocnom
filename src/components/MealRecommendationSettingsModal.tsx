import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings2, Sparkles, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  estimateDishCalories,
  mockDb,
  type Category,
  type Dish,
  type LogEntry,
  type Timetable
} from '../lib/db';
import {
  formatVietnamTime,
  getVietnamDateKey,
  getVietnamDayKey
} from '../lib/dateTime';
import {
  calculateConsumedCalories,
  getLogsForVietnamDate
} from '../domain/meal/mealAnalytics';
import {
  calculateDailyCalorieTargetFromProfile,
  roundEnergyEstimateForDisplay
} from '../lib/healthUtils';
import {
  getCachedUserProfile,
  loadUserProfile,
  saveRecommendationPreferences,
  type UserProfileData
} from '../services/userProfile';
import MealRecommendationPanel from './MealRecommendationPanel';

type Props = {
  user: User;
  onClose: () => void;
};

export default function MealRecommendationSettingsModal({ user, onClose }: Props) {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [profile, setProfile] = useState<Partial<UserProfileData> | null>(() =>
    getCachedUserProfile(user.uid)
  );
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsubTable = mockDb.subscribe('all', setTimetable);
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    const unsubCategories = mockDb.subscribeCategories(setCategories);
    const unsubLogs = mockDb.subscribeLogs(setLogs);

    return () => {
      unsubTable();
      unsubDishes();
      unsubCategories();
      unsubLogs();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setProfile(getCachedUserProfile(user.uid));
    setProfileLoading(true);

    void loadUserProfile(user.uid)
      .then(next => {
        if (active) setProfile(next);
      })
      .catch(error => {
        console.warn('[recommendation-settings] Unable to load profile', error);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<UserProfileData>;
      if (active && customEvent.detail) {
        setProfile(customEvent.detail);
      }
    };

    window.addEventListener('nocnom:profile-updated', handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener('nocnom:profile-updated', handleProfileUpdate);
    };
  }, [user.uid]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const nowTimestamp = Date.now();
  const todayKey = getVietnamDayKey(nowTimestamp);
  const todayDateKey = getVietnamDateKey(nowTimestamp);
  const todayMenu = timetable?.[todayKey];

  const todayLogs = useMemo(
    () => getLogsForVietnamDate(logs, todayDateKey),
    [logs, todayDateKey]
  );

  const consumedCalories = useMemo(
    () =>
      calculateConsumedCalories(
        todayLogs,
        dishes,
        dish => estimateDishCalories(dish as Dish)
      ),
    [dishes, todayLogs]
  );

  const customTarget = Number(profile?.dailyCalorieTarget);
  const hasCustomTarget =
    Number.isFinite(customTarget) && customTarget >= 800 && customTarget <= 6000;
  const targetCaloriesRaw = hasCustomTarget
    ? customTarget
    : calculateDailyCalorieTargetFromProfile({
        weightKg: profile?.weightKg,
        heightCm: profile?.heightCm,
        dateOfBirth: profile?.dateOfBirth,
        gender: profile?.gender,
        activityLevel: profile?.activityLevel,
        healthGoal: profile?.healthGoal,
        now: new Date(nowTimestamp)
      });
  const targetCalories =
    targetCaloriesRaw === null
      ? null
      : roundEnergyEstimateForDisplay(targetCaloriesRaw);

  const ready = Boolean(todayMenu && dishes.length > 0 && categories.length > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Thiết lập gợi ý món nOcnOm"
      onMouseDown={event => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
              <Settings2 className="h-3.5 w-3.5" />
              Cài đặt tài khoản
            </div>
            <h2 className="mt-0.5 truncate text-xl font-black text-slate-950 dark:text-slate-100">
              Gợi ý món mỗi ngày
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Đóng thiết lập gợi ý món"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-950 dark:text-slate-100">
                  Menu 3 bữa được làm mới tự động mỗi ngày
                </div>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
                  nOcnOm luân phiên món theo ngày Việt Nam, ưu tiên tránh món vừa ăn và tránh lặp trong cùng ngày. Nếu bạn đổi món thủ công, lựa chọn đó được giữ nguyên trong phần còn lại của ngày.
                </p>
                <div className="mt-2 text-[10px] font-black uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Hôm nay · {formatVietnamTime(nowTimestamp)}
                </div>
              </div>
            </div>
          </div>

          {profileLoading && !profile ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">
              Đang tải thiết lập gợi ý...
            </div>
          ) : !ready || !todayMenu ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Chưa tải đủ dữ liệu menu để tạo gợi ý.
            </div>
          ) : (
            <MealRecommendationPanel
              userId={user.uid}
              todayMenu={todayMenu}
              dishes={dishes}
              categories={categories}
              logs={logs}
              todayDateKey={todayDateKey}
              dailyCalorieTarget={targetCalories}
              consumedCalories={consumedCalories}
              initialMode={profile?.recommendationMode}
              initialBudgetVnd={profile?.mealBudgetVnd}
              onSelect={(mealKey, dish) => {
                mockDb.swapDish(todayKey, mealKey, dish.id);
              }}
              onPreferenceChange={(mode, budgetVnd) =>
                saveRecommendationPreferences(user.uid, {
                  recommendationMode: mode,
                  mealBudgetVnd: budgetVnd
                })
              }
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
