import { lookupNutrition, normalizeFoodName } from './nutritionKnowledge';
import type {
  CalorieSource,
  MealNutritionSnapshot,
  NutritionConfidenceLevel,
  NutritionSelection
} from '../domain/nutrition/nutritionTypes';
import {
  dishNutritionFieldsToMealSnapshot,
  nutritionSelectionToDishFields
} from '../domain/nutrition/nutritionPersistence';
import { normalizeKcalInternal } from '../domain/nutrition/caloriePrecision';
import {
  normalizeUserNutritionInput,
  type MacroEnergyConsistency,
  type NutritionDataOrigin,
  type NutritionDataStatus,
  type NutritionRecipeSnapshot,
  type NutritionSourceKind,
  type UserNutritionInput
} from '../domain/nutrition/userNutrition';
import { migrateDefaultDishRecords } from '../domain/menu/defaultDishMigration';
import { normalizePriceVnd } from '../domain/menu/vendorOffer';
import {
  normalizeMealAddons,
  type MealAddonKind,
  type MealAddonSnapshot
} from '../domain/meal/addonNormalizer';
import { normalizeExternalImageUrl } from './url';
import {
  dateKeyFromUtcDay,
  getVietnamDateKey,
  getVietnamTimestampForDateKey,
  parseDateKeyToUtcDay
} from './dateTime';
export { getVietnamDateKey } from './dateTime';
import { deleteUserImageByPath } from '../services/imageStorage';
import {
  loadOrMigrateUserState,
  persistUserStateDomains,
  subscribeUserStateDomains,
  USER_STATE_DOMAINS,
  type UserStateDomain
} from '../services/userDataStore';

export type VendorExtraInfo = {
  id: string;
  label: string;
  value: string;
};

export type Vendor = {
  id: string;
  name: string;
  phone: string;
  address: string;
  price: number;
  link?: string;
  extraInfo: VendorExtraInfo[];
};

export type NewVendorInput = {
  name: string;
  phone?: string;
  address?: string;
  price: number;
  link?: string;
};

export type DishImageReference = {
  url: string;
  source: 'wikimedia-commons' | 'manual' | 'firebase-storage';
  sourcePageUrl?: string;
  license?: string;
  attribution?: string;
  storagePath?: string;
  contentType?: string;
  size?: number;
  updatedAt?: number;
};

export type AddDishOptions = {
  image?: DishImageReference;
  vendors?: NewVendorInput[];
  dishId?: string;
  nutritionSelection?: NutritionSelection;
  userNutrition?: UserNutritionInput;
};

export type Dish = {
  id: string;
  name: string;
  categoryId: string;
  isFavorite: boolean;
  imageUrl?: string;
  imageSource?: DishImageReference['source'];
  imageSourceUrl?: string;
  imageLicense?: string;
  imageAttribution?: string;
  imagePath?: string;
  imageContentType?: string;
  imageSize?: number;
  imageUpdatedAt?: number;
  calories?: number;
  calorieSource?: CalorieSource | 'knowledge';
  calorieBasis?: 'portion' | 'grams' | 'category' | 'serving' | '100g';
  portionSize?: 'S' | 'M' | 'L';
  portionGrams?: number;
  servingAmount?: number;
  servingUnit?: 'g' | 'ml' | 'portion';
  kcalMin?: number;
  kcalMax?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  macroSource?: 'nutrition-db' | 'manual' | 'recipe';
  nutritionRecordId?: string;
  nutritionCanonicalName?: string;
  nutritionConfidence?:
    | NutritionConfidenceLevel
    | 'verified'
    | 'estimated'
    | 'unknown';
  nutritionVerificationState?: string;
  nutritionCalorieStatus?: string;
  nutritionValidationResult?: string;
  nutritionTrainingEligibility?: string;
  nutritionReferenceOnly?: boolean;
  nutritionSource?: string;
  nutritionSourceId?: string;
  nutritionSourceUrl?: string;
  nutritionMatchType?: string;
  nutritionMatchScore?: number;
  nutritionDataOrigin?: NutritionDataOrigin;
  nutritionDataStatus?: NutritionDataStatus;
  nutritionSourceKind?: NutritionSourceKind;
  nutritionSourceNote?: string;
  userOverrideOfNutritionRecordId?: string;
  macroEnergyKcal?: number;
  macroEnergyDeltaPct?: number;
  macroEnergyConsistency?: MacroEnergyConsistency;
  nutritionRecipe?: NutritionRecipeSnapshot;
  legacyNames?: string[];
  vendors: Vendor[];
};

export type Category = {
  id: string;
  name: string;
};

export type MealKey = 'A' | 'B' | 'C';
export type MealAddon = MealAddonSnapshot;
export type { MealAddonKind };

export type LogEntry = {
  id: string;
  dishName: string;
  vendorName: string;
  price: number;
  calories?: number;
  addons?: MealAddon[];
  mealKey?: MealKey;
  calorieSource?: CalorieSource | 'knowledge';
  calorieBasis?: 'portion' | 'grams' | 'category' | 'serving' | '100g';
  portionSize?: 'S' | 'M' | 'L';
  portionGrams?: number;
  servingAmount?: number;
  servingUnit?: 'g' | 'ml' | 'portion';
  kcalMin?: number;
  kcalMax?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  macroSource?: 'nutrition-db' | 'manual' | 'recipe';
  nutritionRecordId?: string;
  nutritionCanonicalName?: string;
  nutritionConfidence?:
    | NutritionConfidenceLevel
    | 'verified'
    | 'estimated'
    | 'unknown';
  nutritionVerificationState?: string;
  nutritionCalorieStatus?: string;
  nutritionValidationResult?: string;
  nutritionTrainingEligibility?: string;
  nutritionReferenceOnly?: boolean;
  nutritionSource?: string;
  nutritionSourceId?: string;
  nutritionSourceUrl?: string;
  nutritionMatchType?: string;
  nutritionMatchScore?: number;
  nutritionDataOrigin?: NutritionDataOrigin;
  nutritionDataStatus?: NutritionDataStatus;
  nutritionSourceKind?: NutritionSourceKind;
  nutritionSourceNote?: string;
  userOverrideOfNutritionRecordId?: string;
  macroEnergyKcal?: number;
  macroEnergyDeltaPct?: number;
  macroEnergyConsistency?: MacroEnergyConsistency;
  nutritionRecipe?: NutritionRecipeSnapshot;
  timestamp: number;
};

const MAX_HISTORY_EDIT_DAYS = 3;

export const getEditableMealDateRange = (now = Date.now()) => {
  const todayKey = getVietnamDateKey(now);
  const todayDay = parseDateKeyToUtcDay(todayKey);
  if (todayDay === null) {
    throw new Error('Không thể xác định ngày Việt Nam hiện tại.');
  }

  return {
    min: dateKeyFromUtcDay(todayDay - MAX_HISTORY_EDIT_DAYS),
    max: todayKey
  };
};

export const isMealDateEditable = (dateKey: string, now = Date.now()) => {
  const candidate = parseDateKeyToUtcDay(dateKey);
  const today = parseDateKeyToUtcDay(getVietnamDateKey(now));
  if (candidate === null || today === null) return false;

  const age = today - candidate;
  return age >= 0 && age <= MAX_HISTORY_EDIT_DAYS;
};

function timestampForMealDate(dateKey: string, mealKey: MealKey) {
  const hour: Record<MealKey, string> = {
    A: '08:00:00',
    B: '12:00:00',
    C: '18:00:00'
  };
  const timestamp = getVietnamTimestampForDateKey(
    dateKey,
    hour[mealKey]
  );
  if (timestamp === null) {
    throw new Error('Ngày lịch sử không hợp lệ.');
  }
  return timestamp;
}

