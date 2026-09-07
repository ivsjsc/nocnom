import {
  normalizeMealAddons
} from '../src/domain/meal/addonNormalizer';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const normalized = normalizeMealAddons([
  {
    id: 'fruit-1',
    kind: 'fruit',
    name: 'Táo',
    calories: 80,
    servingAmount: 150,
    servingUnit: 'g'
  },
  {
    id: 'fruit-2',
    kind: 'fruit',
    name: 'Cam',
    calories: 70,
    servingAmount: 140,
    servingUnit: 'g'
  },
  {
    id: 'drink-1',
    kind: 'drink',
    name: 'Sữa',
    calories: 120,
    servingAmount: 250,
    servingUnit: 'ml'
  },
  {
    id: 'drink-1',
    kind: 'drink',
    name: 'Sữa duplicate',
    calories: 120
  },
  {
    id: 'side-1',
    kind: 'side',
    name: 'Salad nhỏ',
    calories: 60,
    servingAmount: 100,
    servingUnit: 'g'
  },
  {
    id: 'dessert-1',
    kind: 'dessert',
    name: 'Sữa chua',
    calories: 90,
    servingAmount: 1,
    servingUnit: 'portion'
  }
]);

assert(
  normalized.length === 4,
  'Persistence allows one selection for each supported addon category'
);
assert(
  normalized.filter(item => item.kind === 'fruit').length === 1,
  'Duplicate fruit choice is removed'
);
assert(
  normalized.filter(item => item.kind === 'drink').length === 1,
  'Duplicate drink choice is removed'
);
assert(
  normalized.every(item => item.calories >= 0),
  'Addon calorie snapshots are never negative'
);
assert(
  normalized.find(item => item.kind === 'fruit')?.servingUnit === 'g' &&
    normalized.find(item => item.kind === 'drink')?.servingUnit === 'ml' &&
    normalized.find(item => item.kind === 'side')?.servingUnit === 'g' &&
    normalized.find(item => item.kind === 'dessert')?.servingUnit === 'portion',
  'Addon categories preserve their serving-unit semantics'
);

const portionFallback = normalizeMealAddons([
  {
    id: 'fruit-piece',
    kind: 'fruit',
    name: 'Một phần trái cây',
    calories: -20
  }
]);
assert(
  portionFallback[0]?.servingUnit === 'portion',
  'Addon without a measured amount uses portion semantics'
);
assert(
  portionFallback[0]?.calories === 0,
  'Invalid negative legacy calorie is clamped to a safe non-negative snapshot'
);

if (failures > 0) process.exit(1);
console.log('Addon normalization tests: PASS');
