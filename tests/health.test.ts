import {
  calculateAge,
  calculateBMI,
  calculateBMR,
  calculateBMREstimate,
  calculateCalorieGoal,
  calculateCalorieGoalPlan,
  calculateTDEE,
  calculateTDEEEstimate,
  calculateWaterRequirement,
  getBMICategory,
  getIdealWeightRange
} from '../src/lib/healthUtils';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

console.log('=== HEALTH CALCULATION REGRESSION TESTS ===');

const referenceDate = new Date('2026-09-07T12:00:00Z');
assert(calculateAge('08/09/2000', referenceDate) === 25, 'Age handles birthday not reached');
assert(calculateAge('07/09/2000', referenceDate) === 26, 'Age handles birthday today');
assert(calculateAge('31/02/2000', referenceDate) === null, 'Age rejects impossible dates');
assert(calculateAge('08/09/2027', referenceDate) === null, 'Age rejects future dates');

assert(calculateBMI(60, 165) === 22, 'BMI rounds to one decimal place');
assert(calculateBMI(10, 165) === null, 'BMI rejects out-of-range weight');
assert(getBMICategory(22).status === 'normal', 'Asian reference BMI normal category');
assert(getBMICategory(23).status === 'overweight', 'Asian reference BMI elevated category');
assert(
  getBMICategory(22).referenceSystem === 'ASIA_PACIFIC_2000',
  'BMI exposes the explicit default reference system'
);
assert(
  getBMICategory(24, 'WHO_GLOBAL').status === 'normal',
  'WHO global reference remains separately selectable'
);
assert(
  getBMICategory(22).description.includes('chỉ số sàng lọc'),
  'BMI description is neutral screening language'
);

const ideal = getIdealWeightRange(165);
assert(Boolean(ideal && ideal.min === 50 && ideal.max === 62), 'Reference weight range derives from BMI 18.5–22.9');

const femaleBmr = calculateBMR(60, 165, 25, 'female');
const maleBmr = calculateBMR(60, 165, 25, 'male');
assert(femaleBmr === 1345, 'Female Mifflin-St Jeor BMR is correct');
assert(maleBmr === 1511, 'Male Mifflin-St Jeor BMR is correct');
assert(
  calculateBMREstimate(60, 165, 25, 'female')?.equation === 'Mifflin-St Jeor',
  'BMR exposes equation metadata'
);
assert(calculateBMR(60, 165, 25, '') === null, 'BMR does not guess missing sex');
assert(calculateBMR(60, 165, 25, 'other') === null, 'BMR does not map other sex to male');
assert(calculateBMR(60, 165, 17, 'female') === null, 'Adult BMR equation is not applied to minors');

const tdee = calculateTDEE(femaleBmr, 'moderate');
assert(tdee === 2085, 'TDEE uses the selected activity factor');
assert(
  calculateTDEEEstimate(femaleBmr, 'moderate')?.type === 'estimate',
  'TDEE is explicitly modeled as an estimate'
);
assert(calculateTDEE(femaleBmr, '') === null, 'TDEE does not assume an activity level');
assert(calculateCalorieGoal(tdee, 'maintain') === 2085, 'Maintenance goal equals TDEE');
assert(calculateCalorieGoal(tdee, 'lose') === 1785, 'Weight-loss goal applies -300 kcal');
assert(calculateCalorieGoal(tdee, 'gain') === 2385, 'Weight-gain goal applies +300 kcal');
assert(
  calculateCalorieGoalPlan(tdee, 'lose')?.strategy === 'fixed_300',
  'Calorie goal exposes fixed_300 strategy metadata'
);
assert(calculateCalorieGoal(tdee, '') === null, 'Calorie goal does not assume a user goal');

const water = calculateWaterRequirement(60);
assert(Boolean(water && water.ml === 2100 && water.glasses === 8), 'Water estimate uses 35 ml/kg');
assert(
  Boolean(
    water &&
      water.valueMl === 2100 &&
      water.method === '35ml_per_kg' &&
      water.type === 'estimate'
  ),
  'Water requirement exposes method and estimate metadata'
);
assert(calculateWaterRequirement(0) === null, 'Water estimate rejects invalid weight');

if (failures > 0) {
  console.error(`Health tests failed: ${failures}`);
  process.exit(1);
}

console.log('Health calculation tests: PASS');
