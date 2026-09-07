import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Ban,
  CalendarDays,
  Check,
  Clock,
  Flame,
  Moon,
  Target,
  Sun,
  Sunrise,
  Sunset,
  UtensilsCrossed
} from 'lucide-react';
import {
  estimateDishCalories,
  mockDb,
  type Dish,
  type LogEntry,
  type Timetable
} from '../lib/db';
import DishDetailModal from './DishDetailModal';
import DishImage from './DishImage';
import WeeklyTable from './WeeklyTable';
import { getDayPhase } from '../lib/dayPhase';
import {
  formatVietnamTime,
  getVietnamDateKey,
  getVietnamDayKey
} from '../lib/dateTime';
import {
  calculateConsumedCalories,
  calculatePlannedCalories,
  getLogsForVietnamDate,
  isDishConsumedForMeal
} from '../domain/meal/mealAnalytics';
import {
  calculateDailyCalorieTargetFromProfile,
  roundEnergyEstimateForDisplay
} from '../lib/healthUtils';
import {
  getCachedUserProfile,
  loadUserProfile,
  type UserProfileData
} from '../services/userProfile';

const comboKeys = ['A', 'B', 'C'] as const;
const mealLabels = ['BỮA SÁNG', 'BỮA TRƯA', 'BỮA TỐI'];
const dayDisplay: Record<string, string> = {
  mon: 'Thứ Hai',
  tue: 'Thứ Ba',
  wed: 'Thứ Tư',
  thu: 'Thứ Năm',
  fri: 'Thứ Sáu',
  sat: 'Thứ Bảy',
  sun: 'Chủ Nhật'
};

type Props = {
  currentUser?: User | null;
};

