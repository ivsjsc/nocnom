import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CalendarDays,
  Clock,
  Flame,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  UtensilsCrossed
} from 'lucide-react';
import {
  estimateDishCalories,
  mockDb,
  sumMealAddonCalories,
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

export default function HomePage() {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
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

  const todayLogs = useMemo(
    () =>
      logs.filter(
        log => getVietnamDateKey(log.timestamp) === todayDateKey
      ),
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
  const plannedMealKeys = comboKeys.filter(comboKey => !todayMenu.options[comboKey].skipped);
  const plannedCalories = plannedMealKeys.reduce((total, comboKey) => {
    const dish = findDish(todayMenu.options[comboKey].dishId);
    return total + (dish ? estimateDishCalories(dish) : 0);
  }, 0);

  const consumedCalories = todayLogs.reduce((total, log) => {
    const addonCalories = sumMealAddonCalories(log);

    if (typeof log.calories === 'number' && Number.isFinite(log.calories)) {
      return total + Math.max(0, Math.round(log.calories)) + addonCalories;
    }

    const matchedDish = dishes.find(
      dish =>
        dish.name === log.dishName ||
        dish.legacyNames?.includes(log.dishName)
    );
    return total + (matchedDish ? estimateDishCalories(matchedDish) : 0) + addonCalories;
  }, 0);

  return (
    <div className="space-y-6 pb-28">
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-800 dark:to-slate-900/90 rounded-[24px] border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 p-4.5 flex flex-col justify-center relative overflow-hidden group">
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
            <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              {dayPhase.greeting}
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-amber-50/40 dark:from-slate-800 dark:to-slate-900/90 rounded-[24px] border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 p-4.5 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
              <Clock className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {formatVietnamTime(nowTimestamp)}
            </span>
          </div>
        </div>

        <div className="col-span-2 rounded-[24px] bg-gradient-to-r from-orange-700 to-amber-700 p-4 text-white shadow-lg shadow-orange-900/10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-white/15 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/95">Calo hôm nay · ước tính</div>
              <div className="mt-0.5 text-2xl font-black leading-none">≈ {plannedCalories.toLocaleString('vi-VN')} kcal</div>
              <div className="mt-1 text-[10px] font-bold text-white/95">
                Kế hoạch {plannedMealKeys.length} bữa · đã ghi nhận ≈ {consumedCalories.toLocaleString('vi-VN')} kcal
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] bg-gradient-to-br from-[#3f63f4] to-[#2f4ed8] text-white p-6 sm:p-7 shadow-lg shadow-blue-900/10">
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
                  className="rounded-[18px] border border-white/15 bg-white/10 px-4 py-3 flex items-center gap-3"
                >
                  <Ban className="w-4 h-4 shrink-0 text-blue-100" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-black text-blue-100">
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

            return (
              <div
                key={comboKey}
                className="rounded-[22px] border border-white/15 bg-white/10 p-3 flex items-center gap-3"
              >
                <DishImage
                  src={dish.imageUrl}
                  alt={dish.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0 border border-white/20"
                />

                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black text-blue-50">
                    {mealLabels[index]}
                  </div>
                  <div className="font-black text-sm sm:text-base truncate">
                    {dish.name}
                  </div>
                  <div className="text-[10px] text-blue-50 font-semibold">
                    ≈ {estimateDishCalories(dish)} kcal ·{' '}
                    {price ? price.toLocaleString('vi-VN') + 'đ' : 'chưa có giá'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelected({ dish, day: todayKey, comboKey })
                  }
                  className="shrink-0 min-w-[64px] min-h-11 px-4 py-2 rounded-xl bg-white text-blue-700 text-xs font-extrabold uppercase tracking-wide shadow-sm active:scale-95 transition-transform"
                >
                  Xem
                </button>
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
            <h2 className="text-base font-black text-slate-950 dark:text-white">
              Lịch ăn tuần này
            </h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
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
