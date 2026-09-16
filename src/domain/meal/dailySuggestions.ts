import {
  getVietnamDateKey,
  getVietnamDayKey
} from '../../lib/dateTime';
import type {
  Category,
  Dish,
  LogEntry,
  MealKey,
  Timetable
} from '../../lib/db';

export const DAILY_SUGGESTION_VERSION = 1;

const RECENT_LOG_DAYS = 4;
const RECENT_SUGGESTION_DAYS = 3;
const mealKeys: MealKey[] = ['A', 'B', 'C'];

const mealTargets: Record<MealKey, number> = {
  A: 450,
  B: 650,
  C: 650
};

type DailySuggestionState = {
  timetable: Timetable;
  dishes: Dish[];
  categories: Category[];
  logs: LogEntry[];
};

type SuggestionMenuMeta = {
  suggestionDate?: string;
  suggestionVersion?: number;
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/giu, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const parseDateKey = (dateKey: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;

  return Date.UTC(year, month - 1, day);
};

const calendarDayDistance = (newer: string, older: string) => {
  const newerTime = parseDateKey(newer);
  const olderTime = parseDateKey(older);
  if (newerTime === null || olderTime === null) return null;
  return Math.round((newerTime - olderTime) / 86_400_000);
};

const seededNoise = (seed: string) => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4_294_967_295;
};

const finitePositive = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const categoryFallbackCalories = (categoryName: string) => {
  const normalized = normalizeText(categoryName);

  if (
    normalized.includes('trai cay') ||
    normalized.includes('do uong') ||
    normalized.includes('thuc uong') ||
    normalized.includes('trang mieng')
  ) {
    return 250;
  }

  if (
    normalized.includes('pho') ||
    normalized.includes('bun') ||
    normalized.includes('mi') ||
    normalized.includes('hu tieu') ||
    normalized.includes('mon nuoc')
  ) {
    return 550;
  }

  if (
    normalized.includes('com') ||
    normalized.includes('mon man') ||
    normalized.includes('combo') ||
    normalized.includes('phan an')
  ) {
    return 650;
  }

  return 500;
};

const isLikelyMainDish = (dish: Dish, categoryName: string) => {
  const name = normalizeText(dish.name);
  const category = normalizeText(categoryName);
  const mainSignals = [
    'com',
    'banh mi',
    'sandwich',
    'wrap',
    'salad',
    'bun',
    'pho',
    'mi',
    'mien',
    'chao',
    'xoi',
    'hu tieu',
    'thit',
    'ga',
    'ca',
    'bo',
    'hai san',
    'trung',
    'lau'
  ];

  if (mainSignals.some(signal => name.includes(signal))) return true;

  const auxiliaryCategory =
    category.includes('trai cay') ||
    category.includes('do uong') ||
    category.includes('thuc uong') ||
    category.includes('an vat') ||
    category.includes('trang mieng') ||
    category.includes('mon ngot');

  return !auxiliaryCategory;
};

const breakfastAffinity = (dish: Dish) => {
  const name = normalizeText(dish.name);
  const breakfastSignals = [
    'banh mi',
    'sandwich',
    'wrap',
    'pho',
    'bun',
    'mi',
    'mien',
    'chao',
    'xoi',
    'hu tieu',
    'trung',
    'sua chua'
  ];

  if (breakfastSignals.some(signal => name.includes(signal))) return -0.35;
  if (name.includes('lau')) return 0.9;
  return 0;
};

const getDishCalories = (
  dish: Dish,
  categoryLookup: Map<string, string>
) =>
  finitePositive(dish.calories) ??
  categoryFallbackCalories(categoryLookup.get(dish.categoryId) ?? '');

const recentSuggestedDishIds = (
  timetable: Timetable,
  todayDateKey: string
) => {
  const recent = new Set<string>();

  Object.values(timetable).forEach(dayMenu => {
    const meta = dayMenu as typeof dayMenu & SuggestionMenuMeta;
    if (!meta.suggestionDate) return;

    const age = calendarDayDistance(todayDateKey, meta.suggestionDate);
    if (age === null || age < 0 || age > RECENT_SUGGESTION_DAYS) return;

    mealKeys.forEach(mealKey => {
      const dishId = dayMenu.options?.[mealKey]?.dishId;
      if (dishId) recent.add(dishId);
    });
  });

  return recent;
};

const recentConsumedDishNames = (
  logs: LogEntry[],
  todayDateKey: string
) => {
  const recent = new Set<string>();

  logs.forEach(log => {
    const logDateKey = getVietnamDateKey(log.timestamp);
    const age = calendarDayDistance(todayDateKey, logDateKey);
    if (age === null || age < 0 || age > RECENT_LOG_DAYS) return;

    const normalizedName = normalizeText(log.dishName);
    if (normalizedName) recent.add(normalizedName);
  });

  return recent;
};

