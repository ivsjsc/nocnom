import {
  classifyNutritionCandidate
} from '../src/services/nutrition/nutritionResolver';
import {
  dishNutritionFieldsToMealSnapshot,
  nutritionSelectionToDishFields
} from '../src/domain/nutrition/nutritionPersistence';
import { calculatePer100gCalories } from '../src/domain/nutrition/calorieCalculator';
import type { NutritionSelection } from '../src/domain/nutrition/nutritionTypes';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const fakeResult = (
  matchType: 'exact_name' | 'exact_normalized' | 'exact_alias' | 'prefix' | 'token' | 'partial',
  score: number,
  isReferenceOnly = false
): any => ({
  food: {
    confidence: { quality_band: 'HIGH', label_vi: 'Cao' }
  },
  matchType,
  score,
  isReferenceOnly
});

console.log('=== NUTRITION ENGINE INTEGRITY TESTS ===');

assert(classifyNutritionCandidate(fakeResult('exact_name', 100)).status === 'AUTO_ACCEPT', 'Exact name auto-accepts');
assert(classifyNutritionCandidate(fakeResult('exact_normalized', 100)).status === 'AUTO_ACCEPT', 'Exact normalized name auto-accepts');
assert(classifyNutritionCandidate(fakeResult('exact_alias', 90)).status === 'AUTO_ACCEPT', 'Exact alias auto-accepts');
assert(classifyNutritionCandidate(fakeResult('prefix', 80)).status === 'USER_CONFIRM', 'Prefix requires user confirmation');
assert(classifyNutritionCandidate(fakeResult('token', 65)).status === 'USER_CONFIRM', 'Token requires user confirmation');
assert(classifyNutritionCandidate(fakeResult('partial', 50)).status === 'USER_CONFIRM', 'Strong partial requires user confirmation');
assert(classifyNutritionCandidate(fakeResult('partial', 40)).status === 'NO_MATCH', 'Weak partial is not accepted');
assert(classifyNutritionCandidate(fakeResult('exact_name', 100, true)).status === 'USER_CONFIRM', 'Reference-only exact never auto-accepts');
assert(classifyNutritionCandidate(fakeResult('prefix', 80, true)).status === 'NO_MATCH', 'Reference-only fuzzy result is rejected');

const selectedL: NutritionSelection = {
  foodId: 'food-x',
  foodName: 'Món X',
  categoryName: 'Món mặn',
  portionSize: 'L',
  portionGrams: 450,
  kcalTypical: 900,
  kcalMin: 820,
  kcalMax: 980,
  confidence: 'high',
  confidenceLabel: 'Cao',
  verificationState: 'VERIFIED',
  calorieStatus: 'CALCULATED',
  source: 'Vietnam Nutrition DB',
  matchType: 'exact_name',
  resolutionStatus: 'AUTO_ACCEPT',
  confirmedByUser: false
};
const persisted = nutritionSelectionToDishFields(selectedL);
assert(persisted.calories === 900, 'Selected L=900 kcal is persisted without recalculation');
assert(persisted.portionSize === 'L' && persisted.portionGrams === 450, 'Selected L portion metadata is persisted');

const reloaded = JSON.parse(JSON.stringify(persisted));
assert(reloaded.calories === 900 && reloaded.portionSize === 'L', 'Serialized/reloaded dish keeps L=900 kcal');

const snapshot = dishNutritionFieldsToMealSnapshot(reloaded, reloaded.calories);
const updatedDbDish = { ...reloaded, calories: 650 };
assert(snapshot.calories === 900 && updatedDbDish.calories === 650, 'History snapshot remains 900 after Nutrition DB/dish changes');

const gram100 = calculatePer100gCalories({
  kcalPer100g: 82,
  grams: 100,
  standardServingG: 400,
  servingKcalMin: 280,
  servingKcalMax: 380
});
assert(gram100?.kcalTypical === 82, '100g calculation uses kcal_per_100g exactly');

const gram250 = calculatePer100gCalories({
  kcalPer100g: 82,
  grams: 250,
  standardServingG: 400,
  servingKcalMin: 280,
  servingKcalMax: 380
});
assert(gram250?.kcalTypical === 205, '250g calculation uses kcal_per_100g × grams / 100');
assert(calculatePer100gCalories({ kcalPer100g: 82, grams: 0 }) === null, '0g is rejected');
assert(calculatePer100gCalories({ kcalPer100g: 82, grams: Number.NaN }) === null, 'NaN grams is rejected');
assert(calculatePer100gCalories({ kcalPer100g: 82, grams: -20 }) === null, 'Negative grams are rejected');
assert(calculatePer100gCalories({ kcalPer100g: 82, grams: 6000 }) === null, 'Extreme gram input is rejected');

if (failures > 0) process.exit(1);
console.log('Nutrition engine integrity tests: PASS');