export const initialCategories: Category[] = [
  { id: 'c1', name: 'Món mặn' },
  { id: 'c2', name: 'Món canh' },
  { id: 'c3', name: 'Món nước' },
  { id: 'c4', name: 'Ăn vặt & Đồ uống' },
  { id: 'c5', name: 'Món chay' },
  { id: 'c6', name: 'Tráng miệng' },
  { id: 'c7', name: 'Combo / Phần ăn' },
];

const categoryCalorieDefaults: Record<string, number> = {
  c1: 650,
  c2: 250,
  c3: 550,
  c4: 350,
  c5: 500,
  c6: 250,
  c7: 700
};

export const getDefaultCaloriesForCategory = (categoryId: string) =>
  categoryCalorieDefaults[categoryId] ?? 500;

export const estimateDishCalories = (
  dish: Pick<Dish, 'calories' | 'categoryId'>
) => {
  const calories = normalizeKcalInternal(dish.calories);
  if (calories !== null && calories > 0) {
    return calories;
  }

  return getDefaultCaloriesForCategory(dish.categoryId);
};

export const getDishNutritionSnapshot = (dish: Dish): MealNutritionSnapshot =>
  dishNutritionFieldsToMealSnapshot(
    {
      ...dish,
      calorieSource:
        dish.calorieSource === 'knowledge'
          ? 'nutrition-db'
          : dish.calorieSource
    },
    estimateDishCalories(dish)
  );

const initialDishes: Dish[] = [
  {
    id: 'd1', name: 'Cơm gà xối mỡ', categoryId: 'c1', isFavorite: true, calories: 780, imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
    vendors: [
      { id: 'v1', name: 'Cơm gà Cô Ba', phone: '0901.234.567', address: '123 Đường D1', price: 35000, link: 'https://maps.google.com', extraInfo: [{id: 'e1', label: 'Giờ mở cửa', value: '10:00 - 20:00'}] },
      { id: 'v2', name: 'Quán Hồng Phát', phone: '0987.654.321', address: '456 Điện Biên Phủ', price: 40000, extraInfo: [] }
    ]
  },
  {
    id: 'd2', name: 'Phở bò / Phở gà', categoryId: 'c3', isFavorite: false, calories: 520, imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cb438?auto=format&fit=crop&w=800&q=80',
    vendors: [{ id: 'v3', name: 'Phở Quỳnh', phone: '0911.222.333', address: 'Ngã tư Hàng Xanh', price: 45000, extraInfo: [] }]
  },
  {
    id: 'd3', name: 'Wrap gà + Trái cây', categoryId: 'c4', isFavorite: true, calories: 430, imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=80',
    vendors: [{ id: 'v4', name: 'Healthy Box', phone: '0909.888.777', address: 'Khu A', price: 40000, extraInfo: [] }]
  },
  {
    id: 'd4', name: 'Cơm sườn + Salad', categoryId: 'c1', isFavorite: false, calories: 720, imageUrl: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=800&q=80',
    vendors: [{ id: 'v5', name: 'Cơm tấm Ba Ghiền', phone: '0922.333.444', address: '84 Đặng Văn Ngữ', price: 45000, extraInfo: [] }]
  },
  {
    id: 'd5', name: 'Bún riêu / Chả', categoryId: 'c3', isFavorite: false, calories: 480,
    vendors: [{ id: 'v6', name: 'Bún riêu Cô Mai', phone: '0912.345.678', address: 'Chợ Thị Nghè', price: 30000, extraInfo: [] }]
  },
  {
    id: 'd6', name: 'Cơm chay', categoryId: 'c5', isFavorite: false, calories: 520,
    vendors: [{ id: 'v7', name: 'Chay Tùy Duyên', phone: '0988.777.666', address: 'Khu B', price: 25000, extraInfo: [] }]
  },
  { id: 'd7', name: 'Cơm thịt kho', categoryId: 'c1', isFavorite: false, calories: 650, vendors: [{ id: 'v8', name: 'Cơm phần Sinh Viên', phone: '0900.111.222', address: 'Hẻm 79', price: 30000, extraInfo: [] }] },
  { id: 'd8', name: 'Mì xào hải sản', categoryId: 'c3', isFavorite: false, calories: 620, vendors: [{ id: 'v9', name: 'Quán Ốc Đêm', phone: '0933.222.111', address: 'Đường D2', price: 35000, extraInfo: [] }] },
  { id: 'd9', name: 'Salad gạo lứt', categoryId: 'c4', isFavorite: false, calories: 420, vendors: [{ id: 'v10', name: 'Eat Clean', phone: '0944.555.666', address: 'Khu C', price: 40000, extraInfo: [] }] },
  { id: 'd10', name: 'Cơm cá kho', categoryId: 'c1', isFavorite: false, calories: 680, vendors: [{ id: 'v11', name: 'Cơm Quê', phone: '0955.666.777', address: 'Đường D3', price: 35000, extraInfo: [] }] },
  { id: 'd11', name: 'Bún mắm / cá', categoryId: 'c3', isFavorite: false, calories: 550, vendors: [{ id: 'v12', name: 'Đặc sản Miền Tây', phone: '0966.777.888', address: 'Khu D', price: 40000, extraInfo: [] }] },
  { id: 'd12', name: 'Sandwich + Sữa chua', categoryId: 'c4', isFavorite: false, calories: 380, vendors: [{ id: 'v13', name: 'Tiệm Bánh', phone: '0977.888.999', address: 'Khu E', price: 30000, extraInfo: [] }] },
  { id: 'd13', name: 'Cơm bò xào', categoryId: 'c1', isFavorite: false, calories: 700, vendors: [{ id: 'v14', name: 'Quán Bò', phone: '0988.999.000', address: 'Khu F', price: 45000, extraInfo: [] }] },
  { id: 'd14', name: 'Mì Quảng / Hủ tiếu', categoryId: 'c3', isFavorite: false, calories: 560, vendors: [{ id: 'v15', name: 'Mì Quảng Bà Mua', phone: '0999.000.111', address: 'Khu G', price: 35000, extraInfo: [] }] },
  { id: 'd15', name: 'Cơm ngũ cốc', categoryId: 'c4', isFavorite: false, calories: 480, vendors: [{ id: 'v16', name: 'Healthy Box', phone: '0909.888.777', address: 'Khu A', price: 45000, extraInfo: [] }] },
  { id: 'd16', name: 'Cơm tấm', categoryId: 'c1', isFavorite: false, calories: 650, vendors: [{ id: 'v17', name: 'Cơm tấm Đêm', phone: '0912.345.678', address: 'Vòng xoay', price: 35000, extraInfo: [] }] },
  { id: 'd17', name: 'Bún / Miến xào', categoryId: 'c3', isFavorite: false, calories: 600, vendors: [{ id: 'v18', name: 'Quán Xào', phone: '0922.111.333', address: 'Khu H', price: 30000, extraInfo: [] }] },
  { id: 'd18', name: 'Snack box', categoryId: 'c4', isFavorite: false, calories: 320, vendors: [{ id: 'v19', name: 'Canteen', phone: '0933.444.555', address: 'Trường', price: 25000, extraInfo: [] }] },
  { id: 'd19', name: 'Cơm thịt nướng', categoryId: 'c1', isFavorite: false, calories: 720, vendors: [{ id: 'v20', name: 'Xiên Nướng', phone: '0944.555.666', address: 'Khu I', price: 35000, extraInfo: [] }] },
  { id: 'd20', name: 'Lẩu mini / Mì ống', categoryId: 'c3', isFavorite: false, calories: 680, vendors: [{ id: 'v21', name: 'Lẩu 1 Người', phone: '0955.666.777', address: 'Khu J', price: 50000, extraInfo: [] }] },
  { id: 'd21', name: 'Bánh mì + Sữa', categoryId: 'c4', isFavorite: false, calories: 450, vendors: [{ id: 'v22', name: 'Bánh Mì Tuấn', phone: '0966.777.888', address: 'Khu K', price: 20000, extraInfo: [] }] },
];

export type MenuItem = {
  dishId: string;
  stock: number;
  skipped?: boolean;
};

