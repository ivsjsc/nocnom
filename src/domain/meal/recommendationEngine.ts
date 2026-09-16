import { getVietnamDateKey } from '../../lib/dateTime';
import type {
  Category,
  DayMenu,
  Dish,
  LogEntry,
  MealKey
} from '../../lib/db';

export type RecommendationMode =
  | 'balanced'
  | 'budget'
  | 'variety'
  | 'quick';

export const RECOMMENDATION_MODE_LABELS: Record<RecommendationMode, string> = {
  balanced: 'Cân bằng',
  budget: 'Tiết kiệm',
  variety: 'Đổi vị',
  quick: 'Nhanh'
};

export const RECOMMENDATION_MODE_HINTS: Record<RecommendationMode, string> = {
  balanced: 'Cân đối kcal, sở thích, giá và độ đa dạng',
  budget: 'Ưu tiên món phù hợp ngân sách',
  variety: 'Giảm lặp món và nhóm món gần đây',
  quick: 'Ưu tiên món có thông tin quán/link thuận tiện'
};

const MODE_WEIGHTS: Record<
  RecommendationMode,
  Record<'kcal' | 'preference' | 'budget' | 'convenience' | 'variety', number>
> = {
  balanced: {
    kcal: 0.35,
    preference: 0.25,
    budget: 0.2,
    convenience: 0.1,
    variety: 0.1
  },
  budget: {
    kcal: 0.25,
    preference: 0.15,
    budget: 0.45,
    convenience: 0.1,
    variety: 0.05
  },
  variety: {
    kcal: 0.2,
    preference: 0.15,
    budget: 0.1,
    convenience: 0.05,
    variety: 0.5
  },
  quick: {
    kcal: 0.25,
    preference: 0.15,
    budget: 0.1,
    convenience: 0.45,
    variety: 0.05
  }
};

const BASE_MEAL_SHARE: Record<MealKey, number> = {
  A: 0.25,
  B: 0.375,
  C: 0.375
};

const FALLBACK_MEAL_TARGET: Record<MealKey, number> = {
  A: 450,
  B: 650,
  C: 650
};

const MEAL_TARGET_BOUNDS: Record<MealKey, { min: number; max: number }> = {
  A: { min: 250, max: 700 },
  B: { min: 350, max: 950 },
  C: { min: 350, max: 950 }
};

const mealKeys: MealKey[] = ['A', 'B', 'C'];
const DAY_MS = 86_400_000;
const HISTORY_DAYS = 30;

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/giu, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const finitePositive = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const parseDateKey = (dateKey: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  return Number.isFinite(timestamp) ? timestamp : null;
};

const dateDistance = (newer: string, older: string) => {
  const newerTime = parseDateKey(newer);
  const olderTime = parseDateKey(older);
  if (newerTime === null || olderTime === null) return null;
  return Math.round((newerTime - olderTime) / DAY_MS);
};

const seededNoise = (seed: string) => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4_294_967_295;
};