const todayLogsByMeal = (
  logs: LogEntry[],
  todayDateKey: string
) => {
  const byMeal = new Map<MealKey, LogEntry>();

  logs.forEach(log => {
    if (!log.mealKey || byMeal.has(log.mealKey)) return;
    if (getVietnamDateKey(log.timestamp) !== todayDateKey) return;
    byMeal.set(log.mealKey, log);
  });

  return byMeal;
};

const chooseDishForMeal = ({
  mealKey,
  dateKey,
  candidates,
  categoryLookup,
  usedDishIds,
  recentDishIds,
  recentDishNames
}: {
  mealKey: MealKey;
  dateKey: string;
  candidates: Dish[];
  categoryLookup: Map<string, string>;
  usedDishIds: Set<string>;
  recentDishIds: Set<string>;
  recentDishNames: Set<string>;
}) => {
  const available = candidates.filter(dish => !usedDishIds.has(dish.id));
  const pool = available.length > 0 ? available : candidates;
  const target = mealTargets[mealKey];

  let winner: Dish | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  pool.forEach(dish => {
    const calories = getDishCalories(dish, categoryLookup);
    const calorieDistance = Math.abs(calories - target) / target;
    const normalizedName = normalizeText(dish.name);
    const categoryName = categoryLookup.get(dish.categoryId) ?? '';
    const mainDishPenalty = isLikelyMainDish(dish, categoryName) ? 0 : 3;
    const recentLogPenalty = recentDishNames.has(normalizedName) ? 2.5 : 0;
    const recentSuggestionPenalty = recentDishIds.has(dish.id) ? 1.25 : 0;
    const favoriteBonus = dish.isFavorite ? -0.12 : 0;
    const slotAffinity = mealKey === 'A' ? breakfastAffinity(dish) : 0;
    const deterministicVariety = seededNoise(`${dateKey}|${mealKey}|${dish.id}`) * 0.2;

    const score =
      calorieDistance * 1.5 +
      mainDishPenalty +
      recentLogPenalty +
      recentSuggestionPenalty +
      favoriteBonus +
      slotAffinity +
      deterministicVariety;

    if (score < bestScore) {
      winner = dish;
      bestScore = score;
    }
  });

  return winner;
};

export const refreshDailyMealSuggestions = <T extends DailySuggestionState>(
  state: T,
  now = Date.now()
): { state: T; changed: boolean } => {
  const todayDateKey = getVietnamDateKey(now);
  const todayDayKey = getVietnamDayKey(now);
  const currentMenu = state.timetable[todayDayKey];

  if (!currentMenu || state.dishes.length === 0) {
    return { state, changed: false };
  }

  const currentMeta = currentMenu as typeof currentMenu & SuggestionMenuMeta;
  if (
    currentMeta.suggestionDate === todayDateKey &&
    currentMeta.suggestionVersion === DAILY_SUGGESTION_VERSION
  ) {
    return { state, changed: false };
  }

  const categoryLookup = new Map(
    state.categories.map(category => [category.id, category.name])
  );
  const mainDishCandidates = state.dishes.filter(dish =>
    isLikelyMainDish(dish, categoryLookup.get(dish.categoryId) ?? '')
  );
  const candidates =
    mainDishCandidates.length >= mealKeys.length
      ? mainDishCandidates
      : state.dishes;

  const recentDishIds = recentSuggestedDishIds(
    state.timetable,
    todayDateKey
  );
  const recentDishNames = recentConsumedDishNames(
    state.logs,
    todayDateKey
  );
  const consumedToday = todayLogsByMeal(state.logs, todayDateKey);
  const usedDishIds = new Set<string>();

  const nextOptions = { ...currentMenu.options };

  mealKeys.forEach(mealKey => {
    const eatenLog = consumedToday.get(mealKey);
    if (eatenLog) {
      const eatenName = normalizeText(eatenLog.dishName);
      const eatenDish = state.dishes.find(
        dish => normalizeText(dish.name) === eatenName
      );
      const dishId = eatenDish?.id ?? currentMenu.options[mealKey].dishId;
      usedDishIds.add(dishId);
      nextOptions[mealKey] = {
        ...currentMenu.options[mealKey],
        dishId,
        skipped: false
      };
      return;
    }

    const selected = chooseDishForMeal({
      mealKey,
      dateKey: todayDateKey,
      candidates,
      categoryLookup,
      usedDishIds,
      recentDishIds,
      recentDishNames
    });

    if (!selected) return;

    usedDishIds.add(selected.id);
    nextOptions[mealKey] = {
      ...currentMenu.options[mealKey],
      dishId: selected.id,
      skipped: false
    };
  });

  const nextMenu = {
    dayName: currentMenu.dayName,
    options: nextOptions,
    suggestionDate: todayDateKey,
    suggestionVersion: DAILY_SUGGESTION_VERSION
  } as typeof currentMenu;

  return {
    state: {
      ...state,
      timetable: {
        ...state.timetable,
        [todayDayKey]: nextMenu
      }
    } as T,
    changed: true
  };
};