export type DayMenu = {
  dayName: string;
  selectedCombo?: 'A' | 'B' | 'C';
  options: {
    A: MenuItem;
    B: MenuItem;
    C: MenuItem;
  };
};

export type Timetable = Record<string, DayMenu>;

const defaultTimetable: Timetable = {
  mon: { dayName: "Thứ 2", options: { A: { dishId: 'd1', stock: 50 }, B: { dishId: 'd2', stock: 30 }, C: { dishId: 'd3', stock: 20 } } },
  tue: { dayName: "Thứ 3", options: { A: { dishId: 'd4', stock: 50 }, B: { dishId: 'd5', stock: 30 }, C: { dishId: 'd6', stock: 20 } } },
  wed: { dayName: "Thứ 4", options: { A: { dishId: 'd7', stock: 50 }, B: { dishId: 'd8', stock: 30 }, C: { dishId: 'd9', stock: 20 } } },
  thu: { dayName: "Thứ 5", options: { A: { dishId: 'd10', stock: 50 }, B: { dishId: 'd11', stock: 30 }, C: { dishId: 'd12', stock: 20 } } },
  fri: { dayName: "Thứ 6", options: { A: { dishId: 'd13', stock: 50 }, B: { dishId: 'd14', stock: 30 }, C: { dishId: 'd15', stock: 20 } } },
  sat: { dayName: "Thứ 7", options: { A: { dishId: 'd16', stock: 50 }, B: { dishId: 'd17', stock: 30 }, C: { dishId: 'd18', stock: 20 } } },
  sun: { dayName: "Chủ Nhật", options: { A: { dishId: 'd19', stock: 50 }, B: { dishId: 'd20', stock: 30 }, C: { dishId: 'd21', stock: 20 } } }
};

const deepClone = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const normalizeCategoryName = (category: Category) => {
  // c3 is a built-in category. Keep its label compact across cache,
  // migrated Firestore data and realtime updates.
  if (category.id === 'c3') return 'Món nước';

  return category.name
    .replace(/\s*\(\s*Mì\s*\/\s*Phở\s*\/\s*Bún\s*\)\s*/giu, '')
    .trim();
};

const normalizeCachedCategories = (categories: Category[]) =>
  categories.map(category => ({
    ...category,
    name: normalizeCategoryName(category)
  }));

const createDefaultUserState = () => ({
  timetable: deepClone(defaultTimetable),
  dishes: migrateDefaultDishRecords(
    deepClone(initialDishes),
    'new-user'
  ) as Dish[],
  categories: deepClone(initialCategories),
  logs: [] as LogEntry[]
});

let activeCacheUid: string | null = null;

const cacheKey = (
  key: 'timetable' | 'dishes' | 'categories' | 'logs',
  uid: string | null = activeCacheUid
) => uid
  ? `nocnom_user_${uid}_${key}`
  : `nocnom_${key}`;

const readCachedState = (uid: string | null) => {
  try {
    const timetableRaw =
      localStorage.getItem(cacheKey('timetable', uid)) ??
      (!uid ? localStorage.getItem('unifood_timetable') : null);
    const dishesRaw =
      localStorage.getItem(cacheKey('dishes', uid)) ??
      (!uid ? localStorage.getItem('unifood_dishes') : null);
    const categoriesRaw =
      localStorage.getItem(cacheKey('categories', uid)) ??
      (!uid ? localStorage.getItem('unifood_categories') : null);
    const logsRaw =
      localStorage.getItem(cacheKey('logs', uid)) ??
      (!uid ? localStorage.getItem('unifood_logs') : null);

    if (
      !timetableRaw &&
      !dishesRaw &&
      !categoriesRaw &&
      !logsRaw
    ) {
      return null;
    }

    const fallback = createDefaultUserState();

    return {
      timetable: timetableRaw
        ? JSON.parse(timetableRaw) as Timetable
        : fallback.timetable,
      dishes: dishesRaw
        ? migrateDefaultDishRecords(
            JSON.parse(dishesRaw) as Dish[],
            'persisted'
          ) as Dish[]
        : fallback.dishes,
      categories: categoriesRaw
        ? normalizeCachedCategories(
            JSON.parse(categoriesRaw) as Category[]
          )
        : fallback.categories,
      logs: logsRaw
        ? JSON.parse(logsRaw) as LogEntry[]
        : fallback.logs
    };
  } catch (error) {
    console.error('[local-cache] Unable to read app state', {
      uid,
      message:
        error instanceof Error
          ? error.message
          : String(error)
    });
    return null;
  }
};

const initialCachedState =
  readCachedState(null) ?? createDefaultUserState();

let dbData = initialCachedState.timetable;
let dishesData: Dish[] = initialCachedState.dishes;
let categoriesData: Category[] = initialCachedState.categories;
let logsData: LogEntry[] = initialCachedState.logs;

const createLocalId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return prefix + crypto.randomUUID();
  }
  return prefix + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
};

const writeLocalCache = () => {
  try {
    localStorage.setItem(
      cacheKey('timetable'),
      JSON.stringify(dbData)
    );
    localStorage.setItem(
      cacheKey('dishes'),
      JSON.stringify(dishesData)
    );
    localStorage.setItem(
      cacheKey('categories'),
      JSON.stringify(categoriesData)
    );
    localStorage.setItem(
      cacheKey('logs'),
      JSON.stringify(logsData)
    );
  } catch (error) {
    console.error('[local-cache] Unable to persist app state', {
      uid: activeCacheUid,
      message:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
};

const currentUserState = () => ({
  timetable: dbData,
  dishes: dishesData,
  categories: categoriesData,
  logs: logsData
});

const saveToLocalStorage = (...domains: UserStateDomain[]) => {
  writeLocalCache();
  scheduleCloudSync(
    domains.length > 0 ? domains : USER_STATE_DOMAINS
  );
};

let currentSyncUid: string | null = null;
let firestoreUnsubscribe: (() => void) | null = null;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let isRemoteUpdating = false;
let syncGeneration = 0;
const dirtyDomains = new Set<UserStateDomain>();

const notifyAllListeners = () => {
  Object.values(listeners).flatMap(set => Array.from(set)).forEach(l => l(dbData));
  dishListeners.forEach(l => l(dishesData));
  categoryListeners.forEach(l => l(categoriesData));
  logListeners.forEach(l => l(logsData));
};

const logFirestoreError = (
  operation: string,
  error: unknown,
  uid: string | null,
  domains?: Iterable<UserStateDomain>
) => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || 'unknown')
      : 'unknown';

  console.error('[firestore]', {
    operation,
    code,
    message: error instanceof Error ? error.message : String(error),
    path: uid ? `users/${uid}/state/*` : null,
    domains: domains ? [...domains] : undefined,
    uid
  });
};

export const persistUserStateNow = async (
  domains?: Iterable<UserStateDomain>
) => {
  if (!currentSyncUid) {
    throw new Error('Chưa có phiên người dùng để đồng bộ Firestore.');
  }

  const uid = currentSyncUid;
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }

  const selectedDomains = domains
    ? [...new Set(domains)]
    : dirtyDomains.size > 0
      ? [...dirtyDomains]
      : [...USER_STATE_DOMAINS];

  try {
    await persistUserStateDomains({
      uid,
      state: currentUserState(),
      domains: selectedDomains
    });
    selectedDomains.forEach(domain => dirtyDomains.delete(domain));
  } catch (error) {
    selectedDomains.forEach(domain => dirtyDomains.add(domain));
    logFirestoreError(
      'persist-user-state-v2',
      error,
      uid,
      selectedDomains
    );
    throw error;
  }
};

const scheduleCloudSync = (
  domains: Iterable<UserStateDomain> = USER_STATE_DOMAINS
) => {
  if (!currentSyncUid || isRemoteUpdating) return;

  for (const domain of domains) {
    dirtyDomains.add(domain);
  }

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(async () => {
    if (!currentSyncUid || isRemoteUpdating) return;
    try {
      await persistUserStateNow();
    } catch {
      // persistUserStateNow already logged technical details.
    }
  }, 800);
};

