import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Flame,
  LockKeyhole,
  Plus,
  Save,
  Trash2,
  UtensilsCrossed,
  X
} from 'lucide-react';
import {
  estimateDishCalories,
  getEditableMealDateRange,
  getVietnamDateKey,
  isMealDateEditable,
  mockDb,
  sumMealAddonCalories,
  type Dish,
  type LogEntry,
  type MealAddon,
  type MealKey
} from '../lib/db';
import DishImage from './DishImage';
import MealAddonPicker, { type MealAddonSelection } from './MealAddonPicker';
import {
  loadNutritionAddons,
  type NutritionAddonOption
} from '../lib/nutritionKnowledge';

const mealKeys: MealKey[] = ['A', 'B', 'C'];
const mealOrder: Record<MealKey, number> = { A: 0, B: 1, C: 2 };
const mealLabels: Record<MealKey, string> = {
  A: 'Bữa sáng',
  B: 'Bữa trưa',
  C: 'Bữa tối'
};

type MealDraft = {
  dishId: string;
  vendorId: string;
  fruitId: string;
  drinkId: string;
};

const emptyDrafts = (): Record<MealKey, MealDraft> => ({
  A: { dishId: '', vendorId: '', fruitId: '', drinkId: '' },
  B: { dishId: '', vendorId: '', fruitId: '', drinkId: '' },
  C: { dishId: '', vendorId: '', fruitId: '', drinkId: '' }
});

const timestampForDateKey = (dateKey: string) =>
  Date.parse(dateKey + 'T12:00:00+07:00');

const formatDay = (timestamp: number) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(timestamp));

const formatDateKey = (dateKey: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(timestampForDateKey(dateKey)));

