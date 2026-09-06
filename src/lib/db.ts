import { lookupNutrition, normalizeFoodName } from './nutritionKnowledge';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

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
  source: 'wikimedia-commons' | 'manual';
  sourcePageUrl?: string;
  license?: string;
  attribution?: string;
};

export type AddDishOptions = {
  image?: DishImageReference;
  vendors?: NewVendorInput[];
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
  calories?: number;
  calorieSource?: 'manual' | 'knowledge';
  calorieBasis?: 'serving' | '100g';
  nutritionRecordId?: string;
  nutritionConfidence?: 'verified' | 'estimated' | 'unknown';
  nutritionSource?: string;
  vendors: Vendor[];
};

export type Category = {
  id: string;
  name: string;
};

export type MealKey = 'A' | 'B' | 'C';
export type MealAddonKind = 'fruit' | 'drink';

export type MealAddon = {
  id: string;
  kind: MealAddonKind;
  name: string;
  calories: number;
  nutritionRecordId?: string;
  servingG?: number;
  kcalMin?: number;
  kcalMax?: number;
};

export type LogEntry = {
  id: string;
  dishName: string;
  vendorName: string;
  price: number;
  calories?: number;
  addons?: MealAddon[];
  mealKey?: MealKey;
  timestamp: number;
};

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_EDIT_DAYS = 3;

function datePartsInVietnam(timestamp: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(timestamp));

  const lookup = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day)
  };
}

export const getVietnamDateKey = (timestamp = Date.now()) => {
  const { year, month, day } = datePartsInVietnam(timestamp);
  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-');
};

function dateKeyToUtcDay(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(utc / DAY_MS);
}

export const getEditableMealDateRange = (now = Date.now()) => {
  const todayKey = getVietnamDateKey(now);
  const todayDay = dateKeyToUtcDay(todayKey)!;
  const minDay = todayDay - MAX_HISTORY_EDIT_DAYS;
  const minDate = new Date(minDay * DAY_MS);

  return {
    min: [
      minDate.getUTCFullYear(),
      String(minDate.getUTCMonth() + 1).padStart(2, '0'),
      String(minDate.getUTCDate()).padStart(2, '0')
    ].join('-'),
    max: todayKey
  };
};

export const isMealDateEditable = (dateKey: string, now = Date.now()) => {
  const candidate = dateKeyToUtcDay(dateKey);
  if (candidate === null) return false;

  const today = dateKeyToUtcDay(getVietnamDateKey(now))!;
  const age = today - candidate;
  return age >= 0 && age <= MAX_HISTORY_EDIT_DAYS;
};

function timestampForMealDate(dateKey: string, mealKey: MealKey) {
  const hour: Record<MealKey, string> = { A: '08:00:00', B: '12:00:00', C: '18:00:00' };
  const timestamp = Date.parse(`${dateKey}T${hour[mealKey]}+07:00`);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Ngày lịch sử không hợp lệ.');
  }
  return timestamp;
}

export const initialCategories: Category[] = [
  { id: 'c1', name: 'Món mặn' },
  { id: 'c2', name: 'Món canh' },
  { id: 'c3', name: 'Món nước (Mì/Phở/Bún)' },
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

export const estimateDishCalories = (dish: Pick<Dish, 'calories' | 'categoryId'>) => {
  const calories = Number(dish.calories);
  if (Number.isFinite(calories) && calories > 0) {
    return Math.round(calories);
  }

  return getDefaultCaloriesForCategory(dish.categoryId);
};

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

let dbData = { ...defaultTimetable };
let dishesData: Dish[] = [...initialDishes];
let categoriesData: Category[] = [...initialCategories];
let logsData: LogEntry[] = [];

try {
  const storedDbData = (localStorage.getItem('nocnom_timetable') ?? localStorage.getItem('unifood_timetable'));
  if (storedDbData) dbData = JSON.parse(storedDbData);

  const storedDishesData = (localStorage.getItem('nocnom_dishes') ?? localStorage.getItem('unifood_dishes'));
  if (storedDishesData) dishesData = JSON.parse(storedDishesData);

  const storedCategoriesData = (localStorage.getItem('nocnom_categories') ?? localStorage.getItem('unifood_categories'));
  if (storedCategoriesData) categoriesData = JSON.parse(storedCategoriesData);

  const storedLogsData = (localStorage.getItem('nocnom_logs') ?? localStorage.getItem('unifood_logs'));
  if (storedLogsData) logsData = JSON.parse(storedLogsData);
} catch (e) {
  console.error("Error loading from localStorage", e);
}

const createLocalId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return prefix + crypto.randomUUID();
  }
  return prefix + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
};