export const syncUserWithFirestore = (uid: string | null) => {
  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }

  dirtyDomains.clear();
  currentSyncUid = uid;
  activeCacheUid = uid;
  const generation = ++syncGeneration;

  if (!uid) {
    const anonymousState =
      readCachedState(null) ?? createDefaultUserState();

    isRemoteUpdating = true;
    try {
      dbData = anonymousState.timetable;
      dishesData = anonymousState.dishes;
      categoriesData = anonymousState.categories;
      logsData = anonymousState.logs;
      notifyAllListeners();
    } finally {
      isRemoteUpdating = false;
    }
    return;
  }

  const fallback =
    readCachedState(uid) ?? createDefaultUserState();

  // Never expose the previous account's state while this user is loading.
  isRemoteUpdating = true;
  try {
    dbData = fallback.timetable;
    dishesData = fallback.dishes;
    categoriesData = fallback.categories;
    logsData = fallback.logs;
    notifyAllListeners();
  } finally {
    isRemoteUpdating = false;
  }

  void (async () => {
    try {
      const loaded = await loadOrMigrateUserState({
        uid,
        fallback
      });

      if (
        generation !== syncGeneration ||
        currentSyncUid !== uid
      ) {
        return;
      }

      const normalizedLoadedCategories = normalizeCachedCategories(
        loaded.state.categories
      );
      const normalizedLoadedDishes = migrateDefaultDishRecords(
        loaded.state.dishes,
        'persisted'
      ) as Dish[];
      const shouldPersistNormalizedCategories =
        JSON.stringify(normalizedLoadedCategories) !==
        JSON.stringify(loaded.state.categories);
      const shouldPersistNormalizedDishes =
        JSON.stringify(normalizedLoadedDishes) !==
        JSON.stringify(loaded.state.dishes);

      isRemoteUpdating = true;
      try {
        dbData = loaded.state.timetable;
        dishesData = normalizedLoadedDishes;
        categoriesData = normalizedLoadedCategories;
        logsData = loaded.state.logs;
        writeLocalCache();
        notifyAllListeners();
      } finally {
        isRemoteUpdating = false;
      }

      if (shouldPersistNormalizedCategories) {
        scheduleCloudSync(['categories']);
      }
      if (shouldPersistNormalizedDishes) {
        scheduleCloudSync(['dishes']);
      }

      firestoreUnsubscribe = subscribeUserStateDomains({
        uid,
        onDomain: (domain, value) => {
          if (
            generation !== syncGeneration ||
            currentSyncUid !== uid
          ) {
            return;
          }

          let shouldPersistNormalizedCategories = false;
          let shouldPersistNormalizedDishes = false;

          isRemoteUpdating = true;
          try {
            if (domain === 'timetable') {
              dbData = value as Timetable;
            } else if (domain === 'dishes') {
              const incomingDishes = value as Dish[];
              const normalizedDishes = migrateDefaultDishRecords(
                incomingDishes,
                'persisted'
              ) as Dish[];
              dishesData = normalizedDishes;
              shouldPersistNormalizedDishes =
                JSON.stringify(normalizedDishes) !==
                JSON.stringify(incomingDishes);
            } else if (domain === 'categories') {
              const incomingCategories = value as Category[];
              const normalizedCategories =
                normalizeCachedCategories(incomingCategories);

              categoriesData = normalizedCategories;
              shouldPersistNormalizedCategories =
                JSON.stringify(normalizedCategories) !==
                JSON.stringify(incomingCategories);
            } else if (domain === 'logs') {
              logsData = value as LogEntry[];
            }

            writeLocalCache();
            notifyAllListeners();
          } finally {
            isRemoteUpdating = false;
          }

          if (shouldPersistNormalizedCategories) {
            scheduleCloudSync(['categories']);
          }
          if (shouldPersistNormalizedDishes) {
            scheduleCloudSync(['dishes']);
          }
        },
        onError: (domain, error) => {
          logFirestoreError(
            'subscribe-user-state-v2',
            error,
            uid,
            [domain]
          );
        }
      });

      console.info('[firestore] User state ready', {
        uid,
        schemaVersion: 2,
        source: loaded.source
      });
    } catch (error) {
      logFirestoreError(
        'load-or-migrate-user-state-v2',
        error,
        uid
      );
    }
  })();
};

type Listener = (data: any) => void;
const listeners: Record<string, Set<Listener>> = {};
const dishListeners: Set<Listener> = new Set();
const categoryListeners: Set<Listener> = new Set();
const logListeners: Set<Listener> = new Set();
const nutritionHydrationPending = new Set<string>();

const hydrateDishCaloriesFromKnowledge = async (dishId: string, foodName: string) => {
  if (nutritionHydrationPending.has(dishId)) return;
  nutritionHydrationPending.add(dishId);

  try {
    const result = await lookupNutrition(foodName);
    if (!result) return;

    const current = dishesData.find(dish => dish.id === dishId);
    if (!current) return;

    const hasExplicitCalories =
      typeof current.calories === 'number' &&
      Number.isFinite(current.calories) &&
      current.calories > 0 &&
      current.calorieSource !== 'knowledge';

    if (hasExplicitCalories || current.calorieSource === 'manual') return;

    dishesData = dishesData.map(dish =>
      dish.id === dishId
        ? {
            ...dish,
            ...(result.selection
              ? nutritionSelectionToDishFields(result.selection)
              : {
                  calories: result.calories,
                  calorieSource: 'nutrition-db' as const,
                  calorieBasis: 'serving' as const,
                  nutritionRecordId: result.record.id,
                  nutritionConfidence: result.record.confidence,
                  nutritionVerificationState: result.record.verificationState,
                  nutritionSource: result.record.source,
                  nutritionSourceUrl: result.record.sourceUrl
                })
          }
        : dish
    );

    saveToLocalStorage('dishes');
    dishListeners.forEach(listener => listener(dishesData));
  } finally {
    nutritionHydrationPending.delete(dishId);
  }
};

export const sumMealAddonCalories = (
  log: Pick<LogEntry, 'addons'>
): number => {
  const total = (log.addons ?? []).reduce((sum, addon) => {
    const calories = normalizeKcalInternal(addon.calories);
    return sum + (calories ?? 0);
  }, 0);

  return normalizeKcalInternal(total) ?? 0;
};

const hydrateMissingDishCalories = async () => {
  const candidates = dishesData.filter(dish =>
    dish.calorieSource === 'knowledge' ||
    dish.calorieSource === 'category-fallback' ||
    typeof dish.calories !== 'number' ||
    !Number.isFinite(dish.calories) ||
    dish.calories <= 0
  );

  await Promise.all(
    candidates.map(dish => hydrateDishCaloriesFromKnowledge(dish.id, dish.name))
  );
};

const canonicalNutritionCategoryName = (value: string) => {
  const raw = value.trim();
  const normalized = normalizeFoodName(raw);

  if (!normalized) return '';
  if (normalized === 'com' || normalized.includes('mon com')) return 'Cơm';
  if (normalized.includes('do uong') || normalized.includes('thuc uong')) return 'Thức uống';
  if (normalized.includes('trai cay')) return 'Trái cây';
  if (normalized.includes('banh mi')) return 'Bánh mì & bánh mặn';
  if (normalized.includes('bun') || normalized.includes('mien')) return 'Bún & miến';
  if (normalized.includes('pho') || normalized.includes('mi nuoc')) return 'Phở & mì nước';
  if (normalized.includes('an sang')) return 'Ăn sáng';
  if (normalized.includes('hai san')) return 'Hải sản';
  if (normalized.includes('xao') || normalized.includes('rau')) return 'Món xào & rau';
  if (normalized.includes('canh') || normalized.includes('lau') || normalized.includes('sup')) return 'Canh, súp & lẩu';
  if (normalized.includes('chay')) return 'Món chay';
  if (normalized.includes('an vat') || normalized.includes('chien')) return 'Ăn vặt & món chiên';
  if (normalized.includes('thuc an nhanh') || normalized.includes('quoc te')) return 'Thức ăn nhanh & món quốc tế';
  if (normalized.includes('trang mieng') || normalized.includes('mon ngot') || normalized.includes('che')) return 'Tráng miệng & món ngọt';
  if (normalized.includes('nguyen lieu') || normalized.includes('mon don')) return 'Nguyên liệu & món đơn';
  if (normalized.includes('mon man')) return 'Món mặn';

  return raw;
};