type DayGroup = {
  key: string;
  timestamp: number;
  logs: LogEntry[];
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const editRange = useMemo(() => getEditableMealDateRange(), []);
  const [calendarDate, setCalendarDate] = useState(editRange.max);
  const [mealDrafts, setMealDrafts] = useState<Record<MealKey, MealDraft>>(emptyDrafts);
  const [nutritionAddons, setNutritionAddons] = useState<NutritionAddonOption[]>([]);
  const [editorError, setEditorError] = useState('');

  useEffect(() => {
    const unsubLogs = mockDb.subscribeLogs(setLogs);
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    void loadNutritionAddons().then(setNutritionAddons);
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
      const key = getVietnamDateKey(log.timestamp);
      const current = groups.get(key) || [];
      current.push(log);
      groups.set(key, current);
    });

    return Array.from(groups.entries())
      .map(([key, dayLogs]) => ({
        key,
        timestamp: timestampForDateKey(key),
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

  const selectedDay = useMemo<DayGroup | null>(() => {
    if (!selectedDayKey) return null;

    return {
      key: selectedDayKey,
      timestamp: timestampForDateKey(selectedDayKey),
      logs: logs
        .filter(log => getVietnamDateKey(log.timestamp) === selectedDayKey)
        .sort((a, b) => {
          if (a.mealKey && b.mealKey) return mealOrder[a.mealKey] - mealOrder[b.mealKey];
          return a.timestamp - b.timestamp;
        })
    };
  }, [logs, selectedDayKey]);

  const selectedDayEditable = selectedDayKey
    ? isMealDateEditable(selectedDayKey)
    : false;

  useEffect(() => {
    if (!selectedDay) return;

    const next = emptyDrafts();

    mealKeys.forEach(mealKey => {
      const log = selectedDay.logs.find(item => item.mealKey === mealKey);
      if (!log) return;

      const dish = dishes.find(item => item.name === log.dishName);
      if (!dish) return;

      const vendor = dish.vendors.find(item => item.name === log.vendorName);
      next[mealKey] = {
        dishId: dish.id,
        vendorId: vendor?.id || '',
        fruitId:
          log.addons?.find(addon => addon.kind === 'fruit')?.nutritionRecordId ||
          log.addons?.find(addon => addon.kind === 'fruit')?.id ||
          '',
        drinkId:
          log.addons?.find(addon => addon.kind === 'drink')?.nutritionRecordId ||
          log.addons?.find(addon => addon.kind === 'drink')?.id ||
          ''
      };
    });

    setMealDrafts(next);
    setEditorError('');
  }, [dishes, selectedDay?.key, logs]);

  const selectedDayCalories = selectedDay
    ? selectedDay.logs.reduce(
        (total, log) => total + resolveCalories(log) + sumMealAddonCalories(log),
        0
      )
    : 0;

  const openDate = (dateKey: string) => {
    setCalendarDate(dateKey);
    setSelectedDayKey(dateKey);
    setEditorError('');
  };

  const patchDraft = (mealKey: MealKey, patch: Partial<MealDraft>) => {
    setMealDrafts(current => ({
      ...current,
      [mealKey]: {
        ...current[mealKey],
        ...patch
      }
    }));
  };

  const saveMeal = (mealKey: MealKey) => {
    if (!selectedDayKey || !selectedDayEditable) return;

    const draft = mealDrafts[mealKey];
    const dish = dishes.find(item => item.id === draft.dishId);

    if (!dish) {
      setEditorError('Hãy chọn món trước khi lưu.');
      return;
    }

    const vendor = dish.vendors.find(item => item.id === draft.vendorId);
    if (dish.vendors.length > 0 && !vendor) {
      setEditorError('Hãy chọn quán cho món này.');
      return;
    }

    const selectedAddonIds = [draft.fruitId, draft.drinkId].filter(Boolean);
    const addons: MealAddon[] = selectedAddonIds
      .map(id => nutritionAddons.find(item => item.id === id))
      .filter((item): item is NutritionAddonOption => Boolean(item))
      .map(item => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        calories: item.calories,
        nutritionRecordId: item.id,
        servingG: item.servingG,
        kcalMin: item.kcalMin,
        kcalMax: item.kcalMax
      }));

    try {
      mockDb.upsertMealLog({
        dateKey: selectedDayKey,
        mealKey,
        dishName: dish.name,
        vendorName: vendor?.name || 'Không ghi quán',
        price: vendor?.price || 0,
        calories: estimateDishCalories(dish),
        addons
      });
      setEditorError('');
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'Không thể lưu lịch sử bữa ăn.');
    }
  };

  const removeMeal = (log: LogEntry) => {
    if (!window.confirm('Xóa ' + (log.mealKey ? mealLabels[log.mealKey] : 'món này') + ' khỏi lịch sử?')) {
      return;
    }

    try {
      mockDb.deleteMealLog(log.id);
      setEditorError('');
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'Không thể xóa lịch sử bữa ăn.');
    }
  };

  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-center gap-2 px-2">
        <Clock3 className="w-5 h-5 text-slate-900 dark:text-slate-100" />
        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-slate-100">Lịch sử ăn uống</h2>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
            Xem theo ngày · được ghi bù/chỉnh sửa tối đa 3 ngày trước
          </p>
        </div>
      </div>

      <section className="rounded-[26px] border border-blue-100 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 text-blue-600 shadow-sm">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-slate-950 dark:text-slate-100">
              Ghi bù hoặc chỉnh lịch sử
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500">
              Chọn từ {formatDateKey(editRange.min)} đến hôm nay. Ngày tương lai và quá 3 ngày không được sửa.
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <input
            type="date"
            min={editRange.min}
            max={editRange.max}
            value={calendarDate}
            onChange={event => setCalendarDate(event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 px-3 text-sm font-bold text-slate-950 dark:text-slate-100"
            aria-label="Chọn ngày lịch sử ăn uống"
          />
          <button
            type="button"
            onClick={() => openDate(calendarDate)}
            className="min-h-12 rounded-2xl bg-blue-600 px-4 text-xs font-black text-white shadow-sm active:scale-95"
          >
            Mở ngày
          </button>
        </div>
      </section>

      {groupedDays.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[26px] border border-slate-200 dark:border-slate-700 shadow-sm py-14 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div className="mt-4 font-black text-slate-900 dark:text-slate-100">Chưa có lịch sử</div>
          <p className="mt-1 text-sm text-slate-500">
            Có thể dùng lịch phía trên để ghi bù cho hôm nay hoặc tối đa 3 ngày trước.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedDays.map(day => (
            <button
              type="button"
              key={day.key}
              onClick={() => openDate(day.key)}
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
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                    <span>{day.logs.length} bữa đã ghi nhận</span>
                    <span>·</span>
                    <span className={isMealDateEditable(day.key) ? 'text-blue-600' : 'text-slate-400'}>
                      {isMealDateEditable(day.key) ? 'Có thể chỉnh sửa' : 'Chỉ xem'}
                    </span>
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
          aria-label={'Chi tiết ăn uống ngày ' + formatDateKey(selectedDay.key)}
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
                  <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>{selectedDay.logs.length} bữa đã ghi nhận</span>
                    {selectedDayEditable ? (
                      <span className="rounded-lg bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-600 dark:text-blue-300">
                        Được chỉnh sửa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-500">
                        <LockKeyhole className="h-3 w-3" />
                        Chỉ xem
                      </span>
                    )}
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
              {editorError && (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                  {editorError}
                </div>
              )}

              {selectedDayEditable && (
                <section className="mb-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-950 dark:text-slate-100">
                        Ghi bù / chỉnh bữa ăn
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                        Mỗi bữa có một món chính và có thể thêm trái cây hoặc nước uống.
                      </div>
                    </div>
                    <Plus className="h-5 w-5 text-blue-500" />
                  </div>

                  {mealKeys.map(mealKey => {
                    const existing = selectedDay.logs.find(log => log.mealKey === mealKey);
                    const draft = mealDrafts[mealKey];
                    const selectedDish = dishes.find(dish => dish.id === draft.dishId);
                    const vendors = selectedDish?.vendors || [];

                    return (
                      <div
                        key={mealKey}
                        className="rounded-[22px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-black uppercase tracking-[0.12em] text-blue-500">
                            {mealLabels[mealKey]}
                          </div>
                          {existing && (
                            <button
                              type="button"
                              onClick={() => removeMeal(existing)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                              aria-label={'Xóa ' + mealLabels[mealKey]}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          <label className="block">
                            <span className="text-[10px] font-black text-slate-500">Món ăn</span>
                            <select
                              value={draft.dishId}
                              onChange={event => {
                                const dish = dishes.find(item => item.id === event.target.value);
                                patchDraft(mealKey, {
                                  dishId: event.target.value,
                                  vendorId: dish?.vendors[0]?.id || ''
                                });
                              }}
                              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-bold text-slate-950 dark:text-slate-100"
                            >
                              <option value="">— Chọn món —</option>
                              {dishes.map(dish => (
                                <option key={dish.id} value={dish.id}>{dish.name}</option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-[10px] font-black text-slate-500">Quán / nguồn món</span>
                            <select
                              value={draft.vendorId}
                              onChange={event => patchDraft(mealKey, { vendorId: event.target.value })}
                              disabled={!selectedDish || vendors.length === 0}
                              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-bold text-slate-950 dark:text-slate-100 disabled:opacity-60"
                            >
                              {vendors.length === 0 ? (
                                <option value="">Không ghi quán</option>
                              ) : (
                                <>
                                  <option value="">— Chọn quán —</option>
                                  {vendors.map(vendor => (
                                    <option key={vendor.id} value={vendor.id}>
                                      {vendor.name} · {vendor.price.toLocaleString('vi-VN')}đ
                                    </option>
                                  ))}
                                </>
                              )}
                            </select>
                          </label>

                          <MealAddonPicker
                            value={{
                              fruitId: draft.fruitId,
                              drinkId: draft.drinkId
                            }}
                            onChange={(selection: MealAddonSelection) =>
                              patchDraft(mealKey, selection)
                            }
                            compact
                          />

                          <button
                            type="button"
                            onClick={() => saveMeal(mealKey)}
                            disabled={!draft.dishId || (vendors.length > 0 && !draft.vendorId)}
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                            {existing ? 'Lưu thay đổi' : 'Ghi bữa này'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}

              {!selectedDayEditable && (
                <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-xs font-semibold text-slate-500">
                  Lịch sử quá 3 ngày đã được khóa chỉnh sửa. Bạn vẫn có thể xem đầy đủ các bữa đã ghi.
                </div>
              )}

              {selectedDay.logs.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 dark:border-slate-700 px-5 py-8 text-center">
                  <UtensilsCrossed className="mx-auto h-6 w-6 text-slate-300" />
                  <div className="mt-2 text-sm font-black text-slate-700 dark:text-slate-200">
                    Chưa ghi bữa nào trong ngày này
                  </div>
                  {selectedDayEditable && (
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      Chọn món ở phần trên để ghi bù.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDay.logs.map((log, index) => {
                    const dish = findDish(log.dishName);
                    const mainCalories = resolveCalories(log);
                    const addonCalories = sumMealAddonCalories(log);
                    const calories = mainCalories + addonCalories;
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

                        {(log.addons?.length ?? 0) > 0 && (
                          <div className="mt-2 space-y-1 rounded-xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 px-3 py-2">
                            {log.addons?.map(addon => (
                              <div
                                key={addon.kind + '-' + addon.id}
                                className="flex items-center justify-between gap-3 text-[10px] font-bold"
                              >
                                <span className="text-emerald-800 dark:text-emerald-200">
                                  {addon.kind === 'fruit' ? 'Trái cây' : 'Nước uống'} · {addon.name}
                                </span>
                                <span className="shrink-0 text-emerald-700 dark:text-emerald-300">
                                  ≈ {addon.calories.toLocaleString('vi-VN')} kcal
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
