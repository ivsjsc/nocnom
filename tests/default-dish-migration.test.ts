import {
  migrateDefaultDishRecords
} from '../src/domain/menu/defaultDishMigration';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const legacy = [
  {
    id: 'd2',
    name: 'Phở bò / Phở gà',
    categoryId: 'c3',
    isFavorite: false,
    calories: 520,
    vendors: []
  },
  {
    id: 'd14',
    name: 'Mì Quảng / Hủ tiếu',
    categoryId: 'c3',
    isFavorite: false,
    calories: 560,
    vendors: []
  }
];

const persisted = migrateDefaultDishRecords(legacy);
const phoBo = persisted.find(item => item.id === 'd2');
const phoGa = persisted.find(item => item.name === 'Phở gà');

assert(phoBo?.name === 'Phở bò', 'Legacy OR dish keeps stable ID but becomes canonical primary');
assert(phoBo?.calories === 520, 'Existing persisted calorie is preserved during migration');
assert(phoBo?.calorieSource === 'legacy', 'Unprovenanced persisted calorie is marked legacy');
assert(phoBo?.legacyNames?.includes('Phở bò / Phở gà') === true, 'Legacy name is retained for old log lookup');
assert(Boolean(phoGa), 'Alternative OR entity is created as a separate dish');
assert(phoGa?.calories === undefined && phoGa?.calorieSource === 'category-fallback', 'New sibling does not receive a hard-coded calorie');

const newUser = migrateDefaultDishRecords(legacy, 'new-user');
const newPhoBo = newUser.find(item => item.id === 'd2');
assert(newPhoBo?.calories === undefined, 'New-user defaults do not preserve hard-coded legacy calories');
assert(newPhoBo?.calorieSource === 'category-fallback', 'New-user default is explicitly an estimate until Nutrition DB hydrates');

const secondPass = migrateDefaultDishRecords(persisted);
assert(secondPass.length === persisted.length, 'Migration is idempotent and does not duplicate sibling dishes');

if (failures > 0) process.exit(1);
console.log('Default dish migration tests: PASS');