const categoryFallbackCalories = (categoryName: string) => {
  const normalized = normalizeText(categoryName);
  if (
    normalized.includes('trai cay') ||
    normalized.includes('do uong') ||
    normalized.includes('thuc uong') ||
    normalized.includes('trang mieng') ||
    normalized.includes('an vat')
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

const getDishCalories = (dish: Dish, categoryName: string) =>
  finitePositive(dish.calories) ?? categoryFallbackCalories(categoryName);

const getDishMinPrice = (dish: Dish) => {
  const prices = dish.vendors
    .map(vendor => finitePositive(vendor.price))
    .filter((price): price is number => price !== null);
  return prices.length ? Math.min(...prices) : null;
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

  const auxiliary =
    category.includes('trai cay') ||
    category.includes('do uong') ||
    category.includes('thuc uong') ||
    category.includes('an vat') ||
    category.includes('trang mieng') ||
    category.includes('mon ngot');
  return !auxiliary;
};

const breakfastAffinity = (mealKey: MealKey, dish: Dish) => {
  if (mealKey !== 'A') return 0;
  const name = normalizeText(dish.name);
  const preferred = [
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
    'trung'
  ];
  if (preferred.some(signal => name.includes(signal))) return 0.08;
  if (name.includes('lau')) return -0.12;
  return 0;
};

export const calculateAdaptiveMealTarget = ({
  mealKey,
  dailyCalorieTarget,
  consumedCalories,
  remainingMealKeys
}: {
  mealKey: MealKey;
  dailyCalorieTarget?: number | null;
  consumedCalories?: number;
  remainingMealKeys?: MealKey[];
}) => {
  const dailyTarget = finitePositive(dailyCalorieTarget);
  if (!dailyTarget) return FALLBACK_MEAL_TARGET[mealKey];

  const active = (remainingMealKeys?.length ? remainingMealKeys : mealKeys).filter(
    key => BASE_MEAL_SHARE[key] > 0
  );
  const keys = active.includes(mealKey) ? active : [...active, mealKey];
  const shareTotal = keys.reduce((sum, key) => sum + BASE_MEAL_SHARE[key], 0);
  const remainingEnergy = Math.max(
    0,
    dailyTarget - Math.max(0, Number(consumedCalories) || 0)
  );
  const rawTarget = shareTotal > 0
    ? remainingEnergy * (BASE_MEAL_SHARE[mealKey] / shareTotal)
    : FALLBACK_MEAL_TARGET[mealKey];
  const bounds = MEAL_TARGET_BOUNDS[mealKey];
  return Math.round(Math.max(bounds.min, Math.min(bounds.max, rawTarget)));
};

const vietnamHour = (now: number) => {
  const value = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: 'numeric',
    hourCycle: 'h23'
  }).format(new Date(now));
  const hour = Number(value);
  return Number.isFinite(hour) ? hour : 12;
};

export const resolveNextMealKey = ({
  menu,
  logs,
  dateKey,
  now = Date.now()
}: {
  menu: DayMenu;
  logs: LogEntry[];
  dateKey: string;
  now?: number;
}): MealKey | null => {
  const eaten = new Set<MealKey>();
  logs.forEach(log => {
    if (
      log.mealKey &&
      getVietnamDateKey(log.timestamp) === dateKey
    ) {
      eaten.add(log.mealKey);
    }
  });

  const remaining = mealKeys.filter(
    key => !menu.options[key].skipped && !eaten.has(key)
  );
  if (!remaining.length) return null;

  const hour = vietnamHour(now);
  const priority: MealKey[] = hour < 10
    ? ['A', 'B', 'C']
    : hour < 15
      ? ['B', 'C', 'A']
      : ['C', 'B', 'A'];

  return priority.find(key => remaining.includes(key)) ?? remaining[0] ?? null;
};

export const getRemainingMealKeys = ({
  menu,
  logs,
  dateKey
}: {
  menu: DayMenu;
  logs: LogEntry[];
  dateKey: string;
}) => {
  const eaten = new Set<MealKey>();
  logs.forEach(log => {
    if (
      log.mealKey &&
      getVietnamDateKey(log.timestamp) === dateKey
    ) {
      eaten.add(log.mealKey);
    }
  });
  return mealKeys.filter(
    key => !menu.options[key].skipped && !eaten.has(key)
  );
};

type HistorySignals = {
  nameCount: Map<string, number>;
  categoryCount: Map<string, number>;
  lastEatenDays: Map<string, number>;
  lastCategoryDays: Map<string, number>;
};