const ensureNutritionCategory = (categoryName: string, fallbackCategoryId: string) => {
  const canonicalName = canonicalNutritionCategoryName(categoryName);
  if (!canonicalName) return fallbackCategoryId;

  const normalized = normalizeFoodName(canonicalName);
  const existing = categoriesData.find(category =>
    normalizeFoodName(category.name) === normalized
  );
  if (existing) return existing.id;

  const newCategory: Category = {
    id: createLocalId('c'),
    name: canonicalName
  };
  categoriesData = [...categoriesData, newCategory];
  categoryListeners.forEach(listener => listener(categoriesData));
  return newCategory.id;
};

const mergeVendorInputs = (
  current: Vendor[],
  inputs: NewVendorInput[] = []
): Vendor[] => {
  const vendors = [...current];

  inputs.forEach(input => {
    const name = String(input.name ?? '').trim();
    const address = String(input.address ?? '').trim();
    const phone = String(input.phone ?? '').trim();
    const link = String(input.link ?? '').trim();
    const price = normalizePriceVnd(input.price);

    if (!name || price === null) return;

    const key = normalizeFoodName(name) + '|' + normalizeFoodName(address);
    const existingIndex = vendors.findIndex(vendor =>
      normalizeFoodName(vendor.name) + '|' + normalizeFoodName(vendor.address) === key
    );

    if (existingIndex >= 0) {
      const existing = vendors[existingIndex];
      vendors[existingIndex] = {
        ...existing,
        name,
        price,
        phone: phone || existing.phone,
        address: address || existing.address,
        ...(link ? { link } : {})
      };
      return;
    }

    vendors.push({
      id: createLocalId('v'),
      name,
      price,
      phone,
      address,
      ...(link ? { link } : {}),
      extraInfo: []
    });
  });

  return vendors;
};

const applyDishImage = (
  dish: Dish,
  image?: DishImageReference
): Dish => {
  if (!image?.url?.trim()) return dish;

  const normalizedImageUrl = normalizeExternalImageUrl(image.url);
  if (!normalizedImageUrl) {
    throw new Error('URL hình ảnh không hợp lệ. Chỉ hỗ trợ URL http/https.');
  }

  const {
    imageSourceUrl: _imageSourceUrl,
    imageLicense: _imageLicense,
    imageAttribution: _imageAttribution,
    imagePath: _imagePath,
    imageContentType: _imageContentType,
    imageSize: _imageSize,
    imageUpdatedAt: _imageUpdatedAt,
    ...rest
  } = dish;

  return {
    ...rest,
    imageUrl: normalizedImageUrl,
    imageSource: image.source,
    ...(image.source === 'firebase-storage' && image.storagePath
      ? {
          imagePath: image.storagePath,
          imageContentType: image.contentType,
          imageSize: image.size,
          imageUpdatedAt: image.updatedAt ?? Date.now()
        }
      : {}),
    ...(image.sourcePageUrl?.trim()
      ? { imageSourceUrl: image.sourcePageUrl.trim() }
      : {}),
    ...(image.license?.trim()
      ? { imageLicense: image.license.trim() }
      : {}),
    ...(image.attribution?.trim()
      ? { imageAttribution: image.attribution.trim() }
      : {})
  };
};


const nutritionSourceLabel = (kind: NutritionSourceKind) => {
  switch (kind) {
    case 'nutrition-label':
      return 'Nhãn dinh dưỡng';
    case 'manufacturer':
      return 'Nhà sản xuất';
    case 'recipe':
      return 'Công thức người dùng';
    case 'other':
      return 'Nguồn người dùng cung cấp';
    case 'reference-db':
      return 'Nutrition Knowledge Base';
    default:
      return 'Người dùng tự nhập';
  }
};

const userNutritionToDishFields = (
  input: UserNutritionInput,
  reference?: Partial<Dish>
): Partial<Dish> => {
  const normalized = normalizeUserNutritionInput(input);
  const linkedReferenceId =
    reference?.userOverrideOfNutritionRecordId ||
    reference?.nutritionRecordId;

  return {
    calories: normalized.calories,
    calorieSource: 'manual',
    calorieBasis: 'serving',
    portionSize: undefined,
    portionGrams: undefined,
    servingAmount: normalized.servingAmount,
    servingUnit: normalized.servingUnit,
    kcalMin: undefined,
    kcalMax: undefined,
    proteinG: normalized.proteinG,
    carbsG: normalized.carbsG,
    fatG: normalized.fatG,
    macroSource:
      normalized.proteinG !== undefined &&
      normalized.carbsG !== undefined &&
      normalized.fatG !== undefined
        ? normalized.dataOrigin === 'user-recipe'
          ? 'recipe'
          : 'manual'
        : undefined,
    nutritionRecordId: reference?.nutritionRecordId,
    nutritionCanonicalName: reference?.nutritionCanonicalName,
    nutritionConfidence: 'unknown',
    nutritionVerificationState:
      normalized.dataOrigin === 'user-recipe'
        ? 'RECIPE_CALCULATED_NOT_INDEPENDENTLY_VERIFIED'
        : 'USER_PROVIDED_NOT_INDEPENDENTLY_VERIFIED',
    nutritionCalorieStatus:
      normalized.dataOrigin === 'user-recipe'
        ? 'CALCULATED'
        : 'USER_PROVIDED',
    nutritionValidationResult:
      normalized.macroEnergyConsistency === 'inconsistent'
        ? 'NEEDS_REVIEW'
        : normalized.macroEnergyConsistency === 'review'
          ? 'PASS_WITH_WARNING'
          : 'USER_PROVIDED',
    nutritionTrainingEligibility: undefined,
    nutritionReferenceOnly: false,
    nutritionSource: nutritionSourceLabel(normalized.sourceKind),
    nutritionSourceId: normalized.sourceKind,
    nutritionSourceUrl: normalized.sourceUrl,
    nutritionMatchType: reference?.nutritionMatchType,
    nutritionMatchScore: reference?.nutritionMatchScore,
    nutritionDataOrigin: normalized.dataOrigin,
    nutritionDataStatus: normalized.dataStatus,
    nutritionSourceKind: normalized.sourceKind,
    nutritionSourceNote: normalized.sourceNote,
    userOverrideOfNutritionRecordId: linkedReferenceId,
    macroEnergyKcal: normalized.macroEnergyKcal,
    macroEnergyDeltaPct: normalized.macroEnergyDeltaPct,
    macroEnergyConsistency: normalized.macroEnergyConsistency,
    nutritionRecipe: normalized.recipe
  };
};


