import {
  getVietnamDateKey,
  getVietnamDateKeyOffset,
  parseDateKeyToUtcDay,
  DAY_MS
} from '../../lib/dateTime';

export type MealKey = 'A' | 'B' | 'C';

export type AnalyticsAddon = {
  kind?: 'fruit' | 'drink';
  name?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

export type AnalyticsLog = {
  timestamp: number;
  mealKey?: MealKey;
  dishName: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  addons?: AnalyticsAddon[];
};

export type AnalyticsDish = {
  id: string;
  name: string;
  legacyNames?: string[];
  calories?: number;
  categoryId?: string;
};

export type PlannedDay = {
  options: Record<
    MealKey,
    {
      dishId: string;
      skipped?: boolean;
    }
  >;
};

export const safeCalories = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : 0;

export const sumAddonCalories = (
  addons: AnalyticsAddon[] | undefined
): number =>
  (addons || []).reduce(
    (total, addon) => total + safeCalories(addon.calories),
    0
  );

export const findDishForLog = (
  log: Pick<AnalyticsLog, 'dishName'>,
  dishes: AnalyticsDish[]
): AnalyticsDish | undefined =>
  dishes.find(
    dish =>
      dish.name === log.dishName ||
      dish.legacyNames?.includes(log.dishName)
  );

export const resolveLogMainCalories = (
  log: AnalyticsLog,
  dishes: AnalyticsDish[],
  estimateDish: (dish: AnalyticsDish) => number
): number => {
  if (
    typeof log.calories === 'number' &&
    Number.isFinite(log.calories) &&
    log.calories >= 0
  ) {
    return log.calories;
  }

  const dish = findDishForLog(log, dishes);
  return dish ? safeCalories(estimateDish(dish)) : 0;
};

export const resolveLogTotalCalories = (
  log: AnalyticsLog,
  dishes: AnalyticsDish[],
  estimateDish: (dish: AnalyticsDish) => number
): number =>
  resolveLogMainCalories(log, dishes, estimateDish) +
  sumAddonCalories(log.addons);

export const getLogsForVietnamDate = <T extends AnalyticsLog>(
  logs: T[],
  dateKey: string
): T[] =>
  logs.filter(log => getVietnamDateKey(log.timestamp) === dateKey);

export const isDishConsumedForMeal = (
  logs: AnalyticsLog[],
  mealKey: MealKey,
  dish: Pick<AnalyticsDish, 'name' | 'legacyNames'>
): boolean =>
  logs.some(
    log =>
      log.mealKey === mealKey &&
      (log.dishName === dish.name ||
        dish.legacyNames?.includes(log.dishName))
  );

export const calculateConsumedCalories = (
  logs: AnalyticsLog[],
  dishes: AnalyticsDish[],
  estimateDish: (dish: AnalyticsDish) => number
): number =>
  logs.reduce(
    (total, log) =>
      total + resolveLogTotalCalories(log, dishes, estimateDish),
    0
  );

const validMacro = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

type CompleteMacro = {
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const completeMacro = (
  item: Pick<AnalyticsLog, 'proteinG' | 'carbsG' | 'fatG'> | AnalyticsAddon
): item is CompleteMacro =>
  validMacro(item.proteinG) &&
  validMacro(item.carbsG) &&
  validMacro(item.fatG);

export const calculateConsumedMacros = (logs: AnalyticsLog[]) => {
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let knownItems = 0;
  let knownProteinItems = 0;
  let knownCarbsItems = 0;
  let knownFatItems = 0;
  let totalItems = 0;
  const missingItems: Array<{
    label: string;
    kind: 'dish' | 'addon';
    missing: Array<'protein' | 'carbs' | 'fat'>;
  }> = [];

  const collect = (
    item: Pick<AnalyticsLog, 'proteinG' | 'carbsG' | 'fatG'> | AnalyticsAddon,
    label: string,
    kind: 'dish' | 'addon'
  ) => {
    totalItems++;

    const hasProtein = validMacro(item.proteinG);
    const hasCarbs = validMacro(item.carbsG);
    const hasFat = validMacro(item.fatG);

    if (hasProtein) {
      knownProteinItems++;
      proteinG += item.proteinG;
    }
    if (hasCarbs) {
      knownCarbsItems++;
      carbsG += item.carbsG;
    }
    if (hasFat) {
      knownFatItems++;
      fatG += item.fatG;
    }

    if (hasProtein && hasCarbs && hasFat) {
      knownItems++;
      return;
    }

    const missing: Array<'protein' | 'carbs' | 'fat'> = [];
    if (!hasProtein) missing.push('protein');
    if (!hasCarbs) missing.push('carbs');
    if (!hasFat) missing.push('fat');
    missingItems.push({ label, kind, missing });
  };

  for (const log of logs) {
    collect(log, log.dishName || 'Món chính chưa đặt tên', 'dish');
    (log.addons || []).forEach((addon, index) =>
      collect(
        addon,
        addon.name ||
          (addon.kind === 'fruit'
            ? 'Trái cây ăn kèm'
            : addon.kind === 'drink'
              ? 'Đồ uống ăn kèm'
              : `Món kèm ${index + 1}`),
        'addon'
      )
    );
  }

  const round1 = (value: number) => Math.round(value * 10) / 10;
  const coverage = (known: number) =>
    totalItems > 0 ? Math.round((known / totalItems) * 100) : 0;

  return {
    proteinG: round1(proteinG),
    carbsG: round1(carbsG),
    fatG: round1(fatG),
    knownItems,
    knownProteinItems,
    knownCarbsItems,
    knownFatItems,
    totalItems,
    missingItems,
    proteinCoveragePct: coverage(knownProteinItems),
    carbsCoveragePct: coverage(knownCarbsItems),
    fatCoveragePct: coverage(knownFatItems),
    coveragePct: coverage(knownItems),
    isComplete: totalItems > 0 && knownItems === totalItems
  };
};

export const calculateMealDistribution = (
  logs: AnalyticsLog[],
  dishes: AnalyticsDish[],
  estimateDish: (dish: AnalyticsDish) => number
) => {
  const values: Record<MealKey, number> = { A: 0, B: 0, C: 0 };

  for (const log of logs) {
    if (!log.mealKey) continue;
    values[log.mealKey] += resolveLogTotalCalories(
      log,
      dishes,
      estimateDish
    );
  }

  const total = values.A + values.B + values.C;
  const percent = (value: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return {
    breakfastKcal: values.A,
    lunchKcal: values.B,
    dinnerKcal: values.C,
    total,
    breakfastPct: percent(values.A),
    lunchPct: percent(values.B),
    dinnerPct: percent(values.C)
  };
};

export const calculatePlannedCalories = (
  day: PlannedDay,
  dishes: AnalyticsDish[],
  estimateDish: (dish: AnalyticsDish) => number
) => {
  const mealKeys: MealKey[] = ['A', 'B', 'C'];
  const activeMealKeys = mealKeys.filter(
    mealKey => !day.options[mealKey]?.skipped
  );

  const totalCalories = activeMealKeys.reduce((total, mealKey) => {
    const dishId = day.options[mealKey]?.dishId;
    const dish = dishes.find(item => item.id === dishId);
    return total + (dish ? safeCalories(estimateDish(dish)) : 0);
  }, 0);

  return {
    activeMealKeys,
    activeMealCount: activeMealKeys.length,
    totalCalories
  };
};

export type RecentDayCalories = {
  dateKey: string;
  shortLabel: string;
  dayNum: string;
  calories: number;
  isToday: boolean;
  mealCount: number;
};

const labelFromDateKey = (dateKey: string) => {
  const utcDay = parseDateKeyToUtcDay(dateKey);
  if (utcDay === null) return { shortLabel: '', dayNum: '' };
  const date = new Date(utcDay * DAY_MS);
  const dayOfWeek = date.getUTCDay();
  const shortLabel = dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`;
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return { shortLabel, dayNum: `${day}/${month}` };
};

export const buildRecentConsumedSeries = ({
  logs,
  dishes,
  endDateKey,
  days = 7,
  estimateDish
}: {
  logs: AnalyticsLog[];
  dishes: AnalyticsDish[];
  endDateKey: string;
  days?: number;
  estimateDish: (dish: AnalyticsDish) => number;
}) => {
  if (!Number.isInteger(days) || days <= 0 || days > 366) {
    return {
      days: [] as RecentDayCalories[],
      maxKcal: 0,
      totalPeriodKcal: 0,
      activeDays: 0,
      averagePerCalendarDay: 0,
      averagePerActiveDay: 0
    };
  }

  const rows: RecentDayCalories[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const key = getVietnamDateKeyOffset(endDateKey, -offset);
    if (!key) continue;
    const dayLogs = getLogsForVietnamDate(logs, key);
    const calories = calculateConsumedCalories(
      dayLogs,
      dishes,
      estimateDish
    );
    const label = labelFromDateKey(key);

    rows.push({
      dateKey: key,
      shortLabel: offset === 0 ? 'Nay' : label.shortLabel,
      dayNum: label.dayNum,
      calories,
      isToday: offset === 0,
      mealCount: dayLogs.length
    });
  }

  const totalPeriodKcal = rows.reduce(
    (total, row) => total + row.calories,
    0
  );
  const activeDays = rows.filter(row => row.calories > 0).length;

  return {
    days: rows,
    maxKcal: Math.max(1600, ...rows.map(row => row.calories)),
    totalPeriodKcal,
    activeDays,
    averagePerCalendarDay:
      rows.length > 0
        ? Math.round(totalPeriodKcal / rows.length)
        : 0,
    averagePerActiveDay:
      activeDays > 0
        ? Math.round(totalPeriodKcal / activeDays)
        : 0
  };
};