export default function HomePage({ currentUser }: Props) {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [profile, setProfile] = useState<Partial<UserProfileData> | null>(() =>
    currentUser ? getCachedUserProfile(currentUser.uid) : null
  );
  const [time, setTime] = useState<Date>(new Date());
  const [selected, setSelected] = useState<{
    dish: Dish;
    day: string;
    comboKey: 'A' | 'B' | 'C';
  } | null>(null);
  const nowTimestamp = time.getTime();
  const todayKey = getVietnamDayKey(nowTimestamp);
  const todayDateKey = getVietnamDateKey(nowTimestamp);
  const dayPhase = getDayPhase(time);

  const DayPhaseIcon =
    dayPhase.phase === 'sunrise'
      ? Sunrise
      : dayPhase.phase === 'day'
        ? Sun
        : dayPhase.phase === 'sunset'
          ? Sunset
          : Moon;

  const dayPhaseIconClass =
    dayPhase.phase === 'sunrise'
      ? 'bg-gradient-to-br from-orange-100 to-amber-100 text-orange-700 dark:from-orange-500/20 dark:to-amber-500/10 dark:text-orange-300'
      : dayPhase.phase === 'day'
        ? 'bg-gradient-to-br from-yellow-100 to-amber-50 text-amber-700 dark:from-yellow-500/20 dark:to-amber-500/10 dark:text-yellow-300'
        : dayPhase.phase === 'sunset'
          ? 'bg-gradient-to-br from-orange-100 to-rose-100 text-rose-700 dark:from-orange-500/20 dark:to-rose-500/10 dark:text-orange-300'
          : 'bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700 dark:from-indigo-500/20 dark:to-blue-500/10 dark:text-indigo-300';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubTable = mockDb.subscribe('all', setTimetable);
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    const unsubLogs = mockDb.subscribeLogs(setLogs);
    return () => {
      unsubTable();
      unsubDishes();
      unsubLogs();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    let active = true;
    setProfile(getCachedUserProfile(currentUser.uid));

    void loadUserProfile(currentUser.uid)
      .then(next => {
        if (active) setProfile(next);
      })
      .catch(error => {
        console.warn('[home] Unable to load calorie target profile', error);
      });

    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<UserProfileData>;
      if (customEvent.detail && active) {
        setProfile(customEvent.detail);
      }
    };

    window.addEventListener('nocnom:profile-updated', handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener('nocnom:profile-updated', handleProfileUpdate);
    };
  }, [currentUser]);

  const todayLogs = useMemo(
    () => getLogsForVietnamDate(logs, todayDateKey),
    [logs, todayDateKey]
  );

  if (!timetable || dishes.length === 0) {
    return (
      <div className="py-20 flex justify-center text-slate-400">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UtensilsCrossed className="w-5 h-5" />
          Đang tải nOcnOm...
        </div>
      </div>
    );
  }

  const todayMenu = timetable[todayKey];
  const findDish = (id: string) => dishes.find(item => item.id === id);
  const planned = calculatePlannedCalories(
    todayMenu,
    dishes,
    dish => estimateDishCalories(dish as Dish)
  );
  const plannedMealKeys = planned.activeMealKeys;
  const consumedCalories = calculateConsumedCalories(
    todayLogs,
    dishes,
    dish => estimateDishCalories(dish as Dish)
  );
  const customTarget = Number(profile?.dailyCalorieTarget);
  const hasCustomTarget =
    Number.isFinite(customTarget) &&
    customTarget >= 800 &&
    customTarget <= 6000;
  const targetCaloriesRaw = hasCustomTarget
    ? customTarget
    : calculateDailyCalorieTargetFromProfile({
        weightKg: profile?.weightKg,
        heightCm: profile?.heightCm,
        dateOfBirth: profile?.dateOfBirth,
        gender: profile?.gender,
        activityLevel: profile?.activityLevel,
        healthGoal: profile?.healthGoal,
        now: time
      });
  const targetCalories =
    targetCaloriesRaw === null
      ? null
      : roundEnergyEstimateForDisplay(targetCaloriesRaw);

  return (
    <div className="space-y-6 pb-28">
      <section className="grid grid-cols-2 gap-3">
        <div className="home-stat-card rounded-[24px] border p-4.5 flex flex-col justify-center relative overflow-hidden group transition-all duration-300">
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all" />
          <div className="flex items-center gap-2.5">
            <div
              className={
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner transition-colors duration-500 ' +
                dayPhaseIconClass
              }
              title={dayPhase.label}
              aria-label={dayPhase.label}
            >
              <DayPhaseIcon className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div className="theme-text-primary text-lg sm:text-xl font-black tracking-tight leading-tight">
              {dayPhase.greeting}
            </div>
          </div>
        </div>
        <div className="home-stat-card rounded-[24px] border p-4.5 flex flex-col justify-center relative overflow-hidden group transition-all duration-300">
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
              <Clock className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <span className="theme-text-primary text-2xl sm:text-3xl font-black font-mono tracking-tight">
              {formatVietnamTime(nowTimestamp)}
            </span>
          </div>
        </div>

        <div className="home-calorie-card col-span-2 rounded-[24px] p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2 text-white/90">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Flame className="h-4 w-4" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.1em]">
                  Đã tiêu thụ
                </div>
              </div>
              <div
                className="mt-2 text-2xl font-black leading-none"
                data-calorie-value="consumed"
              >
                {consumedCalories.toLocaleString('vi-VN')}
                <span className="ml-1 text-sm font-extrabold text-white/90">
                  kcal
                </span>
              </div>
            </div>

            <div
              className="w-px bg-white/25"
              aria-hidden="true"
            />

            <div className="min-w-0 pl-3 text-right">
              <div className="flex items-center justify-end gap-2 text-white/90">
                <div className="text-[10px] font-black uppercase tracking-[0.1em]">
                  Mục tiêu ngày
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Target className="h-4 w-4" />
                </div>
              </div>
              <div
                className="mt-2 text-2xl font-black leading-none"
                data-calorie-value="target"
              >
                {targetCalories === null
                  ? '—'
                  : targetCalories.toLocaleString('vi-VN')}
                {targetCalories !== null && (
                  <span className="ml-1 text-sm font-extrabold text-white/90">
                    kcal
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      <section className="home-primary-hero rounded-[32px] p-6 sm:p-7">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          Hôm nay {dayDisplay[todayKey]}
        </h2>
        <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-blue-50">
          Menu {plannedMealKeys.length} bữa theo lịch nOcnOm
        </p>

        <div className="mt-5 space-y-3">
          {comboKeys.map((comboKey, index) => {
            const menuItem = todayMenu.options[comboKey];

            if (menuItem.skipped) {
              return (
                <div
                  key={comboKey}
                  className="home-hero-meal rounded-[18px] border px-4 py-3 flex items-center gap-3"
                >
                  <Ban className="w-4 h-4 shrink-0 text-blue-100" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-blue-100">
                      {mealLabels[index]}
                    </div>
                    <div className="text-sm font-black text-white/90">
                      Không ăn bữa này
                    </div>
                  </div>
                </div>
              );
            }

            const dish = findDish(menuItem.dishId);
            if (!dish) return null;
            const price = dish.vendors[0]?.price;
            const isEaten = isDishConsumedForMeal(
              todayLogs,
              comboKey,
              dish
            );

            return (
              <div
                key={comboKey}
                className="home-hero-meal rounded-[22px] border p-3 flex items-center gap-3"
              >
                <DishImage
                  src={dish.imageUrl}
                  alt={dish.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0 border border-white/20"
                />

                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-black text-blue-50">
                    {mealLabels[index]}
                  </div>
                  <div className="font-black text-sm sm:text-base truncate">
                    {dish.name}
                  </div>
                  <div className="text-[11px] text-blue-50 font-semibold">
                    ≈ {estimateDishCalories(dish)} kcal ·{' '}
                    {price ? price.toLocaleString('vi-VN') + 'đ' : 'chưa có giá'}
                  </div>
                </div>

                {isEaten ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSelected({ dish, day: todayKey, comboKey })
                    }
                    className="group relative h-[68px] w-[68px] shrink-0 -rotate-6 rounded-full border-2 border-white/90 text-white shadow-[0_0_0_2px_rgba(255,255,255,0.18)] transition-transform hover:rotate-0 active:scale-95"
                    aria-label={mealLabels[index] + ' đã ăn - xem chi tiết ' + dish.name}
                    title="Đã ăn · Chạm để xem chi tiết"
                    data-meal-status="eaten"
                  >
                    <span
                      className="pointer-events-none absolute inset-[5px] rounded-full border border-dashed border-white/70"
                      aria-hidden="true"
                    />
                    <span className="relative flex h-full w-full flex-col items-center justify-center gap-0.5">
                      <Check className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                      <span className="text-[10px] font-black leading-none tracking-[0.08em]">
                        ĐÃ ĂN
                      </span>
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setSelected({ dish, day: todayKey, comboKey })
                    }
                    className="shrink-0 min-w-[64px] min-h-11 px-4 py-2 rounded-xl bg-white text-blue-700 text-xs font-extrabold uppercase tracking-wide shadow-sm active:scale-95 transition-transform"
                  >
                    Xem
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div
          className="surface-info-strip flex items-start gap-3 rounded-[22px] p-4"
          data-ui="weekly-schedule-intro"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="theme-text-primary text-base font-black">
              Lịch ăn tuần này
            </h2>
            <p className="theme-text-secondary mt-1 text-xs font-semibold leading-relaxed">
              Các ngày còn lại trong tuần. Chạm ngày để xem; chỉ mở bộ chọn khi cần đổi món.
            </p>
          </div>
        </div>

        <WeeklyTable embedded excludeToday />
      </section>

      {selected && (
        <DishDetailModal
          dish={selected.dish}
          day={selected.day}
          comboKey={selected.comboKey}
          isSelectable
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