const upsertMealLogData = ({
  dateKey,
  mealKey,
  dishName,
  vendorName,
  price,
  calories,
  addons,
  nutritionSnapshot
}: {
  dateKey: string;
  mealKey: MealKey;
  dishName: string;
  vendorName: string;
  price: number;
  calories?: number;
  addons?: MealAddon[];
  nutritionSnapshot?: MealNutritionSnapshot;
}) => {
  if (!isMealDateEditable(dateKey)) {
    throw new Error('Chỉ được thêm hoặc chỉnh sửa lịch sử của hôm nay và tối đa 3 ngày trước.');
  }

  const normalizedDishName = dishName.trim();
  const normalizedVendorName = vendorName.trim();

  if (!normalizedDishName) throw new Error('Cần chọn món ăn.');
  if (!normalizedVendorName) throw new Error('Cần chọn quán hoặc nguồn món.');
  const priceVnd = normalizePriceVnd(price);
  if (priceVnd === null) {
    throw new Error('Giá món phải là số nguyên VND hợp lệ.');
  }

  const existingIndex = logsData.findIndex(log =>
    log.mealKey === mealKey &&
    getVietnamDateKey(log.timestamp) === dateKey
  );

  const resolvedCalories = nutritionSnapshot
    ? normalizeKcalInternal(nutritionSnapshot.calories)
    : normalizeKcalInternal(calories);

  const newLog: LogEntry = {
    id: existingIndex >= 0 ? logsData[existingIndex].id : createLocalId('l'),
    dishName: normalizedDishName,
    vendorName: normalizedVendorName,
    price: priceVnd,
    calories: resolvedCalories ?? undefined,
    addons: normalizeMealAddons(addons),
    mealKey,
    ...(nutritionSnapshot
      ? {
          calorieSource: nutritionSnapshot.calorieSource,
          calorieBasis: nutritionSnapshot.calorieBasis,
          portionSize: nutritionSnapshot.portionSize,
          portionGrams: nutritionSnapshot.portionGrams,
          servingAmount: nutritionSnapshot.servingAmount,
          servingUnit: nutritionSnapshot.servingUnit,
          kcalMin: nutritionSnapshot.kcalMin,
          kcalMax: nutritionSnapshot.kcalMax,
          proteinG: nutritionSnapshot.proteinG,
          carbsG: nutritionSnapshot.carbsG,
          fatG: nutritionSnapshot.fatG,
          macroSource: nutritionSnapshot.macroSource,
          nutritionRecordId: nutritionSnapshot.nutritionRecordId,
          nutritionCanonicalName: nutritionSnapshot.nutritionCanonicalName,
          nutritionConfidence: nutritionSnapshot.nutritionConfidence,
          nutritionVerificationState:
            nutritionSnapshot.nutritionVerificationState,
          nutritionCalorieStatus: nutritionSnapshot.nutritionCalorieStatus,
          nutritionValidationResult:
            nutritionSnapshot.nutritionValidationResult,
          nutritionTrainingEligibility:
            nutritionSnapshot.nutritionTrainingEligibility,
          nutritionReferenceOnly: nutritionSnapshot.nutritionReferenceOnly,
          nutritionSource: nutritionSnapshot.nutritionSource,
          nutritionSourceId: nutritionSnapshot.nutritionSourceId,
          nutritionSourceUrl: nutritionSnapshot.nutritionSourceUrl,
          nutritionMatchType: nutritionSnapshot.nutritionMatchType,
          nutritionMatchScore: nutritionSnapshot.nutritionMatchScore,
          nutritionDataOrigin: nutritionSnapshot.nutritionDataOrigin,
          nutritionDataStatus: nutritionSnapshot.nutritionDataStatus,
          nutritionSourceKind: nutritionSnapshot.nutritionSourceKind,
          nutritionSourceNote: nutritionSnapshot.nutritionSourceNote,
          userOverrideOfNutritionRecordId:
            nutritionSnapshot.userOverrideOfNutritionRecordId,
          macroEnergyKcal: nutritionSnapshot.macroEnergyKcal,
          macroEnergyDeltaPct: nutritionSnapshot.macroEnergyDeltaPct,
          macroEnergyConsistency: nutritionSnapshot.macroEnergyConsistency,
          nutritionRecipe: nutritionSnapshot.nutritionRecipe
        }
      : {}),
    timestamp: timestampForMealDate(dateKey, mealKey)
  };

  logsData = existingIndex >= 0
    ? [
        newLog,
        ...logsData.filter((_, index) => index !== existingIndex)
      ]
    : [newLog, ...logsData];

  saveToLocalStorage('logs');
  logListeners.forEach(listener => listener(logsData));
  return newLog;
};