const buildHistorySignals = ({
  logs,
  dishes,
  todayDateKey
}: {
  logs: LogEntry[];
  dishes: Dish[];
  todayDateKey: string;
}): HistorySignals => {
  const nameCount = new Map<string, number>();
  const categoryCount = new Map<string, number>();
  const lastEatenDays = new Map<string, number>();
  const lastCategoryDays = new Map<string, number>();
  const dishByName = new Map(
    dishes.map(dish => [normalizeText(dish.name), dish])
  );

  logs.forEach(log => {
    const age = dateDistance(todayDateKey, getVietnamDateKey(log.timestamp));
    if (age === null || age < 0 || age > HISTORY_DAYS) return;
    const name = normalizeText(log.dishName);
    if (!name) return;

    nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
    const previousAge = lastEatenDays.get(name);
    if (previousAge === undefined || age < previousAge) {
      lastEatenDays.set(name, age);
    }

    const dish = dishByName.get(name);
    if (!dish) return;
    categoryCount.set(
      dish.categoryId,
      (categoryCount.get(dish.categoryId) ?? 0) + 1
    );
    const previousCategoryAge = lastCategoryDays.get(dish.categoryId);
    if (previousCategoryAge === undefined || age < previousCategoryAge) {
      lastCategoryDays.set(dish.categoryId, age);
    }
  });

  return { nameCount, categoryCount, lastEatenDays, lastCategoryDays };
};

const preferenceScore = ({
  dish,
  history,
  behaviorSelectionCounts
}: {
  dish: Dish;
  history: HistorySignals;
  behaviorSelectionCounts?: Record<string, number>;
}) => {
  const name = normalizeText(dish.name);
  const exact = history.nameCount.get(name) ?? 0;
  const category = history.categoryCount.get(dish.categoryId) ?? 0;
  const behavior = behaviorSelectionCounts?.[dish.id] ?? 0;

  return clamp01(
    (dish.isFavorite ? 0.45 : 0) +
    Math.min(exact / 4, 1) * 0.3 +
    Math.min(category / 6, 1) * 0.15 +
    Math.min(behavior / 3, 1) * 0.2
  );
};

const varietyScore = (dish: Dish, history: HistorySignals) => {
  const name = normalizeText(dish.name);
  const age = history.lastEatenDays.get(name);
  let dishScore = 1;
  if (age !== undefined) {
    dishScore = age >= 7
      ? 1
      : age >= 4
        ? 0.8
        : age >= 2
          ? 0.55
          : age === 1
            ? 0.2
            : 0.05;
  }

  const categoryAge = history.lastCategoryDays.get(dish.categoryId);
  const categoryFactor = categoryAge === undefined || categoryAge >= 3
    ? 1
    : categoryAge === 2
      ? 0.9
      : categoryAge === 1
        ? 0.75
        : 0.65;
  return clamp01(dishScore * categoryFactor);
};

const convenienceScore = (dish: Dish) => {
  if (!dish.vendors.length) return undefined;
  if (dish.vendors.some(vendor => Boolean(vendor.link?.trim()))) return 1;
  if (
    dish.vendors.some(vendor =>
      Boolean(vendor.phone?.trim()) || Boolean(vendor.address?.trim())
    )
  ) {
    return 0.55;
  }
  return 0.35;
};

const normalizedBudgetScore = ({
  price,
  budget,
  minKnownPrice,
  maxKnownPrice,
  mode
}: {
  price: number | null;
  budget: number | null;
  minKnownPrice: number | null;
  maxKnownPrice: number | null;
  mode: RecommendationMode;
}) => {
  if (price === null) return undefined;

  if (budget !== null) {
    if (price <= budget) {
      return clamp01(0.6 + 0.4 * (1 - price / budget));
    }
    return clamp01(0.6 - ((price - budget) / budget) * 1.2);
  }

  if (
    mode === 'budget' &&
    minKnownPrice !== null &&
    maxKnownPrice !== null
  ) {
    if (maxKnownPrice <= minKnownPrice) return 1;
    return clamp01(
      1 - (price - minKnownPrice) / (maxKnownPrice - minKnownPrice)
    );
  }

  return undefined;
};

export type RecommendationScoreComponents = {
  kcal: number;
  preference: number;
  budget?: number;
  convenience?: number;
  variety: number;
};

