import {
  buildRecentConsumedSeries,
  calculateConsumedCalories,
  calculateConsumedMacros,
  calculateMealDistribution,
  calculatePlannedCalories,
  getLogsForVietnamDate,
  isDishConsumedForMeal
} from '../src/domain/meal/mealAnalytics';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const dishes = [
  { id: 'breakfast', name: 'Breakfast', calories: 500 },
  { id: 'lunch', name: 'Lunch', calories: 700 },
  { id: 'dinner', name: 'Dinner', calories: 650 },
  { id: 'lunch-alt', name: 'Lunch Alt', calories: 600 }
];

const estimate = (dish: { calories?: number }) => dish.calories || 0;

const plannedFull = calculatePlannedCalories(
  {
    options: {
      A: { dishId: 'breakfast', skipped: false },
      B: { dishId: 'lunch', skipped: false },
      C: { dishId: 'dinner', skipped: false }
    }
  },
  dishes,
  estimate
);
assert(
  plannedFull.totalCalories === 1850 &&
    plannedFull.activeMealCount === 3,
  'Planned total sums breakfast + lunch + dinner'
);

const plannedSkipLunch = calculatePlannedCalories(
  {
    options: {
      A: { dishId: 'breakfast', skipped: false },
      B: { dishId: 'lunch', skipped: true },
      C: { dishId: 'dinner', skipped: false }
    }
  },
  dishes,
  estimate
);
assert(
  plannedSkipLunch.totalCalories === 1150 &&
    plannedSkipLunch.activeMealCount === 2,
  'Skipped meal is excluded from planned calories'
);

const plannedBreakfastOnly = calculatePlannedCalories(
  {
    options: {
      A: { dishId: 'breakfast', skipped: false },
      B: { dishId: 'lunch', skipped: true },
      C: { dishId: 'dinner', skipped: true }
    }
  },
  dishes,
  estimate
);
assert(
  plannedBreakfastOnly.totalCalories === 500 &&
    plannedBreakfastOnly.activeMealCount === 1,
  'A day with breakfast only has exactly one planned meal'
);

const plannedReplacement = calculatePlannedCalories(
  {
    options: {
      A: { dishId: 'breakfast', skipped: false },
      B: { dishId: 'lunch-alt', skipped: false },
      C: { dishId: 'dinner', skipped: false }
    }
  },
  dishes,
  estimate
);
assert(
  plannedReplacement.totalCalories === 1750,
  'Meal replacement recalculates planned total from the replacement dish'
);

const vietnamDay = '2026-09-07';
const logs = [
  {
    timestamp: Date.parse('2026-09-07T08:00:00+07:00'),
    mealKey: 'A' as const,
    dishName: 'Breakfast',
    calories: 480,
    addons: [
      { kind: 'fruit' as const, calories: 80 },
      { kind: 'drink' as const, calories: 120 }
    ]
  },
  {
    timestamp: Date.parse('2026-09-07T18:00:00+07:00'),
    mealKey: 'C' as const,
    dishName: 'Dinner',
    calories: 650,
    addons: []
  }
];

const todayLogs = getLogsForVietnamDate(logs, vietnamDay);
assert(todayLogs.length === 2, 'Vietnam date selector returns only logs in the business day');

assert(
  isDishConsumedForMeal(todayLogs, 'A', dishes[0]),
  'Home meal status marks the planned breakfast dish as eaten'
);
assert(
  !isDishConsumedForMeal(todayLogs, 'B', dishes[1]),
  'Home meal status stays unmarked when the meal has no log'
);
assert(
  !isDishConsumedForMeal(
    [
      {
        timestamp: Date.parse('2026-09-07T12:00:00+07:00'),
        mealKey: 'B',
        dishName: 'Lunch Alt'
      }
    ],
    'B',
    dishes[1]
  ),
  'A log for another dish must not stamp the displayed planned dish as eaten'
);
assert(
  isDishConsumedForMeal(
    [
      {
        timestamp: Date.parse('2026-09-07T12:00:00+07:00'),
        mealKey: 'B',
        dishName: 'Old Lunch Name'
      }
    ],
    'B',
    {
      name: 'Lunch',
      legacyNames: ['Old Lunch Name']
    }
  ),
  'Renamed dishes still inherit eaten state through legacy names'
);

