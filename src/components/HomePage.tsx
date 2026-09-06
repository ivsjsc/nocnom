import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Flame, UtensilsCrossed } from 'lucide-react';
import {
  estimateDishCalories,
  mockDb,
  sumMealAddonCalories,
  type Dish,
  type LogEntry,
  type Timetable
} from '../lib/db';
import WeeklyTable from './WeeklyTable';

const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const comboKeys = ['A', 'B', 'C'] as const;
export default function HomePage() {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const todayKey = dayKeys[new Date().getDay()];

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

  const todayLogs = useMemo(() => {
    const today = new Date().toDateString();
    return logs.filter(log => new Date(log.timestamp).toDateString() === today);
  }, [logs]);

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

    const matchedDish = dishes.find(dish => dish.name === log.dishName);
    return total + (matchedDish ? estimateDishCalories(matchedDish) : 0) + addonCalories;
  }, 0);

  return (
    <div className="space-y-6 pb-28">
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-[22px] border border-slate-200 shadow-sm p-4">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.05em] text-slate-600 dark:text-slate-400">Đã ăn hôm nay</div>
          <div className="mt-1 text-2xl font-black text-blue-600">
            {Math.min(todayLogs.length, plannedMealKeys.length)}/{plannedMealKeys.length} bữa
          </div>
        </div>
        <div className="bg-white rounded-[22px] border border-slate-200 shadow-sm p-4">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.05em] text-slate-600 dark:text-slate-400">Lượt phục vụ</div>
          <div className="mt-1 text-2xl font-black text-orange-600">{logs.length}</div>
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

      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-950 dark:text-slate-100">
              Lịch ăn
            </h2>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Hôm nay mở sẵn. Chạm ngày để xem; chỉ mở bộ chọn khi cần đổi món.
            </p>
          </div>
        </div>

        <WeeklyTable embedded />
      </section>
    </div>
  );
}