export type MealRecommendation = {
  dish: Dish;
  score: number;
  calories: number;
  price: number | null;
  categoryName: string;
  targetCalories: number;
  reasons: string[];
  components: RecommendationScoreComponents;
};

const weightedScore = ({
  mode,
  components
}: {
  mode: RecommendationMode;
  components: RecommendationScoreComponents;
}) => {
  const weights = MODE_WEIGHTS[mode];
  const values: Array<[
    keyof RecommendationScoreComponents,
    number | undefined
  ]> = [
    ['kcal', components.kcal],
    ['preference', components.preference],
    ['budget', components.budget],
    ['convenience', components.convenience],
    ['variety', components.variety]
  ];

  let numerator = 0;
  let denominator = 0;
  values.forEach(([key, value]) => {
    if (value === undefined) return;
    const weight = weights[key];
    numerator += value * weight;
    denominator += weight;
  });
  return denominator > 0 ? numerator / denominator : 0;
};

const reasonList = ({
  mode,
  components,
  targetCalories,
  price,
  budget,
  lastEatenDays,
  hasVendorLink,
  categoryName
}: {
  mode: RecommendationMode;
  components: RecommendationScoreComponents;
  targetCalories: number;
  price: number | null;
  budget: number | null;
  lastEatenDays?: number;
  hasVendorLink: boolean;
  categoryName: string;
}) => {
  const reasons: string[] = [];
  const push = (value: string) => {
    if (!reasons.includes(value)) reasons.push(value);
  };

  if (mode === 'budget' && components.budget !== undefined && price !== null) {
    push(
      budget !== null && price <= budget
        ? 'Trong ngân sách/bữa'
        : 'Giá tốt trong các lựa chọn'
    );
  }
  if (mode === 'variety' && components.variety >= 0.75) {
    push(
      lastEatenDays === undefined
        ? 'Tạo thêm sự đa dạng'
        : `${lastEatenDays} ngày chưa ăn`
    );
  }
  if (mode === 'quick' && hasVendorLink) {
    push('Có link quán thuận tiện');
  }
  if (components.kcal >= 0.78) {
    push(`Gần mục tiêu ≈ ${targetCalories.toLocaleString('vi-VN')} kcal`);
  }
  if (components.preference >= 0.55) {
    push('Hợp sở thích/lịch sử ăn');
  }
  if (components.variety >= 0.8) {
    push(
      lastEatenDays === undefined
        ? `Đổi vị với ${categoryName || 'món khác'}`
        : `${lastEatenDays} ngày chưa ăn`
    );
  }
  if (
    components.budget !== undefined &&
    price !== null &&
    budget !== null &&
    price <= budget
  ) {
    push('Phù hợp ngân sách');
  }
  if (components.convenience !== undefined && hasVendorLink) {
    push('Có thông tin mua món');
  }

  if (!reasons.length) push('Phù hợp bữa ăn hiện tại');
  return reasons.slice(0, 2);
};

const nameSimilarity = (a: string, b: string) => {
  const stop = new Set(['com', 'mon', 'bun', 'mi', 'pho', 'ga', 'bo', 'ca']);
  const tokens = (value: string) =>
    new Set(
      normalizeText(value)
        .split(' ')
        .filter(token => token.length > 1 && !stop.has(token))
    );
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach(token => {
    if (right.has(token)) intersection += 1;
  });
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
};

const recommendationSimilarity = (
  left: MealRecommendation,
  right: MealRecommendation
) => {
  const category = left.dish.categoryId === right.dish.categoryId ? 0.7 : 0;
  return clamp01(
    category + nameSimilarity(left.dish.name, right.dish.name) * 0.3
  );
};