export const mockDb = {
  getDoc: (day: string) => dbData[day],
  getAll: () => dbData,
  updateDoc: (day: string, data: DayMenu) => {
    dbData[day] = data;
    saveToLocalStorage('timetable');
    if (listeners[day]) listeners[day].forEach(l => l(data));
    if (listeners['all']) listeners['all'].forEach(l => l(dbData));
  },
  subscribe: (day: string, callback: Listener) => {
    if (!listeners[day]) listeners[day] = new Set();
    listeners[day].add(callback);
    callback(day === 'all' ? dbData : dbData[day]);
    return () => listeners[day].delete(callback);
  },
  getCategories: () => categoriesData,
  getCategoriesSync: () => categoriesData,
  subscribeCategories: (callback: Listener) => {
    categoryListeners.add(callback);
    callback(categoriesData);
    return () => categoryListeners.delete(callback);
  },
  addCategory: (name: string) => {
    const newCategory = { id: createLocalId('c'), name };
    categoriesData = [...categoriesData, newCategory];
    saveToLocalStorage('categories');
    categoryListeners.forEach(l => l(categoriesData));
  },
  getDishes: () => dishesData,
  getDishesSync: () => dishesData,
  subscribeDishes: (callback: Listener) => {
    dishListeners.add(callback);
    callback(dishesData);
    void hydrateMissingDishCalories();
    return () => dishListeners.delete(callback);
  },
  subscribeLogs: (callback: Listener) => {
    logListeners.add(callback);
    callback(logsData);
    return () => logListeners.delete(callback);
  },
  upsertMealLog: upsertMealLogData,
  deleteMealLog: (logId: string) => {
    const existing = logsData.find(log => log.id === logId);
    if (!existing) return;

    const dateKey = getVietnamDateKey(existing.timestamp);
    if (!isMealDateEditable(dateKey)) {
      throw new Error('Lịch sử quá 3 ngày chỉ được xem, không thể xóa hoặc chỉnh sửa.');
    }

    logsData = logsData.filter(log => log.id !== logId);
    saveToLocalStorage('logs');
    logListeners.forEach(l => l(logsData));
  },
  addLog: (
    dishName: string,
    vendorName: string,
    price: number,
    calories?: number,
    mealKey?: MealKey,
    addons?: MealAddon[],
    nutritionSnapshot?: MealNutritionSnapshot
  ) => {
    if (!mealKey) {
      const now = Date.now();
      const newLog: LogEntry = {
        id: createLocalId('l'),
        dishName,
        vendorName,
        price,
        calories: normalizeKcalInternal(calories) ?? undefined,
        addons: normalizeMealAddons(addons),
        ...(nutritionSnapshot || {}),
        timestamp: now
      };
      logsData = [newLog, ...logsData];
      saveToLocalStorage('logs');
      logListeners.forEach(l => l(logsData));
      return;
    }

    upsertMealLogData({
      dateKey: getVietnamDateKey(),
      mealKey,
      dishName,
      vendorName,
      price,
      calories,
      addons,
      nutritionSnapshot
    });
  },
  selectCombo: (day: string, comboKey: 'A' | 'B' | 'C' | null) => {
    if (comboKey === null) {
      delete dbData[day].selectedCombo;
    } else {
      dbData[day].selectedCombo = comboKey;
    }
    saveToLocalStorage('timetable');
    if (listeners[day]) listeners[day].forEach(l => l(dbData[day]));
    if (listeners['all']) listeners['all'].forEach(l => l(dbData));
  },
  toggleMealSkipped: (day: string, comboKey: 'A' | 'B' | 'C', skipped: boolean) => {
    dbData[day].options[comboKey].skipped = skipped;
    saveToLocalStorage('timetable');
    if (listeners[day]) listeners[day].forEach(l => l(dbData[day]));
    if (listeners['all']) listeners['all'].forEach(l => l(dbData));
  },
  swapDish: (day: string, comboKey: 'A' | 'B' | 'C', newDishId: string) => {
    dbData[day].options[comboKey].dishId = newDishId;
    dbData[day].options[comboKey].skipped = false;
    saveToLocalStorage('timetable');
    if (listeners[day]) listeners[day].forEach(l => l(dbData[day]));
    if (listeners['all']) listeners['all'].forEach(l => l(dbData));
  },
  updateDishImage: async (id: string, imageUrl: string) => {
    const previousDish = dishesData.find(dish => dish.id === id);
    const trimmed = imageUrl.trim();
    const normalized = trimmed ? normalizeExternalImageUrl(trimmed) : null;

    if (trimmed && !normalized) {
      throw new Error('URL hình ảnh không hợp lệ. Chỉ hỗ trợ URL http/https.');
    }

    const previous = dishesData;
    dishesData = dishesData.map(dish => {
      if (dish.id !== id) return dish;

      // Public-URL-only edit path: remove all previous image metadata first.
      // Never place `undefined` into the object that will be persisted to Firestore.
      const {
        imageUrl: _imageUrl,
        imageSource: _imageSource,
        imageSourceUrl: _imageSourceUrl,
        imageLicense: _imageLicense,
        imageAttribution: _imageAttribution,
        imagePath: _imagePath,
        imageContentType: _imageContentType,
        imageSize: _imageSize,
        imageUpdatedAt: _imageUpdatedAt,
        ...rest
      } = dish;

      if (!normalized) {
        return rest;
      }

      return {
        ...rest,
        imageUrl: normalized,
        imageSource: 'manual'
      };
    });
    writeLocalCache();
    dishListeners.forEach(l => l(dishesData));

    try {
      await persistUserStateNow(['dishes']);
    } catch (error) {
      dishesData = previous;
      writeLocalCache();
      dishListeners.forEach(l => l(dishesData));
      throw error;
    }

    if (previousDish?.imagePath && currentSyncUid) {
      void deleteUserImageByPath({
        imagePath: previousDish.imagePath,
        uid: currentSyncUid
      }).catch(error => {
        console.warn('[firebase-storage] Replaced dish image cleanup failed', {
          path: previousDish.imagePath,
          uid: currentSyncUid,
          message: error instanceof Error ? error.message : String(error)
        });
      });
    }
  },
  updateDishNutrition: (id: string, input: UserNutritionInput) => {
    const current = dishesData.find(dish => dish.id === id);
    if (!current) {
      throw new Error('Không tìm thấy món cần cập nhật.');
    }

    const fields = userNutritionToDishFields(input, current);
    dishesData = dishesData.map(dish =>
      dish.id === id
        ? {
            ...dish,
            ...fields
          }
        : dish
    );
    saveToLocalStorage('dishes');
    dishListeners.forEach(listener => listener(dishesData));
  },
  updateDishCalories: (id: string, calories: number) => {
    const current = dishesData.find(dish => dish.id === id);
    if (!current) {
      throw new Error('Không tìm thấy món cần cập nhật.');
    }

    const normalizedCalories = normalizeKcalInternal(calories);
    if (
      normalizedCalories === null ||
      normalizedCalories <= 0 ||
      normalizedCalories > 5000
    ) {
      throw new Error('Calo phải là số hợp lệ từ 1 đến 5.000 kcal/phần.');
    }

    const hasMacros =
      typeof current.proteinG === 'number' &&
      typeof current.carbsG === 'number' &&
      typeof current.fatG === 'number';

    const fields = userNutritionToDishFields(
      {
        mode: 'manual',
        calories: normalizedCalories,
        servingAmount: current.servingAmount,
        servingUnit: current.servingUnit,
        ...(hasMacros
          ? {
              proteinG: current.proteinG,
              carbsG: current.carbsG,
              fatG: current.fatG
            }
          : {}),
        sourceKind:
          current.nutritionSourceKind === 'reference-db' ||
          current.nutritionSourceKind === 'recipe'
            ? 'self-entered'
            : current.nutritionSourceKind,
        sourceUrl:
          current.nutritionDataOrigin === 'user-manual'
            ? current.nutritionSourceUrl
            : undefined,
        sourceNote: current.nutritionSourceNote
      },
      current
    );

    dishesData = dishesData.map(d =>
      d.id === id
        ? {
            ...d,
            ...fields
          }
        : d
    );
    saveToLocalStorage('dishes');
    dishListeners.forEach(l => l(dishesData));
  },
  updateDishMacros: (
    id: string,
    macros: { proteinG: number; carbsG: number; fatG: number }
  ) => {
    const current = dishesData.find(dish => dish.id === id);
    if (!current) {
      throw new Error('Không tìm thấy món cần cập nhật.');
    }

    const calories = estimateDishCalories(current);
    const fields = userNutritionToDishFields(
      {
        mode: 'manual',
        calories,
        servingAmount: current.servingAmount,
        servingUnit: current.servingUnit,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
        sourceKind:
          current.nutritionSourceKind === 'reference-db' ||
          current.nutritionSourceKind === 'recipe'
            ? 'self-entered'
            : current.nutritionSourceKind,
        sourceUrl:
          current.nutritionDataOrigin === 'user-manual'
            ? current.nutritionSourceUrl
            : undefined,
        sourceNote: current.nutritionSourceNote
      },
      current
    );

    dishesData = dishesData.map(dish =>
      dish.id === id
        ? {
            ...dish,
            ...fields
          }
        : dish
    );
    saveToLocalStorage('dishes');
    dishListeners.forEach(listener => listener(dishesData));
  },
  updateVendorLink: (dishId: string, vendorId: string, link: string) => {
    dishesData = dishesData.map(dish => {
      if (dish.id === dishId) {
        return {
          ...dish,
          vendors: dish.vendors.map(v => v.id === vendorId ? { ...v, link } : v)
        };
      }
      return dish;
    });
    saveToLocalStorage('dishes');
    dishListeners.forEach(l => l(dishesData));
  },
  toggleFavoriteDish: (id: string) => {
    dishesData = dishesData.map(d => d.id === id ? { ...d, isFavorite: !d.isFavorite } : d);
    saveToLocalStorage('dishes');
    dishListeners.forEach(l => l(dishesData));
  },
  addVendorExtraInfo: (dishId: string, vendorId: string, info: VendorExtraInfo) => {
    dishesData = dishesData.map(dish => {
      if (dish.id === dishId) {
        return {
          ...dish,
          vendors: dish.vendors.map(vendor => {
            if (vendor.id === vendorId) {
              return { ...vendor, extraInfo: [...(vendor.extraInfo || []), info] };
            }
            return vendor;
          })
        };
      }
      return dish;
    });
    saveToLocalStorage('dishes');
    dishListeners.forEach(l => l(dishesData));
  },
  updateDishName: (id: string, newName: string) => {
    const current = dishesData.find(dish => dish.id === id);
    const shouldRefreshKnowledge =
      current?.calorieSource !== 'manual';

    dishesData = dishesData.map(d =>
      d.id === id
        ? {
            ...d,
            name: newName,
            legacyNames:
              current && current.name !== newName
                ? [
                    ...new Set([
                      ...(current.legacyNames || []),
                      current.name
                    ])
                  ]
                : current?.legacyNames,
            ...(shouldRefreshKnowledge
              ? {
                  calories: getDefaultCaloriesForCategory(d.categoryId),
                  calorieSource: 'category-fallback' as const,
                  calorieBasis: 'category' as const,
                  portionSize: undefined,
                  portionGrams: undefined,
                  servingAmount: undefined,
                  servingUnit: undefined,
                  kcalMin: undefined,
                  kcalMax: undefined,
                  nutritionRecordId: undefined,
                  nutritionCanonicalName: undefined,
                  nutritionConfidence: 'unknown' as const,
                  nutritionVerificationState: 'UNVERIFIED_FALLBACK',
                  nutritionCalorieStatus: undefined,
                  nutritionValidationResult: undefined,
                  nutritionTrainingEligibility: undefined,
                  nutritionReferenceOnly: undefined,
                  nutritionSource: undefined,
                  nutritionSourceId: undefined,
                  nutritionSourceUrl: undefined,
                  nutritionMatchType: undefined,
                  nutritionMatchScore: undefined
                }
              : {})
          }
        : d
    );
    saveToLocalStorage('dishes');
    dishListeners.forEach(l => l(dishesData));

    if (shouldRefreshKnowledge) {
      void hydrateDishCaloriesFromKnowledge(id, newName);
    }
  },
  updateVendor: (dishId: string, vendorId: string, updates: Partial<Vendor>) => {
    const safeUpdates = { ...updates };
    if (updates.price !== undefined) {
      const normalizedPrice = normalizePriceVnd(updates.price);
      if (normalizedPrice === null) {
        throw new Error('Giá quán phải là số nguyên VND hợp lệ.');
      }
      safeUpdates.price = normalizedPrice;
    }

    dishesData = dishesData.map(dish => {
      if (dish.id === dishId) {
        return {
          ...dish,
          vendors: dish.vendors.map(v => v.id === vendorId ? { ...v, ...safeUpdates } : v)
        };
      }
      return dish;
    });
    saveToLocalStorage('dishes');
    dishListeners.forEach(l => l(dishesData));
  },
  updateVendorExtraInfo: (dishId: string, vendorId: string, infoId: string, newValue: string) => {
    dishesData = dishesData.map(dish => {
      if (dish.id === dishId) {
        return {
          ...dish,
          vendors: dish.vendors.map(v => {
            if (v.id === vendorId) {
              return {
                ...v,
                extraInfo: v.extraInfo.map(info => info.id === infoId ? { ...info, value: newValue } : info)
              };
            }
            return v;
          })
        };
      }
      return dish;
    });
    saveToLocalStorage('dishes');
    dishListeners.forEach(l => l(dishesData));
  },
  deleteVendorExtraInfo: (dishId: string, vendorId: string, infoId: string) => {
    dishesData = dishesData.map(dish => {
      if (dish.id === dishId) {
        return {
          ...dish,
          vendors: dish.vendors.map(v => {
            if (v.id === vendorId) {
              return {
                ...v,
                extraInfo: v.extraInfo.filter(info => info.id !== infoId)
              };
            }
            return v;
          })
        };
      }
      return dish;
    });
    saveToLocalStorage('dishes');
    dishListeners.forEach(l => l(dishesData));
  },
  addDish: async (
    name: string,
    categoryId: string,
    options: AddDishOptions = {}
  ) => {
    const previousCategories = categoriesData;
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Tên món không được để trống.');
    }

    const nutritionSelection = options.nutritionSelection;
    const resolvedCategoryId = nutritionSelection?.categoryName
      ? ensureNutritionCategory(nutritionSelection.categoryName, categoryId)
      : categoryId;

    const normalizedName = normalizeFoodName(cleanName);
    const existingIndex = dishesData.findIndex(dish =>
      normalizeFoodName(dish.name) === normalizedName
    );

    if (existingIndex >= 0) {
      const current = dishesData[existingIndex];
      const referenceFields = nutritionSelection
        ? nutritionSelectionToDishFields(nutritionSelection)
        : undefined;
      const shouldUseReferenceNutrition =
        Boolean(referenceFields) &&
        !options.userNutrition &&
        current.calorieSource !== 'manual';
      const customNutritionFields = options.userNutrition
        ? userNutritionToDishFields(
            options.userNutrition,
            referenceFields ? { ...current, ...referenceFields } : current
          )
        : undefined;

      let updated: Dish = {
        ...current,
        categoryId: nutritionSelection ? resolvedCategoryId : current.categoryId,
        vendors: mergeVendorInputs(current.vendors, options.vendors),
        ...(shouldUseReferenceNutrition && referenceFields
          ? referenceFields
          : {}),
        ...(customNutritionFields || {})
      };

      updated = applyDishImage(updated, options.image);
      dishesData = dishesData.map((dish, index) =>
        index === existingIndex ? updated : dish
      );
      writeLocalCache();
      dishListeners.forEach(listener => listener(dishesData));

      try {
        await persistUserStateNow(['dishes', 'categories']);
      } catch (error) {
        dishesData = dishesData.map((dish, index) =>
          index === existingIndex ? current : dish
        );
        categoriesData = previousCategories;
        writeLocalCache();
        dishListeners.forEach(listener => listener(dishesData));
        categoryListeners.forEach(listener => listener(categoriesData));
        throw error;
      }

      if (
        current.imagePath &&
        current.imagePath !== updated.imagePath &&
        currentSyncUid
      ) {
        void deleteUserImageByPath({
          imagePath: current.imagePath,
          uid: currentSyncUid
        }).catch(error => {
          console.warn('[firebase-storage] Old dish image cleanup failed', {
            path: current.imagePath,
            uid: currentSyncUid,
            message: error instanceof Error ? error.message : String(error)
          });
        });
      }

      return {
        dish: updated,
        nutritionMatched: Boolean(nutritionSelection),
        created: false
      };
    }

    const referenceFields = nutritionSelection
      ? nutritionSelectionToDishFields(nutritionSelection)
      : undefined;
    const customNutritionFields = options.userNutrition
      ? userNutritionToDishFields(options.userNutrition, referenceFields)
      : undefined;

    let newDish: Dish = {
      id: options.dishId || createLocalId('d'),
      name: cleanName,
      categoryId: resolvedCategoryId,
      isFavorite: false,
      ...(customNutritionFields
        ? {
            ...(referenceFields || {}),
            ...customNutritionFields
          }
        : referenceFields
          ? referenceFields
          : {
              calories: getDefaultCaloriesForCategory(resolvedCategoryId),
              calorieSource: 'category-fallback' as const,
              calorieBasis: 'category' as const,
              nutritionConfidence: 'unknown' as const,
              nutritionVerificationState: 'UNVERIFIED_FALLBACK',
              nutritionDataStatus: 'estimated' as const
            }),
      vendors: mergeVendorInputs([], options.vendors)
    };

    newDish = applyDishImage(newDish, options.image);

    dishesData = [...dishesData, newDish];
    writeLocalCache();
    dishListeners.forEach(listener => listener(dishesData));

    try {
      await persistUserStateNow(['dishes', 'categories']);
    } catch (error) {
      dishesData = dishesData.filter(dish => dish.id !== newDish.id);
      categoriesData = previousCategories;
      writeLocalCache();
      dishListeners.forEach(listener => listener(dishesData));
      categoryListeners.forEach(listener => listener(categoriesData));
      throw error;
    }

    return {
      dish: newDish,
      nutritionMatched: Boolean(nutritionSelection),
      created: true
    };
  },
  addVendor: (dishId: string, name: string, price: number, phone: string, address: string) => {
    const normalizedPrice = normalizePriceVnd(price);
    if (normalizedPrice === null) {
      throw new Error('Giá quán phải là số nguyên VND hợp lệ.');
    }

    dishesData = dishesData.map(dish => {
      if (dish.id !== dishId) return dish;
      return {
        ...dish,
        vendors: mergeVendorInputs(dish.vendors, [{
          name,
          price: normalizedPrice,
          phone,
          address
        }])
      };
    });
    saveToLocalStorage('dishes');
    dishListeners.forEach(l => l(dishesData));
  },
  restoreData: (data: { timetable: Timetable; dishes: Dish[]; categories: Category[] }) => {
    dbData = data.timetable;
    dishesData = migrateDefaultDishRecords(
      data.dishes,
      'persisted'
    ) as Dish[];
    categoriesData = normalizeCachedCategories(data.categories);
    saveToLocalStorage('timetable', 'dishes', 'categories');
    
    Object.values(listeners).flatMap(set => Array.from(set)).forEach(l => l(dbData));
    dishListeners.forEach(l => l(dishesData));
    categoryListeners.forEach(l => l(categoriesData));
    void hydrateMissingDishCalories();
  }
};