const saveToLocalStorage = () => {
  try {
    localStorage.setItem('nocnom_timetable', JSON.stringify(dbData));
    localStorage.setItem('nocnom_dishes', JSON.stringify(dishesData));
    localStorage.setItem('nocnom_categories', JSON.stringify(categoriesData));
    localStorage.setItem('nocnom_logs', JSON.stringify(logsData));
  } catch (e) {
    console.error("Error saving to localStorage", e);
  }
  scheduleCloudSync();
};

let currentSyncUid: string | null = null;
let firestoreUnsubscribe: Unsubscribe | null = null;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let isRemoteUpdating = false;

const notifyAllListeners = () => {
  Object.values(listeners).flatMap(set => Array.from(set)).forEach(l => l(dbData));
  dishListeners.forEach(l => l(dishesData));
  categoryListeners.forEach(l => l(categoriesData));
  logListeners.forEach(l => l(logsData));
};

const scheduleCloudSync = () => {
  if (!currentSyncUid || isRemoteUpdating) return;

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(async () => {
    if (!currentSyncUid || isRemoteUpdating) return;
    const uid = currentSyncUid;
    try {
      const userStateDoc = doc(db, 'users', uid, 'data', 'appState');
      await setDoc(userStateDoc, {
        timetable: dbData,
        dishes: dishesData,
        categories: categoriesData,
        logs: logsData,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Không thể đồng bộ dữ liệu lên Firestore:', err);
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

  currentSyncUid = uid;

  if (!uid) {
    return;
  }

  const userStateDoc = doc(db, 'users', uid, 'data', 'appState');

  // Lắng nghe realtime từ Firestore
  firestoreUnsubscribe = onSnapshot(
    userStateDoc,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data) {
          isRemoteUpdating = true;
          try {
            if (data.timetable && typeof data.timetable === 'object') {
              dbData = data.timetable as Timetable;
            }
            if (Array.isArray(data.dishes)) {
              dishesData = data.dishes as Dish[];
            }
            if (Array.isArray(data.categories)) {
              categoriesData = data.categories as Category[];
            }
            if (Array.isArray(data.logs)) {
              logsData = data.logs as LogEntry[];
            }

            try {
              localStorage.setItem('nocnom_timetable', JSON.stringify(dbData));
              localStorage.setItem('nocnom_dishes', JSON.stringify(dishesData));
              localStorage.setItem('nocnom_categories', JSON.stringify(categoriesData));
              localStorage.setItem('nocnom_logs', JSON.stringify(logsData));
            } catch (e) {
              console.error('Lỗi cache localStorage:', e);
            }

            notifyAllListeners();
          } finally {
            isRemoteUpdating = false;
          }
        }
      } else {
        // Tài liệu chưa tồn tại trên Firestore (người dùng mới đăng nhập lần đầu)
        // Đồng bộ dữ liệu hiện có lên Firestore
        try {
          await setDoc(userStateDoc, {
            timetable: dbData,
            dishes: dishesData,
            categories: categoriesData,
            logs: logsData,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error('Lỗi tạo tài liệu dữ liệu ban đầu trên Firestore:', err);
        }
      }
    },
    (error) => {
      console.error('Lỗi lắng nghe realtime Firestore:', error);
    }
  );
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
            calories: result.calories,
            calorieSource: 'knowledge',
            calorieBasis: result.basis,
            nutritionRecordId: result.record.id,
            nutritionConfidence: result.record.confidence,
            nutritionSource: result.record.source
          }
        : dish
    );

    saveToLocalStorage();
    dishListeners.forEach(listener => listener(dishesData));
  } finally {
    nutritionHydrationPending.delete(dishId);
  }
};

export const sumMealAddonCalories = (
  log: Pick<LogEntry, 'addons'>
): number =>
  (log.addons ?? []).reduce((total, addon) => {
    const calories = Number(addon.calories);
    return total + (
      Number.isFinite(calories) && calories >= 0
        ? Math.round(calories)
        : 0
    );
  }, 0);

const normalizeMealAddons = (addons?: MealAddon[]): MealAddon[] => {
  if (!Array.isArray(addons)) return [];

  const seenKinds = new Set<MealAddonKind>();

  return addons
    .filter(addon => addon && (addon.kind === 'fruit' || addon.kind === 'drink'))
    .filter(addon => {
      if (seenKinds.has(addon.kind)) return false;
      seenKinds.add(addon.kind);
      return true;
    })
    .map(addon => ({
      id: String(addon.id).trim(),
      kind: addon.kind,
      name: String(addon.name).trim(),
      calories: Math.max(0, Math.round(Number(addon.calories) || 0)),
      nutritionRecordId: addon.nutritionRecordId
        ? String(addon.nutritionRecordId).trim()
        : undefined,
      servingG:
        typeof addon.servingG === 'number' && Number.isFinite(addon.servingG)
          ? Math.max(0, addon.servingG)
          : undefined,
      kcalMin:
        typeof addon.kcalMin === 'number' && Number.isFinite(addon.kcalMin)
          ? Math.max(0, Math.round(addon.kcalMin))
          : undefined,
      kcalMax:
        typeof addon.kcalMax === 'number' && Number.isFinite(addon.kcalMax)
          ? Math.max(0, Math.round(addon.kcalMax))
          : undefined
    }))
    .filter(addon => addon.id && addon.name);
};

const hydrateMissingDishCalories = async () => {
  const candidates = dishesData.filter(dish =>
    dish.calorieSource === 'knowledge' ||
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
    const price = Number(input.price);

    if (!name || !Number.isFinite(price) || price < 0) return;

    const key = normalizeFoodName(name) + '|' + normalizeFoodName(address);
    const existingIndex = vendors.findIndex(vendor =>
      normalizeFoodName(vendor.name) + '|' + normalizeFoodName(vendor.address) === key
    );

    if (existingIndex >= 0) {
      const existing = vendors[existingIndex];
      vendors[existingIndex] = {
        ...existing,
        name,
        price: Math.round(price),
        phone: phone || existing.phone,
        address: address || existing.address,
        ...(link ? { link } : {})
      };
      return;
    }

    vendors.push({
      id: createLocalId('v'),
      name,
      price: Math.round(price),
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

  return {
    ...dish,
    imageUrl: image.url.trim(),
    imageSource: image.source,
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


const upsertMealLogData = ({
  dateKey,
  mealKey,
  dishName,
  vendorName,
  price,
  calories,
  addons
}: {
  dateKey: string;
  mealKey: MealKey;
  dishName: string;
  vendorName: string;
  price: number;
  calories?: number;
  addons?: MealAddon[];
}) => {
  if (!isMealDateEditable(dateKey)) {
    throw new Error('Chỉ được thêm hoặc chỉnh sửa lịch sử của hôm nay và tối đa 3 ngày trước.');
  }

  const normalizedDishName = dishName.trim();
  const normalizedVendorName = vendorName.trim();

  if (!normalizedDishName) throw new Error('Cần chọn món ăn.');
  if (!normalizedVendorName) throw new Error('Cần chọn quán hoặc nguồn món.');
  if (!Number.isFinite(price) || price < 0) throw new Error('Giá món không hợp lệ.');

  const existingIndex = logsData.findIndex(log =>
    log.mealKey === mealKey &&
    getVietnamDateKey(log.timestamp) === dateKey
  );

  const newLog: LogEntry = {
    id: existingIndex >= 0 ? logsData[existingIndex].id : createLocalId('l'),
    dishName: normalizedDishName,
    vendorName: normalizedVendorName,
    price: Math.round(price),
    calories:
      typeof calories === 'number' && Number.isFinite(calories)
        ? Math.max(0, Math.round(calories))
        : undefined,
    addons: normalizeMealAddons(addons),
    mealKey,
    timestamp: timestampForMealDate(dateKey, mealKey)
  };

  logsData = existingIndex >= 0
    ? [
        newLog,
        ...logsData.filter((_, index) => index !== existingIndex)
      ]
    : [newLog, ...logsData];

  saveToLocalStorage();
  logListeners.forEach(listener => listener(logsData));
  return newLog;
};

export const mockDb = {
  getDoc: (day: string) => dbData[day],
  getAll: () => dbData,
  updateDoc: (day: string, data: DayMenu) => {
    dbData[day] = data;
    saveToLocalStorage();
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
    saveToLocalStorage();
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
    saveToLocalStorage();
    logListeners.forEach(l => l(logsData));
  },
  addLog: (
    dishName: string,
    vendorName: string,
    price: number,
    calories?: number,
    mealKey?: MealKey,
    addons?: MealAddon[]
  ) => {
    if (!mealKey) {
      const now = Date.now();
      const newLog: LogEntry = {
        id: createLocalId('l'),
        dishName,
        vendorName,
        price,
        calories,
        addons: normalizeMealAddons(addons),
        timestamp: now
      };
      logsData = [newLog, ...logsData];
      saveToLocalStorage();
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
      addons
    });
  },
  selectCombo: (day: string, comboKey: 'A' | 'B' | 'C' | null) => {
    if (comboKey === null) {
      delete dbData[day].selectedCombo;
    } else {
      dbData[day].selectedCombo = comboKey;
    }
    saveToLocalStorage();
    if (listeners[day]) listeners[day].forEach(l => l(dbData[day]));
    if (listeners['all']) listeners['all'].forEach(l => l(dbData));
  },
  toggleMealSkipped: (day: string, comboKey: 'A' | 'B' | 'C', skipped: boolean) => {
    dbData[day].options[comboKey].skipped = skipped;
    saveToLocalStorage();
    if (listeners[day]) listeners[day].forEach(l => l(dbData[day]));
    if (listeners['all']) listeners['all'].forEach(l => l(dbData));
  },
  swapDish: (day: string, comboKey: 'A' | 'B' | 'C', newDishId: string) => {
    dbData[day].options[comboKey].dishId = newDishId;
    dbData[day].options[comboKey].skipped = false;
    saveToLocalStorage();
    if (listeners[day]) listeners[day].forEach(l => l(dbData[day]));
    if (listeners['all']) listeners['all'].forEach(l => l(dbData));
  },
  updateDishImage: (id: string, imageUrl: string) => {
    dishesData = dishesData.map(d => d.id === id ? { ...d, imageUrl } : d);
    saveToLocalStorage();
    dishListeners.forEach(l => l(dishesData));
  },
  updateDishCalories: (id: string, calories: number) => {
    dishesData = dishesData.map(d =>
      d.id === id
        ? {
            ...d,
            calories: Math.round(calories),
            calorieSource: 'manual',
            calorieBasis: 'serving',
            nutritionRecordId: undefined,
            nutritionConfidence: undefined,
            nutritionSource: undefined
          }
        : d
    );
    saveToLocalStorage();
    dishListeners.forEach(l => l(dishesData));
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
    saveToLocalStorage();
    dishListeners.forEach(l => l(dishesData));
  },
  toggleFavoriteDish: (id: string) => {
    dishesData = dishesData.map(d => d.id === id ? { ...d, isFavorite: !d.isFavorite } : d);
    saveToLocalStorage();
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
    saveToLocalStorage();
    dishListeners.forEach(l => l(dishesData));
  },
  updateDishName: (id: string, newName: string) => {
    const current = dishesData.find(dish => dish.id === id);
    const shouldRefreshKnowledge =
      current?.calorieSource === 'knowledge' ||
      typeof current?.calories !== 'number';

    dishesData = dishesData.map(d =>
      d.id === id
        ? {
            ...d,
            name: newName,
            ...(shouldRefreshKnowledge
              ? {
                  calories: undefined,
                  calorieSource: undefined,
                  calorieBasis: undefined,
                  nutritionRecordId: undefined,
                  nutritionConfidence: undefined,
                  nutritionSource: undefined
                }
              : {})
          }
        : d
    );
    saveToLocalStorage();
    dishListeners.forEach(l => l(dishesData));

    if (shouldRefreshKnowledge) {
      void hydrateDishCaloriesFromKnowledge(id, newName);
    }
  },
  updateVendor: (dishId: string, vendorId: string, updates: Partial<Vendor>) => {
    dishesData = dishesData.map(dish => {
      if (dish.id === dishId) {
        return {
          ...dish,
          vendors: dish.vendors.map(v => v.id === vendorId ? { ...v, ...updates } : v)
        };
      }
      return dish;
    });
    saveToLocalStorage();
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
    saveToLocalStorage();
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
    saveToLocalStorage();
    dishListeners.forEach(l => l(dishesData));
  },
  addDish: async (
    name: string,
    categoryId: string,
    options: AddDishOptions = {}
  ) => {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Tên món không được để trống.');
    }

    const nutrition = await lookupNutrition(cleanName);
    const resolvedCategoryId = nutrition?.record.category
      ? ensureNutritionCategory(nutrition.record.category, categoryId)
      : categoryId;

    const normalizedName = normalizeFoodName(cleanName);
    const existingIndex = dishesData.findIndex(dish =>
      normalizeFoodName(dish.name) === normalizedName
    );

    if (existingIndex >= 0) {
      const current = dishesData[existingIndex];
      const shouldUseKnowledge =
        Boolean(nutrition) &&
        current.calorieSource !== 'manual';

      let updated: Dish = {
        ...current,
        categoryId: nutrition ? resolvedCategoryId : current.categoryId,
        vendors: mergeVendorInputs(current.vendors, options.vendors),
        ...(shouldUseKnowledge && nutrition
          ? {
              calories: nutrition.calories,
              calorieSource: 'knowledge',
              calorieBasis: nutrition.basis,
              nutritionRecordId: nutrition.record.id,
              nutritionConfidence: nutrition.record.confidence,
              nutritionSource: nutrition.record.source
            }
          : {})
      };

      updated = applyDishImage(updated, options.image);
      dishesData = dishesData.map((dish, index) =>
        index === existingIndex ? updated : dish
      );
      saveToLocalStorage();
      dishListeners.forEach(listener => listener(dishesData));

      return {
        dish: updated,
        nutritionMatched: Boolean(nutrition),
        created: false
      };
    }

    let newDish: Dish = {
      id: createLocalId('d'),
      name: cleanName,
      categoryId: resolvedCategoryId,
      isFavorite: false,
      ...(nutrition
        ? {
            calories: nutrition.calories,
            calorieSource: 'knowledge',
            calorieBasis: nutrition.basis,
            nutritionRecordId: nutrition.record.id,
            nutritionConfidence: nutrition.record.confidence,
            nutritionSource: nutrition.record.source
          }
        : {}),
      vendors: mergeVendorInputs([], options.vendors)
    };

    newDish = applyDishImage(newDish, options.image);

    dishesData = [...dishesData, newDish];
    saveToLocalStorage();
    dishListeners.forEach(listener => listener(dishesData));

    return {
      dish: newDish,
      nutritionMatched: Boolean(nutrition),
      created: true
    };
  },
  addVendor: (dishId: string, name: string, price: number, phone: string, address: string) => {
    dishesData = dishesData.map(dish => {
      if (dish.id === dishId) {
        return {
          ...dish,
          vendors: [...dish.vendors, {
            id: createLocalId('v'),
            name,
            price,
            phone,
            address,
            extraInfo: []
          }]
        };
      }
      return dish;
    });
    saveToLocalStorage();
    dishListeners.forEach(l => l(dishesData));
  },
  restoreData: (data: { timetable: Timetable; dishes: Dish[]; categories: Category[] }) => {
    dbData = data.timetable;
    dishesData = data.dishes;
    categoriesData = data.categories;
    saveToLocalStorage();
    
    Object.values(listeners).flatMap(set => Array.from(set)).forEach(l => l(dbData));
    dishListeners.forEach(l => l(dishesData));
    categoryListeners.forEach(l => l(categoriesData));
    void hydrateMissingDishCalories();
  }
};
