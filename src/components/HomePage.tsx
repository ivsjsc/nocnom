import { useEffect, useMemo, useState } from 'react';
import { Ban, CalendarDays, Flame, UtensilsCrossed } from 'lucide-react';
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

const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
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
  const [selected, setSelected] = useState<{
    dish: Dish;
    day: string;
    comboKey: 'A' | 'B' | 'C';
  } | null>(null);
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
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-950 dark:text-slate-100">
              Lịch ăn
            </h2>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
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
