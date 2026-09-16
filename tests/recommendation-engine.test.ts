import assert from 'node:assert/strict';
import {
  buildMealRecommendations,
  calculateAdaptiveMealTarget,
  resolveNextMealKey
} from '../src/domain/meal/recommendationEngine';
import type {
  Category,
  DayMenu,
  Dish,
  LogEntry,
  Vendor
} from '../src/lib/db';
import { getVietnamDateKey } from '../src/lib/dateTime';

const now = Date.parse('2026-09-16T05:00:00.000Z'); // 12:00 in Vietnam
const todayDateKey = getVietnamDateKey(now);

const categories: Category[] = [
  { id: 'rice', name: 'Cơm' },
  { id: 'noodle', name: 'Món nước' },
  { id: 'drink', name: 'Đồ uống' }
];

const vendor = (id: string, price: number, link?: string): Vendor => ({
  id,
  name: `Quán ${id}`,
  phone: '0900000000',
  address: 'Biên Hòa',
  price,
  ...(link ? { link } : {}),
  extraInfo: []
});

const dish = (
  id: string,
  name: string,
  calories: number,
  categoryId: string,
  price: number,
  link?: string
): Dish => ({
  id,
  name,
  calories,
  categoryId,
  isFavorite: false,
  vendors: [vendor(`v-${id}`, price, link)]
});

const dishes: Dish[] = [
  dish('cheap-rice', 'Cơm cá kho', 650, 'rice', 30000),
  dish('premium-rice', 'Cơm bò nướng', 650, 'rice', 80000),
  dish('pho', 'Phở bò', 610, 'noodle', 45000, 'https://maps.google.com'),
  dish('bun', 'Bún riêu', 620, 'noodle', 40000),
  dish('drink', 'Nước cam', 180, 'drink', 25000)
];

const menu: DayMenu = {
  dayName: 'Thứ Tư',
  options: {
    A: { dishId: 'pho', stock: 1 },
    B: { dishId: 'cheap-rice', stock: 1 },
    C: { dishId: 'bun', stock: 1 }
  }
};

assert.equal(
  calculateAdaptiveMealTarget({
    mealKey: 'B',
    dailyCalorieTarget: 2000,
    consumedCalories: 500,
    remainingMealKeys: ['B', 'C']
  }),
  750,
  'remaining daily calories should be redistributed across active meals'
);

assert.equal(
  resolveNextMealKey({ menu, logs: [], dateKey: todayDateKey, now }),
  'B',
  'at noon in Vietnam the next uneaten meal should be lunch'
);

const yesterdayLog: LogEntry = {
  id: 'yesterday',
  dishName: 'Cơm cá kho',
  vendorName: 'Quán cũ',
  price: 30000,
  mealKey: 'B',
  timestamp: Date.parse('2026-09-15T05:00:00.000Z')
};

const variety = buildMealRecommendations({
  mealKey: 'B',
  dishes,
  categories,
  logs: [yesterdayLog],
  todayDateKey,
  dailyCalorieTarget: 2000,
  consumedCalories: 500,
  remainingMealKeys: ['B', 'C'],
  mode: 'variety'
});

assert.equal(variety.length, 3);
assert.equal(
  variety.some(item => item.dish.id === 'drink'),
  false,
  'standalone drinks must not be promoted as a main meal while main dishes exist'
);
assert.equal(
  variety.some(item => item.dish.id === 'cheap-rice'),
  false,
  'a dish eaten yesterday should be avoided when enough alternatives exist'
);
assert.ok(
  new Set(variety.map(item => item.dish.categoryId)).size >= 2,
  'top suggestions should be diversified instead of returning one narrow category'
);

const budget = buildMealRecommendations({
  mealKey: 'B',
  dishes,
  categories,
  logs: [],
  todayDateKey,
  dailyCalorieTarget: 2000,
  consumedCalories: 500,
  remainingMealKeys: ['B', 'C'],
  budgetVnd: 50000,
  mode: 'budget'
});

assert.ok(budget.length >= 1);
assert.ok(
  budget[0].price !== null && budget[0].price <= 50000,
  'budget mode should prefer an in-budget option when suitable options exist'
);
assert.ok(
  budget[0].reasons.some(reason =>
    reason.includes('ngân sách') || reason.includes('Giá tốt')
  ),
  'recommendations should expose a concise reason for the ranking'
);

const balancedWithoutBudget = buildMealRecommendations({
  mealKey: 'C',
  dishes,
  categories,
  logs: [],
  todayDateKey,
  dailyCalorieTarget: 1800,
  consumedCalories: 900,
  remainingMealKeys: ['C'],
  mode: 'balanced'
});

assert.ok(
  balancedWithoutBudget.every(item => Number.isFinite(item.score)),
  'missing optional budget must be handled by weight normalization, not zero-filled scoring'
);

console.log('recommendation-engine.test.ts: ok');
