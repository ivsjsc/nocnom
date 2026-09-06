import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  UtensilsCrossed,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  estimateDishCalories,
  mockDb,
  type Category,
  type Dish,
  type Timetable
} from '../lib/db';
import DishDetailModal from './DishDetailModal';
import DishImage from './DishImage';
import DishPickerModal from './DishPickerModal';

const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const comboKeys = ['A', 'B', 'C'] as const;
type ComboKey = (typeof comboKeys)[number];

const mealLabels = ['Bữa sáng', 'Bữa trưa', 'Bữa tối'];
const dayDisplay: Record<string, string> = {
  mon: 'Thứ Hai',
  tue: 'Thứ Ba',
  wed: 'Thứ Tư',
  thu: 'Thứ Năm',
  fri: 'Thứ Sáu',
  sat: 'Thứ Bảy',
  sun: 'Chủ Nhật'
};

type MealTarget = {
  day: string;
  comboKey: ComboKey;
};

type SelectedDish = MealTarget & {
  dish: Dish;
};

export default function WeeklyTable({
  embedded = false,
  excludeToday = false
}: {
  embedded?: boolean;
  excludeToday?: boolean;
}) {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<SelectedDish | null>(null);
  const [swapTarget, setSwapTarget] = useState<MealTarget | null>(null);
  const [actionTarget, setActionTarget] = useState<SelectedDish | null>(null);

  const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][
    new Date().getDay()
  ];

  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    () => new Set(excludeToday ? [] : [todayKey])
  );

  useEffect(() => {
    const unsubTable = mockDb.subscribe('all', setTimetable);
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    const unsubCategories = mockDb.subscribeCategories(setCategories);
    return () => {
      unsubTable();
      unsubDishes();
      unsubCategories();
    };
  }, []);

  useEffect(() => {
    if (!actionTarget) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActionTarget(null);
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [actionTarget]);

  const categoryLookup = useMemo(
    () => new Map(categories.map(category => [category.id, category.name])),
    [categories]
  );

  if (!timetable || dishes.length === 0) return null;

  const findDish = (dishId: string) =>
    dishes.find(item => item.id === dishId);

  const categoryName = (dish: Dish) =>
    categoryLookup.get(dish.categoryId) || 'Món ăn';

  const toggleDay = (day: string) => {
    setExpandedDays(current => {
      const next = new Set(current);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  return (
    <div className={embedded ? "space-y-3" : "space-y-4 pb-28"}>
      {!embedded && (
      <section className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black tracking-[0.14em] text-slate-950 dark:text-slate-100">
              LỊCH ĂN
            </h2>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
              Xem nhanh theo ngày. Chạm món để xem; chỉ mở bộ chọn khi cần đổi món.
            </p>
          </div>
        </div>
      </section>
      )}

      <div className="space-y-2.5">
        {dayOrder
          .filter(day => !(excludeToday && day === todayKey))
          .map(day => {
          const menu = timetable[day];
          const isToday = day === todayKey;
          const isExpanded = expandedDays.has(day);
          const activeMeals = comboKeys.filter(
            comboKey => !menu.options[comboKey].skipped
          );
          const totalCalories = activeMeals.reduce((total, comboKey) => {
            const dish = findDish(menu.options[comboKey].dishId);
            return total + (dish ? estimateDishCalories(dish) : 0);
          }, 0);

          return (
            <motion.section
              layout
              key={day}
              className={
                'overflow-hidden rounded-[22px] border bg-white dark:bg-slate-900 shadow-sm ' +
                (isToday
                  ? 'border-blue-300 dark:border-blue-800'
                  : 'border-slate-200 dark:border-slate-800')
              }
            >
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left"
                aria-expanded={isExpanded}
                aria-controls={'schedule-day-' + day}
              >
                <div
                  className={
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ' +
                    (isToday
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300')
                  }
                >
                  {dayDisplay[day].replace('Thứ ', 'T').replace('Chủ Nhật', 'CN')}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100">
                      {dayDisplay[day]}
                    </h3>
                    {isToday && (
                      <span className="rounded-lg bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Hôm nay
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    <span>{activeMeals.length} bữa</span>
                    <span>·</span>
                    <span>≈ {totalCalories.toLocaleString('vi-VN')} kcal</span>
                  </div>
                </div>

                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-slate-400"
                >
                  <ChevronDown className="h-5 w-5" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    id={'schedule-day-' + day}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: 0.16 }
                    }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 px-3 py-3">
                      {comboKeys.map((comboKey, index) => {
                        const menuItem = menu.options[comboKey];
                        const mealLabel = mealLabels[index];

                        if (menuItem.skipped) {
                          return (
                            <motion.article
                              layout
                              key={comboKey}
                              className="flex min-h-[62px] items-center gap-3 rounded-[16px] border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 px-3 py-2.5"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                                <Ban className="h-4 w-4" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">
                                  {mealLabel}
                                </div>
                                <div className="mt-0.5 truncate text-xs font-black text-slate-600 dark:text-slate-300">
                                  Đã bỏ bữa
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  mockDb.toggleMealSkipped(day, comboKey, false)
                                }
                                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white dark:bg-slate-900 px-3 text-[10px] font-black text-blue-600 dark:text-blue-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Ăn lại
                              </button>
                            </motion.article>
                          );
                        }

                        const dish = findDish(menuItem.dishId);
                        if (!dish) return null;

                        return (
                          <motion.article
                            layout
                            key={comboKey}
                            className="flex min-h-[72px] items-center gap-2 rounded-[16px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2.5"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSelected({ dish, day, comboKey })
                              }
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              aria-label={'Xem ' + mealLabel + ': ' + dish.name}
                            >
                              <DishImage
                                src={dish.imageUrl}
                                alt={dish.name}
                                className="h-11 w-11 shrink-0 rounded-2xl border border-slate-100 dark:border-slate-800"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
                                  {mealLabel}
                                </div>
                                <div className="mt-0.5 truncate text-sm font-black text-slate-950 dark:text-slate-100">
                                  {dish.name}
                                </div>
                                <div className="mt-0.5 truncate text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                  {categoryName(dish)} · ≈ {estimateDishCalories(dish)} kcal
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSwapTarget({ day, comboKey })}
                              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-blue-300 dark:border-blue-900 bg-blue-50 dark:bg-slate-900 px-2.5 text-[10px] font-black text-blue-700 dark:text-blue-300 active:scale-95"
                              aria-label={'Thay món cho ' + mealLabel}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span className="hidden min-[390px]:inline">Đổi</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setActionTarget({ dish, day, comboKey })
                              }
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 active:scale-95"
                              aria-label={'Tùy chọn ' + mealLabel}
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                          </motion.article>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          );
        })}
      </div>

      {selected && (
        <DishDetailModal
          dish={selected.dish}
          day={selected.day}
          comboKey={selected.comboKey}
          isSelectable={selected.day === todayKey}
          onClose={() => setSelected(null)}
        />
      )}

      {swapTarget && (
        <DishPickerModal
          title={
            'Đổi ' +
            mealLabels[comboKeys.indexOf(swapTarget.comboKey)] +
            ' · ' +
            dayDisplay[swapTarget.day]
          }
          dishes={dishes}
          categories={categories}
          selectedDishId={
            timetable[swapTarget.day].options[swapTarget.comboKey].dishId
          }
          onSelect={dish => {
            mockDb.swapDish(swapTarget.day, swapTarget.comboKey, dish.id);
            setSwapTarget(null);
          }}
          onClose={() => setSwapTarget(null)}
        />
      )}

      <AnimatePresence>
        {actionTarget && (
          <motion.div
            key="meal-actions"
            className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Tùy chọn bữa ăn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onMouseDown={event => {
              if (event.currentTarget === event.target) setActionTarget(null);
            }}
          >
            <motion.div
              initial={{ y: 42, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 42, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 430, damping: 34 }}
              className="w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-2xl"
            >
              <div className="mb-2 flex items-center gap-3 px-1 py-1">
                <DishImage
                  src={actionTarget.dish.imageUrl}
                  alt={actionTarget.dish.name}
                  className="h-11 w-11 shrink-0 rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
                    {mealLabels[comboKeys.indexOf(actionTarget.comboKey)]}
                  </div>
                  <div className="truncate text-sm font-black text-slate-950 dark:text-slate-100">
                    {actionTarget.dish.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActionTarget(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
                  aria-label="Đóng tùy chọn"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(actionTarget);
                    setActionTarget(null);
                  }}
                  className="min-h-12 rounded-2xl px-4 text-left text-sm font-black text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Xem chi tiết món
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSwapTarget({
                      day: actionTarget.day,
                      comboKey: actionTarget.comboKey
                    });
                    setActionTarget(null);
                  }}
                  className="min-h-12 rounded-2xl px-4 text-left text-sm font-black text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                >
                  Thay món khác
                </button>
                <button
                  type="button"
                  onClick={() => {
                    mockDb.toggleMealSkipped(
                      actionTarget.day,
                      actionTarget.comboKey,
                      true
                    );
                    setActionTarget(null);
                  }}
                  className="min-h-12 rounded-2xl px-4 text-left text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  Không ăn bữa này
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