const consumed = calculateConsumedCalories(todayLogs, dishes, estimate);
assert(
  consumed === 1330,
  'Consumed total includes snapshot main calories + fruit + drink'
);
assert(
  consumed !== plannedFull.totalCalories,
  'Planned and consumed calories remain separate measures'
);

const completeMacros = calculateConsumedMacros([
  {
    timestamp: Date.parse('2026-09-07T08:00:00+07:00'),
    mealKey: 'A',
    dishName: 'Breakfast',
    proteinG: 25,
    carbsG: 60,
    fatG: 15,
    addons: [
      { kind: 'fruit', proteinG: 1, carbsG: 20, fatG: 0.2 },
      { kind: 'drink', proteinG: 8, carbsG: 12, fatG: 5 }
    ]
  }
]);
assert(
  completeMacros.proteinG === 34 &&
    completeMacros.carbsG === 92 &&
    completeMacros.fatG === 20.2 &&
    completeMacros.coveragePct === 100 &&
    completeMacros.isComplete,
  'Macro aggregation includes main dish + addons with complete coverage'
);

const partialMacros = calculateConsumedMacros([
  {
    timestamp: Date.parse('2026-09-07T12:00:00+07:00'),
    mealKey: 'B',
    dishName: 'Lunch',
    proteinG: 30,
    carbsG: 80,
    fatG: 20,
    addons: [{ kind: 'drink', calories: 120 }]
  }
]);
assert(
  partialMacros.knownItems === 1 &&
    partialMacros.totalItems === 2 &&
    partialMacros.coveragePct === 50 &&
    !partialMacros.isComplete &&
    partialMacros.proteinG === 30,
  'Macro aggregation reports partial coverage instead of treating missing data as zero'
);

const distribution = calculateMealDistribution(todayLogs, dishes, estimate);
assert(
  distribution.breakfastKcal === 680 &&
    distribution.lunchKcal === 0 &&
    distribution.dinnerKcal === 650,
  'Meal distribution handles partial day and skipped/no-log lunch'
);

const sevenDayLogs = [
  ...logs,
  {
    timestamp: Date.parse('2026-09-06T12:00:00+07:00'),
    mealKey: 'B' as const,
    dishName: 'Lunch',
    calories: 700
  }
];

const series = buildRecentConsumedSeries({
  logs: sevenDayLogs,
  dishes,
  endDateKey: vietnamDay,
  days: 7,
  estimateDish: estimate
});

assert(series.days.length === 7, 'Weekly series always contains 7 calendar days');
assert(series.activeDays === 2, 'Weekly series tracks active days separately');
assert(series.totalPeriodKcal === 2030, 'Weekly total sums consumed calories only');
assert(
  series.averagePerActiveDay === Math.round(2030 / 2),
  'Average per active day uses active-day denominator'
);
assert(
  series.averagePerCalendarDay === Math.round(2030 / 7),
  'Average per 7 calendar days uses 7-day denominator'
);
assert(
  series.averagePerActiveDay !== series.averagePerCalendarDay,
  'Weekly average semantics cannot silently mix denominators'
);

const empty = buildRecentConsumedSeries({
  logs: [],
  dishes,
  endDateKey: vietnamDay,
  days: 7,
  estimateDish: estimate
});
assert(
  empty.totalPeriodKcal === 0 &&
    empty.averagePerActiveDay === 0 &&
    empty.averagePerCalendarDay === 0,
  'No-log week produces zero consumed totals without NaN'
);

if (failures > 0) process.exit(1);
console.log('Meal analytics tests: PASS');
