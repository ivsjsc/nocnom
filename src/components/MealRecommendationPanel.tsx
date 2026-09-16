import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Gauge,
  Sparkles,
  UtensilsCrossed
} from 'lucide-react';
import type {
  Category,
  DayMenu,
  Dish,
  LogEntry,
  MealKey
} from '../lib/db';
import DishImage from './DishImage';
import {
  buildMealRecommendations,
  getRemainingMealKeys,
  RECOMMENDATION_MODE_HINTS,
  RECOMMENDATION_MODE_LABELS,
  resolveNextMealKey,
  type RecommendationMode
} from '../domain/meal/recommendationEngine';

type BehaviorEvent = {
  type: 'impression' | 'select' | 'mode';
  timestamp: number;
  dateKey: string;
  mode: RecommendationMode;
  mealKey?: MealKey;
  dishId?: string;
  dishIds?: string[];
};

type Props = {
  userId?: string | null;
  todayMenu: DayMenu;
  dishes: Dish[];
  categories: Category[];
  logs: LogEntry[];
  todayDateKey: string;
  dailyCalorieTarget: number | null;
  consumedCalories: number;
  initialMode?: RecommendationMode | null;
  initialBudgetVnd?: number | string | null;
  onSelect: (mealKey: MealKey, dish: Dish) => void;
  onPreferenceChange?: (
    mode: RecommendationMode,
    budgetVnd: number | ''
  ) => Promise<void> | void;
};

const mealLabels: Record<MealKey, string> = {
  A: 'Bữa sáng',
  B: 'Bữa trưa',
  C: 'Bữa tối'
};

const behaviorStorageKey = (userId?: string | null) =>
  `nocnom_recommendation_behavior_${userId || 'guest'}`;

const readBehaviorEvents = (userId?: string | null): BehaviorEvent[] => {
  try {
    const raw = localStorage.getItem(behaviorStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BehaviorEvent[]) : [];
  } catch {
    return [];
  }
};

const appendBehaviorEvent = (
  userId: string | null | undefined,
  event: BehaviorEvent
) => {
  try {
    const events = readBehaviorEvents(userId);
    localStorage.setItem(
      behaviorStorageKey(userId),
      JSON.stringify([...events, event].slice(-180))
    );
  } catch {
    // Behavior learning is helpful but must never block meal selection.
  }
};

const selectionCountsFromEvents = (events: BehaviorEvent[]) => {
  const counts: Record<string, number> = {};
  events.forEach(event => {
    if (event.type !== 'select' || !event.dishId) return;
    counts[event.dishId] = (counts[event.dishId] ?? 0) + 1;
  });
  return counts;
};

const parseBudget = (value: string) => {
  if (!value.trim()) return '' as const;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 5000 || number > 2_000_000) {
    return null;
  }
  return Math.round(number);
};

const formatPrice = (price: number | null) =>
  price === null ? 'chưa có giá' : `${price.toLocaleString('vi-VN')}đ`;

