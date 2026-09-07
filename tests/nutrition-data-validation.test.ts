import fs from 'node:fs';
import path from 'node:path';
import {
  validateNutritionDataset
} from '../scripts/nutrition-validation.mjs';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const source = path.join(
  process.cwd(),
  'data',
  'nutrition',
  'source',
  'nocnom_nutrition_knowledge.json'
);
const dataset = JSON.parse(fs.readFileSync(source, 'utf8'));
const result = validateNutritionDataset(dataset);

console.log('=== NUTRITION DATASET VALIDATION ===');
console.log(JSON.stringify(result.stats, null, 2));

assert(result.stats.foodCount === 590, 'Dataset contains 590 food records');
assert(result.stats.portionCount === 1770, 'Dataset contains 1770 portion records');
assert(result.errors.length === 0, 'Dataset has no structural/data-integrity errors');
assert(
  result.stats.normalizedNameCollisionCount === 0,
  'Canonical normalized names have no collisions'
);

if (result.stats.aliasCollisionCount > 0) {
  console.log(
    `[INFO] Alias collisions: ${result.stats.aliasCollisionCount}; runtime resolver requires user disambiguation for ambiguous exact aliases.`
  );
} else {
  console.log('[PASS] No normalized alias collisions detected');
}

for (const warning of result.warnings.slice(0, 10)) {
  console.log('[WARN]', warning);
}

if (failures > 0) process.exit(1);
console.log('Nutrition dataset validation tests: PASS');
