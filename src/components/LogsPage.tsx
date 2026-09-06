import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronRight, Clock3, Flame, UtensilsCrossed, X } from 'lucide-react';
import {
  estimateDishCalories,
  mockDb,
  type Dish,
  type LogEntry
} from '../lib/db';
import DishImage from './DishImage';

const mealOrder: Record<'A' | 'B' | 'C', number> = { A: 0, B: 1, C: 2 };
const mealLabels: Record<'A' | 'B' | 'C', string> = {
  A: 'Bữa sáng',
  B: 'Bữa trưa',
  C: 'Bữa tối'
};

const getLocalDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};

const formatDay = (timestamp: number) =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(timestamp));

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(timestamp));

type DayGroup = {
  key: string;
  timestamp: number;
  logs: LogEntry[];
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    const unsubLogs = mockDb.subscribeLogs(setLogs);
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    return () => {
      unsubLogs();
      unsubDishes();
    };
  }, []);

  useEffect(() => {
    if (!selectedDayKey) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedDayKey(null);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedDayKey]);

  const findDish = (name: string) => dishes.find(dish => dish.name === name);

  const resolveCalories = (log: LogEntry) => {
    if (typeof log.calories === 'number' && Number.isFinite(log.calories)) {
      return Math.max(0, Math.round(log.calories));
    }

    const dish = findDish(log.dishName);
    return dish ? estimateDishCalories(dish) : 0;
  };

  const groupedDays = useMemo<DayGroup[]>(() => {
    const groups = new Map<string, LogEntry[]>();

    logs.forEach(log => {
      const key = getLocalDateKey(log.timestamp);
      const current = groups.get(key) || [];
      current.push(log);
      groups.set(key, current);
    });

    return Array.from(groups.entries())
      .map(([key, dayLogs]) => ({
        key,
        timestamp: Math.max(...dayLogs.map(log => log.timestamp)),
        logs: [...dayLogs].sort((a, b) => {
          if (a.mealKey && b.mealKey) {
            return mealOrder[a.mealKey] - mealOrder[b.mealKey];
          }

          if (a.mealKey) return -1;
          if (b.mealKey) return 1;
          return a.timestamp - b.timestamp;
        })
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [logs]);

  const selectedDay = selectedDayKey
    ? groupedDays.find(day => day.key === selectedDayKey) || null
    : null;

  const selectedDayCalories = selectedDay
    ? selectedDay.logs.reduce((total, log) => total + resolveCalories(log), 0)
    : 0;

  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-center gap-2 px-2">
        <Clock3 className="w-5 h-5 text-slate-900 dark:text-slate-100" />
        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-slate-100">Lịch sử ăn uống</h2>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
            Theo dõi theo từng ngày
          </p>
        </div>
      </div>

      {groupedDays.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[26px] border border-slate-200 dark:border-slate-700 shadow-sm py-14 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div className="mt-4 font-black text-slate-900 dark:text-slate-100">Chưa có lịch sử</div>
          <p className="mt-1 text-sm text-slate-500">Món đã chọn sẽ được tổng hợp theo từng ngày.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedDays.map(day => (
            <button
              type="button"
              key={day.key}
              onClick={() => setSelectedDayKey(day.key)}
              className="w-full rounded-[26px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-left shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-500 active:scale-[0.99]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black capitalize text-slate-950 dark:text-slate-100">
                    {formatDay(day.timestamp)}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    {day.logs.length} {day.logs.length === 1 ? 'bữa' : 'bữa'} đã ghi nhận
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedDay && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={'Chi tiết ăn uống ngày ' + formatDate(selectedDay.timestamp)}
          onMouseDown={event => {
            if (event.currentTarget === event.target) setSelectedDayKey(null);
          }}
        >
          <div className="flex w-full max-w-lg max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
            <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">
                    Lịch sử trong ngày
                  </div>
                  <h3 className="mt-1 text-xl font-black capitalize text-slate-950 dark:text-slate-100">
                    {formatDay(selectedDay.timestamp)}
                  </h3>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {selectedDay.logs.length} bữa đã ghi nhận
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDayKey(null)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300"
                  aria-label="Đóng chi tiết ngày"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 rounded-[22px] bg-gradient-to-r from-orange-500 to-amber-400 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/80">
                      Tổng calo tiêu thụ
                    </div>
                    <div className="mt-0.5 text-2xl font-black">
                      ≈ {selectedDayCalories.toLocaleString('vi-VN')} kcal
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="space-y-3">
                {selectedDay.logs.map((log, index) => {
                  const dish = findDish(log.dishName);
                  const calories = resolveCalories(log);
                  const mealLabel = log.mealKey
                    ? mealLabels[log.mealKey]
                    : 'Món ' + (index + 1);

                  return (
                    <article
                      key={log.id}
                      className="rounded-[22px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <DishImage
                          src={dish?.imageUrl}
                          alt={log.dishName}
                          className="h-14 w-14 shrink-0 rounded-2xl"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-500">
                            {mealLabel}
                          </div>
                          <h4 className="mt-0.5 truncate text-sm font-black text-slate-950 dark:text-slate-100">
                            {log.dishName}
                          </h4>
                          <div className="mt-1 text-[10px] font-bold text-slate-500">
                            ≈ {calories.toLocaleString('vi-VN')} kcal · {log.price.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-[10px] font-bold text-slate-500">
                        Quán: {log.vendorName}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