export default function MealRecommendationPanel({
  userId,
  todayMenu,
  dishes,
  categories,
  logs,
  todayDateKey,
  dailyCalorieTarget,
  consumedCalories,
  initialMode,
  initialBudgetVnd,
  onSelect,
  onPreferenceChange
}: Props) {
  const [mode, setMode] = useState<RecommendationMode>(
    initialMode || 'balanced'
  );
  const [budgetInput, setBudgetInput] = useState(
    initialBudgetVnd ? String(initialBudgetVnd) : ''
  );
  const [expanded, setExpanded] = useState(false);
  const [showBudget, setShowBudget] = useState(
    Boolean(initialBudgetVnd) || initialMode === 'budget'
  );
  const [budgetError, setBudgetError] = useState('');
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [behaviorRevision, setBehaviorRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const impressionRef = useRef('');

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialBudgetVnd !== undefined && initialBudgetVnd !== null) {
      setBudgetInput(initialBudgetVnd ? String(initialBudgetVnd) : '');
      if (initialBudgetVnd) setShowBudget(true);
    }
  }, [initialBudgetVnd]);

  const behaviorSelectionCounts = useMemo(
    () => selectionCountsFromEvents(readBehaviorEvents(userId)),
    [behaviorRevision, userId]
  );

  const nextMealKey = useMemo(
    () =>
      resolveNextMealKey({
        menu: todayMenu,
        logs,
        dateKey: todayDateKey
      }),
    [logs, todayDateKey, todayMenu]
  );

  const remainingMealKeys = useMemo(
    () =>
      getRemainingMealKeys({
        menu: todayMenu,
        logs,
        dateKey: todayDateKey
      }),
    [logs, todayDateKey, todayMenu]
  );

  const parsedBudget = parseBudget(budgetInput);
  const budgetForRanking = parsedBudget === null ? '' : parsedBudget;

  const recommendations = useMemo(() => {
    if (!nextMealKey) return [];
    return buildMealRecommendations({
      mealKey: nextMealKey,
      dishes,
      categories,
      logs,
      todayDateKey,
      dailyCalorieTarget,
      consumedCalories,
      remainingMealKeys,
      budgetVnd: budgetForRanking || null,
      mode,
      behaviorSelectionCounts,
      limit: 3
    });
  }, [
    behaviorSelectionCounts,
    budgetForRanking,
    categories,
    consumedCalories,
    dailyCalorieTarget,
    dishes,
    logs,
    mode,
    nextMealKey,
    remainingMealKeys,
    todayDateKey
  ]);

  useEffect(() => {
    if (!nextMealKey || recommendations.length === 0) return;
    const signature = `${todayDateKey}|${nextMealKey}|${mode}|${recommendations
      .map(item => item.dish.id)
      .join(',')}`;
    if (impressionRef.current === signature) return;
    impressionRef.current = signature;
    appendBehaviorEvent(userId, {
      type: 'impression',
      timestamp: Date.now(),
      dateKey: todayDateKey,
      mode,
      mealKey: nextMealKey,
      dishIds: recommendations.map(item => item.dish.id)
    });
  }, [mode, nextMealKey, recommendations, todayDateKey, userId]);

  if (!nextMealKey || recommendations.length === 0) return null;

  const primary = recommendations[0];
  const currentDishId = todayMenu.options[nextMealKey].dishId;
  const parsedBudgetForSave = parseBudget(budgetInput);

  const persistPreferences = async (
    nextMode: RecommendationMode,
    nextBudget: number | ''
  ) => {
    if (!onPreferenceChange) return;
    setPreferenceSaving(true);
    try {
      await onPreferenceChange(nextMode, nextBudget);
    } finally {
      setPreferenceSaving(false);
    }
  };

  const selectMode = (nextMode: RecommendationMode) => {
    setMode(nextMode);
    setNotice('');
    if (nextMode === 'budget') setShowBudget(true);
    appendBehaviorEvent(userId, {
      type: 'mode',
      timestamp: Date.now(),
      dateKey: todayDateKey,
      mode: nextMode,
      mealKey: nextMealKey
    });
    const budget = parseBudget(budgetInput);
    if (budget !== null) {
      void persistPreferences(nextMode, budget);
    }
  };

  const saveBudget = () => {
    const budget = parseBudget(budgetInput);
    if (budget === null) {
      setBudgetError('Ngân sách/bữa cần từ 5.000đ đến 2.000.000đ.');
      return;
    }
    setBudgetError('');
    void persistPreferences(mode, budget);
  };

  const choose = (dish: Dish) => {
    appendBehaviorEvent(userId, {
      type: 'select',
      timestamp: Date.now(),
      dateKey: todayDateKey,
      mode,
      mealKey: nextMealKey,
      dishId: dish.id
    });
    setBehaviorRevision(value => value + 1);
    onSelect(nextMealKey, dish);
    setNotice(`Đã chọn ${dish.name} cho ${mealLabels[nextMealKey].toLowerCase()}.`);
  };

  return (
    <section
      className="rounded-[28px] border border-blue-200/80 bg-white p-4 shadow-sm dark:border-blue-900/60 dark:bg-slate-900"
      data-ui="meal-recommendation-v2"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
            Gợi ý thông minh · {mealLabels[nextMealKey]}
          </div>
          <h2 className="mt-0.5 text-lg font-black text-slate-950 dark:text-slate-100">
            Ăn gì tiếp theo?
          </h2>
          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
            Xếp hạng theo mục tiêu hiện tại, lịch sử ăn, giá và độ đa dạng. Bạn vẫn là người quyết định món cuối cùng.
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Chế độ gợi ý món">
        {(Object.keys(RECOMMENDATION_MODE_LABELS) as RecommendationMode[]).map(item => {
          const active = mode === item;
          return (
            <button
              type="button"
              key={item}
              role="radio"
              aria-checked={active}
              onClick={() => selectMode(item)}
              title={RECOMMENDATION_MODE_HINTS[item]}
              className={
                'min-h-10 shrink-0 rounded-xl border px-3 text-[11px] font-black transition-colors ' +
                (active
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300')
              }
            >
              {RECOMMENDATION_MODE_LABELS[item]}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        <span>{RECOMMENDATION_MODE_HINTS[mode]}</span>
        <button
          type="button"
          onClick={() => setShowBudget(value => !value)}
          className="shrink-0 font-black text-blue-600 dark:text-blue-300"
        >
          {budgetInput ? `Ngân sách ${Number(budgetInput).toLocaleString('vi-VN')}đ` : 'Đặt ngân sách'}
        </button>
      </div>

      {showBudget ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/70">
          <label className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="min-w-0 flex-1 text-[11px] font-black text-slate-700 dark:text-slate-300">
              Ngân sách / bữa
            </span>
            <input
              type="number"
              min="5000"
              max="2000000"
              step="5000"
              inputMode="numeric"
              value={budgetInput}
              onChange={event => {
                setBudgetInput(event.target.value);
                setBudgetError('');
              }}
              onBlur={saveBudget}
              placeholder="VD 50000"
              className="h-10 w-32 rounded-xl border border-slate-200 bg-white px-3 text-right text-xs font-black text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          {budgetError ? (
            <div className="mt-2 text-[10px] font-bold text-red-600">{budgetError}</div>
          ) : (
            <div className="mt-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Tùy chọn. Nếu để trống, nOcnOm không giả định ngân sách của bạn.
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-4 rounded-[22px] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3.5 dark:border-blue-900/50 dark:from-blue-950/50 dark:to-slate-900">
        <div className="flex items-center gap-3">
          <DishImage
            src={primary.dish.imageUrl}
            alt={primary.dish.name}
            className="h-16 w-16 shrink-0 rounded-2xl border border-white shadow-sm dark:border-slate-800"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">
              <Gauge className="h-3.5 w-3.5" />
              Phù hợp nhất lúc này
            </div>
            <div className="mt-1 truncate text-base font-black text-slate-950 dark:text-slate-100">
              {primary.dish.name}
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
              ≈ {primary.calories.toLocaleString('vi-VN')} kcal · {formatPrice(primary.price)}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {primary.reasons.map(reason => (
            <span
              key={reason}
              className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
            >
              {reason}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => choose(primary.dish)}
          disabled={primary.dish.id === currentDishId}
          className={
            'mt-3 min-h-11 w-full rounded-2xl px-4 text-xs font-black transition-transform active:scale-[0.99] ' +
            (primary.dish.id === currentDishId
              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              : 'bg-blue-600 text-white shadow-sm shadow-blue-600/20')
          }
        >
          {primary.dish.id === currentDishId ? 'Đang trong lịch' : `Chọn cho ${mealLabels[nextMealKey].toLowerCase()}`}
        </button>
      </div>

      {notice ? (
        <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded(value => !value)}
        className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-[11px] font-black text-blue-600 dark:text-blue-300"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {expanded ? 'Thu gọn' : 'Xem 3 gợi ý'}
      </button>

      {expanded ? (
        <div className="mt-2 space-y-2">
          {recommendations.map((item, index) => (
            <div
              key={item.dish.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2.5 dark:border-slate-700"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {index + 1}
              </div>
              <DishImage
                src={item.dish.imageUrl}
                alt={item.dish.name}
                className="h-11 w-11 shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-black text-slate-950 dark:text-slate-100">
                  {item.dish.name}
                </div>
                <div className="mt-0.5 truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  ≈ {item.calories.toLocaleString('vi-VN')} kcal · {formatPrice(item.price)}
                </div>
                <div className="mt-0.5 truncate text-[9px] font-bold text-blue-600 dark:text-blue-300">
                  {item.reasons[0]}
                </div>
              </div>
              <button
                type="button"
                onClick={() => choose(item.dish)}
                disabled={item.dish.id === currentDishId}
                className={
                  'min-h-9 shrink-0 rounded-xl px-3 text-[10px] font-black ' +
                  (item.dish.id === currentDishId
                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300')
                }
              >
                {item.dish.id === currentDishId ? 'Đang chọn' : 'Chọn'}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2 text-[9px] font-semibold text-slate-400 dark:text-slate-500">
        <UtensilsCrossed className="h-3.5 w-3.5 shrink-0" />
        <span>
          Gợi ý là hỗ trợ quyết định, không thay thế tư vấn dinh dưỡng hoặc y tế.
          {preferenceSaving ? ' Đang lưu tùy chọn…' : ''}
        </span>
      </div>
    </section>
  );
}