export const buildMealRecommendations = ({
  mealKey,
  dishes,
  categories,
  logs,
  todayDateKey,
  dailyCalorieTarget,
  consumedCalories = 0,
  remainingMealKeys,
  budgetVnd,
  mode = 'balanced',
  behaviorSelectionCounts,
  limit = 3
}: {
  mealKey: MealKey;
  dishes: Dish[];
  categories: Category[];
  logs: LogEntry[];
  todayDateKey: string;
  dailyCalorieTarget?: number | null;
  consumedCalories?: number;
  remainingMealKeys?: MealKey[];
  budgetVnd?: number | string | null;
  mode?: RecommendationMode;
  behaviorSelectionCounts?: Record<string, number>;
  limit?: number;
}): MealRecommendation[] => {
  const categoryLookup = new Map(
    categories.map(category => [category.id, category.name])
  );
  const targetCalories = calculateAdaptiveMealTarget({
    mealKey,
    dailyCalorieTarget,
    consumedCalories,
    remainingMealKeys
  });
  const history = buildHistorySignals({ logs, dishes, todayDateKey });
  const budget = finitePositive(budgetVnd);

  const mainDishes = dishes.filter(dish =>
    isLikelyMainDish(dish, categoryLookup.get(dish.categoryId) ?? '')
  );
  const eligible = mainDishes.length >= Math.min(3, dishes.length)
    ? mainDishes
    : dishes;

  const notJustEaten = eligible.filter(dish => {
    const age = history.lastEatenDays.get(normalizeText(dish.name));
    return age === undefined || age > 1;
  });
  const pool = notJustEaten.length >= Math.min(Math.max(limit, 3), eligible.length)
    ? notJustEaten
    : eligible;

  const knownPrices = pool
    .map(getDishMinPrice)
    .filter((price): price is number => price !== null);
  const minKnownPrice = knownPrices.length ? Math.min(...knownPrices) : null;
  const maxKnownPrice = knownPrices.length ? Math.max(...knownPrices) : null;

  const scored = pool.map(dish => {
    const categoryName = categoryLookup.get(dish.categoryId) ?? 'Món ăn';
    const calories = getDishCalories(dish, categoryName);
    const price = getDishMinPrice(dish);
    const kcal = clamp01(
      1 - Math.abs(calories - targetCalories) / Math.max(targetCalories, 1)
    );
    const preference = preferenceScore({
      dish,
      history,
      behaviorSelectionCounts
    });
    const variety = varietyScore(dish, history);
    const convenience = convenienceScore(dish);
    const budgetScore = normalizedBudgetScore({
      price,
      budget,
      minKnownPrice,
      maxKnownPrice,
      mode
    });
    const components: RecommendationScoreComponents = {
      kcal,
      preference,
      budget: budgetScore,
      convenience,
      variety
    };
    const base = weightedScore({ mode, components });
    const affinity = breakfastAffinity(mealKey, dish);
    const noise = (seededNoise(`${todayDateKey}|${mealKey}|${mode}|${dish.id}`) - 0.5) * 0.02;
    const score = clamp01(base + affinity + noise);
    const lastEatenDays = history.lastEatenDays.get(normalizeText(dish.name));
    const hasVendorLink = dish.vendors.some(vendor => Boolean(vendor.link?.trim()));

    return {
      dish,
      score,
      calories,
      price,
      categoryName,
      targetCalories,
      components,
      reasons: reasonList({
        mode,
        components,
        targetCalories,
        price,
        budget,
        lastEatenDays,
        hasVendorLink,
        categoryName
      })
    } satisfies MealRecommendation;
  });

  scored.sort((left, right) => right.score - left.score);
  const selected: MealRecommendation[] = [];
  const remaining = [...scored];

  while (remaining.length && selected.length < Math.max(1, limit)) {
    let bestIndex = 0;
    let bestAdjusted = Number.NEGATIVE_INFINITY;
    remaining.forEach((candidate, index) => {
      const maxSimilarity = selected.length
        ? Math.max(
            ...selected.map(item => recommendationSimilarity(candidate, item))
          )
        : 0;
      const adjusted = candidate.score - maxSimilarity * 0.28;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    });
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  return selected;
};
