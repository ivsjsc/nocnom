import assert from 'node:assert/strict';
import {
  DAILY_SUGGESTION_VERSION,
  refreshDailyMealSuggestions
} from '../src/domain/meal/dailySuggestions';
import { getVietnamDateKey, getVietnamDayKey } from '../src/lib/dateTime';
import type {
  Category,
  Dish,
  LogEntry,
  Timetable
} from '../src/lib/db';

const now = Date.parse('2026-09-16T05:00:00.000Z');
const todayDateKey = getVietnamDateKey(now);
const todayDayKey = getVietnamDayKey(now);

const categories: Category[] = [
  { id: 'main', name: 'Món chính' },
  { id: 'drink', name: 'Đồ uống' }
];

const dish = (
  id: string,
  name: string,
  calories: number,
  categoryId = 'main'
): Dish => ({
  id,
  name,
  calories,
  categoryId,
  isFavorite: false,
  vendors: []
});

const dishes: Dish[] = [
  dish('d1', 'Phở bò', 450),
  dish('d2', 'Cơm gà', 650),
  dish('d3', 'Cơm cá', 620),
  dish('d4', 'Bún bò', 600),
  dish('d5', 'Nước cam', 180, 'drink')
];

const makeTimetable = (): Timetable => ({
  mon: { dayName: 'Thứ 2', options: { A: { dishId: 'd2', stock: 1 }, B: { dishId: 'd2', stock: 1 }, C: { dishId: 'd2', stock: 1 } } },
  tue: { dayName: 'Thứ 3', options: { A: { dishId: 'd2', stock: 1 }, B: { dishId: 'd2', stock: 1 }, C: { dishId: 'd2', stock: 1 } } },
  wed: { dayName: 'Thứ 4', options: { A: { dishId: 'd2', stock: 1 }, B: { dishId: 'd2', stock: 1 }, C: { dishId: 'd2', stock: 1 } } },
  thu: { dayName: 'Thứ 5', options: { A: { dishId: 'd2', stock: 1 }, B: { dishId: 'd2', stock: 1 }, C: { dishId: 'd2', stock: 1 } } },
  fri: { dayName: 'Thứ 6', options: { A: { dishId: 'd2', stock: 1 }, B: { dishId: 'd2', stock: 1 }, C: { dishId: 'd2', stock: 1 } } },
  sat: { dayName: 'Thứ 7', options: { A: { dishId: 'd2', stock: 1 }, B: { dishId: 'd2', stock: 1 }, C: { dishId: 'd2', stock: 1 } } },
  sun: { dayName: 'Chủ Nhật', options: { A: { dishId: 'd2', stock: 1 }, B: { dishId: 'd2', stock: 1 }, C: { dishId: 'd2', stock: 1 } } }
});

const yesterdayLog: LogEntry = {
  id: 'log-yesterday',
  dishName: 'Cơm gà',
  vendorName: 'Quán',
  price: 30000,
  mealKey: 'B',
  timestamp: Date.parse('2026-09-15T05:00:00.000Z')
};

const first = refreshDailyMealSuggestions({
  timetable: makeTimetable(),
  dishes,
  categories,
  logs: [yesterdayLog]
}, now);

assert.equal(first.changed, true);
const todayMenu = first.state.timetable[todayDayKey] as typeof first.state.timetable[string] & {
  suggestionDate?: string;
  suggestionVersion?: number;
};
assert.equal(todayMenu.suggestionDate, todayDateKey);
assert.equal(todayMenu.suggestionVersion, DAILY_SUGGESTION_VERSION);

const selectedIds = [
  todayMenu.options.A.dishId,
  todayMenu.options.B.dishId,
  todayMenu.options.C.dishId
];
assert.equal(new Set(selectedIds).size, 3, 'three meals should not repeat the same dish');
assert.equal(selectedIds.includes('d5'), false, 'standalone drinks should not become a main meal while enough main dishes exist');
assert.equal(selectedIds.includes('d2'), false, 'a recently consumed dish should be avoided while alternatives exist');

const second = refreshDailyMealSuggestions(first.state, now);
assert.equal(second.changed, false, 'the automatic rotation must only run once per calendar day');
assert.deepEqual(second.state.timetable[todayDayKey], todayMenu);

const todayBreakfastLog: LogEntry = {
  id: 'log-today',
  dishName: 'Phở bò',
  vendorName: 'Quán',
  price: 40000,
  mealKey: 'A',
  timestamp: now
};

const withConsumedMeal = refreshDailyMealSuggestions({
  timetable: makeTimetable(),
  dishes,
  categories,
  logs: [todayBreakfastLog, yesterdayLog]
}, now);

assert.equal(
  withConsumedMeal.state.timetable[todayDayKey].options.A.dishId,
  'd1',
  'an already recorded meal must remain aligned with the eaten dish'
);

const skippedTimetable = makeTimetable();
skippedTimetable[todayDayKey].options.B.skipped = true;
const withSkippedMeal = refreshDailyMealSuggestions({
  timetable: skippedTimetable,
  dishes,
  categories,
  logs: []
}, now);

assert.equal(
  withSkippedMeal.state.timetable[todayDayKey].options.B.skipped,
  true,
  'daily rotation must preserve a deliberate skipped meal'
);

console.log('daily-suggestions.test.ts: ok');
