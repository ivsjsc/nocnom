import fs from 'node:fs';
import path from 'node:path';
import {
  initNutritionDatasetSync,
  NutritionService,
  normalizeSearchQuery
} from '../src/services/nutrition';

const root = process.cwd();
const masterJsonPath = path.join(root, 'data', 'nutrition', 'source', 'nocnom_nutrition_knowledge.json');

console.log('=== RUNNING NUTRITION KNOWLEDGE BASE COMPREHENSIVE TESTS ===\n');

let passCount = 0;
let failCount = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
};

// 1. Load and parse master dataset
console.log('--- 1. MASTER DATASET VALIDATION ---');
const rawText = fs.readFileSync(masterJsonPath, 'utf8');
const dataset = JSON.parse(rawText);

assert(dataset.schema === 'nocnom.nutrition.knowledge', 'Schema is nocnom.nutrition.knowledge');
assert(dataset.foods.length === 590, `Foods count is exactly 590 (actual: ${dataset.foods.length})`);
assert(dataset.portions.length === 1770, `Portions count is exactly 1770 (actual: ${dataset.portions.length})`);
assert(dataset.ingredients.length === 61, `Ingredients count is exactly 61 (actual: ${dataset.ingredients.length})`);
assert(dataset.taxonomy.domains.length === 4, `Domains count is 4 (actual: ${dataset.taxonomy.domains.length})`);
assert(dataset.taxonomy.categories.length === 16, `Categories count is 16 (actual: ${dataset.taxonomy.categories.length})`);

// 2. Data Integrity Checks
console.log('\n--- 2. DATA INTEGRITY CHECKS ---');
const foodIds = new Set<string>();
const canonicalIds = new Set<number>();
let duplicateFoodIds = 0;
let duplicateCanonicalIds = 0;

dataset.foods.forEach((f: any) => {
  if (foodIds.has(f.id)) duplicateFoodIds++;
  foodIds.add(f.id);
  if (canonicalIds.has(f.canonical_id)) duplicateCanonicalIds++;
  canonicalIds.add(f.canonical_id);
});

assert(duplicateFoodIds === 0, 'food_id is unique across all records');
assert(duplicateCanonicalIds === 0, 'canonical_id is unique across all records');

// Check portion links
const portionIds = new Set<string>();
let portionOrderErrors = 0;
let foodOrderErrors = 0;

dataset.portions.forEach((p: any) => {
  portionIds.add(p.id);
  if (p.kcal_min > p.kcal_typical || p.kcal_typical > p.kcal_max) {
    portionOrderErrors++;
  }
});

dataset.foods.forEach((f: any) => {
  if (f.energy.kcal_min > f.energy.kcal_typical || f.energy.kcal_typical > f.energy.kcal_max) {
    foodOrderErrors++;
  }
});

assert(portionOrderErrors === 0, 'Portion kcal range order is valid: kcal_min <= kcal_typical <= kcal_max');
assert(foodOrderErrors === 0, 'Food energy kcal range order is valid: kcal_min <= kcal_typical <= kcal_max');

// Check taxonomy references
const domainIds = new Set(dataset.taxonomy.domains.map((d: any) => d.id));
const categoryIds = new Set(dataset.taxonomy.categories.map((c: any) => c.id));
let invalidDomainRefs = 0;
let invalidCategoryRefs = 0;

dataset.foods.forEach((f: any) => {
  if (!domainIds.has(f.classification?.domain_id)) invalidDomainRefs++;
  if (!categoryIds.has(f.classification?.category_id)) invalidCategoryRefs++;
});

assert(invalidDomainRefs === 0, 'All food domain references match taxonomy.domains');
assert(invalidCategoryRefs === 0, 'All food category references match taxonomy.categories');

// 3. NutritionService & Search Tests
console.log('\n--- 3. SERVICE & SEARCH ENGINE TESTS ---');
initNutritionDatasetSync(dataset);
const service = NutritionService.getInstance();

const searchQueries = [
  { query: 'Cơm tấm', expectedSubstring: 'Cơm tấm' },
  { query: 'com tam', expectedSubstring: 'Cơm tấm' },
  { query: 'Cơm tấm sườn', expectedSubstring: 'Cơm tấm sườn' },
  { query: 'com tam suon', expectedSubstring: 'Cơm tấm sườn' },
  { query: 'Bún bò', expectedSubstring: 'Bún bò' },
  { query: 'bun bo', expectedSubstring: 'Bún bò' },
  { query: 'Trà sữa', expectedSubstring: 'Trà sữa' },
  { query: 'tra sua', expectedSubstring: 'Trà sữa' }
];

async function runSearchTests() {
  for (const item of searchQueries) {
    const start = performance.now();
    const results = await service.searchFoods(item.query, { limit: 5 });
    const duration = performance.now() - start;

    const matched = results.length > 0 && results.some(r => r.food.name.toLowerCase().includes(item.expectedSubstring.toLowerCase()));
    assert(
      matched && duration < 50,
      `Search '${item.query}' returned valid results in ${duration.toFixed(2)}ms (< 50ms) (found: ${results.slice(0, 2).map(r => r.food.name).join(', ')})`
    );
  }

  // 4. Calorie Engine Tests
  console.log('\n--- 4. CALORIE ENGINE TESTS ---');
  // Test Grams calculation: kcal = kcal_per_100g * grams / 100
  const sampleFood = dataset.foods[0]; // vn-dish-001 (Phở bò tái: 82 kcal/100g)
  const calcGram = await service.calculateCalories(sampleFood.id, { grams: 250 });
  const expectedGramCal = Math.round((sampleFood.energy.kcal_per_100g * 250) / 100);
  assert(
    calcGram !== null && calcGram.kcalTypical === expectedGramCal,
    `Grams calculation for ${sampleFood.name} (250g): ${calcGram?.kcalTypical} kcal (expected ${expectedGramCal})`
  );

  // Test Portion calculation: S / M / L
  const portions = await service.getPortions(sampleFood.id);
  const portionS = portions.find(p => p.portion_size === 'S');
  const portionM = portions.find(p => p.portion_size === 'M');
  const portionL = portions.find(p => p.portion_size === 'L');

  const calcS = await service.calculateCalories(sampleFood.id, { portionSize: 'S' });
  const calcM = await service.calculateCalories(sampleFood.id, { portionSize: 'M' });
  const calcL = await service.calculateCalories(sampleFood.id, { portionSize: 'L' });

  assert(
    calcS !== null && calcS.kcalTypical === portionS?.kcal_typical &&
    calcM !== null && calcM.kcalTypical === portionM?.kcal_typical &&
    calcL !== null && calcL.kcalTypical === portionL?.kcal_typical,
    `Portion calculation S (${calcS?.kcalTypical}), M (${calcM?.kcalTypical}), L (${calcL?.kcalTypical}) matches exact portion records`
  );

  // 5. Addons & Taxonomy Lookup Tests
  console.log('\n--- 5. ADDONS & TAXONOMY TESTS ---');
  const addons = await service.getAddons();
  assert(addons.length >= 80, `Addons catalog has ${addons.length} items (beverages + fruits)`);
  const fruits = await service.getAddons('fruit');
  const drinks = await service.getAddons('drink');
  assert(fruits.length === 32, `Fruit addons count is exactly 32 (actual: ${fruits.length})`);
  assert(drinks.length === 48, `Drink addons count is exactly 48 (actual: ${drinks.length})`);

  console.log('\n========================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('========================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

void runSearchTests();
