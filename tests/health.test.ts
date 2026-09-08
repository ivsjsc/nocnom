import {
  calculateAge,
  calculateBMI,
  calculateBMR,
  calculateBMREstimate,
  calculateCalorieGoal,
  calculateCalorieGoalPlan,
  calculateDailyCalorieTargetFromProfile,
  calculateMacroTargetPlan,
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
assert(calculateAge('08/09/2000', referenceDate) === 25, 'Age handles birthday tomorrow/not reached');
assert(calculateAge('07/09/2000', referenceDate) === 26, 'Age handles birthday today');
assert(calculateAge('29/02/2004', referenceDate) === 22, 'Age accepts valid leap-day birthday');
assert(calculateAge('29/02/2003', referenceDate) === null, 'Age rejects invalid non-leap Feb 29');
assert(calculateAge('08/09/2008', referenceDate) === 17, 'Age 17 remains below adult boundary before birthday');
assert(calculateAge('07/09/2008', referenceDate) === 18, 'Age transitions 17 to 18 on birthday');
assert(calculateAge('07/09/1906', referenceDate) === 120, 'Age supports configured maximum 120');
assert(calculateAge('06/09/1905', referenceDate) === null, 'Age rejects values above configured maximum');
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

const maintainMacros = calculateMacroTargetPlan(2000, 'maintain');
assert(
  Boolean(
    maintainMacros &&
      maintainMacros.proteinG === 100 &&
      maintainMacros.carbsG === 250 &&
      maintainMacros.fatG === 66.7 &&
      maintainMacros.proteinPct === 20 &&
      maintainMacros.carbsPct === 50 &&
      maintainMacros.fatPct === 30
  ),
  'Maintenance macro preset balances a 2,000 kcal target'
);

const loseMacros = calculateMacroTargetPlan(2000, 'lose');
assert(
  Boolean(
    loseMacros &&
      loseMacros.proteinG === 150 &&
      loseMacros.carbsG === 225 &&
      loseMacros.fatG === 55.6 &&
      loseMacros.proteinPct === 30
  ),
  'Weight-loss macro preset raises protein while preserving energy balance'
);

const gainMacros = calculateMacroTargetPlan(2000, 'gain');
assert(
  Boolean(
    gainMacros &&
      gainMacros.proteinG === 125 &&
      gainMacros.carbsG === 250 &&
      gainMacros.fatG === 55.6
  ),
  'Weight-gain macro preset keeps carbohydrate availability higher'
);
assert(
  calculateMacroTargetPlan(2000, '') === null &&
    calculateMacroTargetPlan(null, 'maintain') === null,
  'Macro target does not guess a missing goal or calorie target'
);

const weightedLoseMacros = calculateMacroTargetPlan(1800, 'lose', 60);
assert(
  Boolean(
    weightedLoseMacros &&
      weightedLoseMacros.strategy === 'goal_weight_based' &&
      weightedLoseMacros.proteinG === 108 &&
      weightedLoseMacros.fatG === 48 &&
      weightedLoseMacros.carbsG === 234 &&
      weightedLoseMacros.proteinPerKg === 1.8 &&
      weightedLoseMacros.fatPerKg === 0.8
  ),
  'Weight-loss macro target uses body-weight anchors and fills remaining energy with carbs'
);

const weightedGainMacros = calculateMacroTargetPlan(2400, 'gain', 60);
assert(
  Boolean(
    weightedGainMacros &&
      weightedGainMacros.strategy === 'goal_weight_based' &&
      weightedGainMacros.proteinG === 96 &&
      weightedGainMacros.fatG === 54 &&
      weightedGainMacros.carbsG === 382.5
  ),
  'Weight-gain macro target uses goal-specific protein and fat anchors'
);

const customRatioMacros = calculateMacroTargetPlan(
  2000,
  '',
  null,
  {
    mode: 'ratio',
    proteinPct: 30,
    carbsPct: 40,
    fatPct: 30
  }
);
assert(
  Boolean(
    customRatioMacros &&
      customRatioMacros.strategy === 'custom_ratio' &&
      customRatioMacros.source === 'user-defined' &&
      customRatioMacros.proteinG === 150 &&
      customRatioMacros.carbsG === 200 &&
      customRatioMacros.fatG === 66.7
  ),
  'Custom ratio mode derives grams from the calorie target without requiring a health-goal preset'
);
assert(
  calculateMacroTargetPlan(
    2000,
    'maintain',
    60,
    {
      mode: 'ratio',
      proteinPct: 30,
      carbsPct: 30,
      fatPct: 30
    }
  ) === null,
  'Custom ratio mode rejects ratios that do not total 100%'
);

const customGramMacros = calculateMacroTargetPlan(
  2000,
  '',
  null,
  {
    mode: 'grams',
    proteinG: 120,
    carbsG: 200,
    fatG: 60
  }
);
assert(
  Boolean(
    customGramMacros &&
      customGramMacros.strategy === 'custom_grams' &&
      customGramMacros.source === 'user-defined' &&
      customGramMacros.macroEnergyKcal === 1820 &&
      customGramMacros.calorieDeltaKcal === -180 &&
      customGramMacros.calorieDeltaPct === 9 &&
      customGramMacros.calorieConsistency === 'review'
  ),
  'Custom gram mode preserves explicit gram targets and reports calorie consistency without auto-correction'
);

const gramOnlyMacros = calculateMacroTargetPlan(
  null,
  '',
  null,
  {
    mode: 'grams',
    proteinG: 100,
    carbsG: 200,
    fatG: 50
  }
);
assert(
  Boolean(
    gramOnlyMacros &&
      gramOnlyMacros.calorieTarget === 1650 &&
      gramOnlyMacros.macroEnergyKcal === 1650
  ),
  'Custom gram targets remain usable without an inferred calorie target'
);
assert(
  calculateMacroTargetPlan(
    null,
    '',
    null,
    {
      mode: 'grams',
      proteinG: 0,
      carbsG: 0,
      fatG: 0
    }
  ) === null,
  'All-zero custom gram target is rejected'
);

assert(
  calculateDailyCalorieTargetFromProfile({
    weightKg: 60,
    heightCm: 165,
    dateOfBirth: '08/09/2000',
    gender: 'female',
    activityLevel: 'moderate',
    healthGoal: 'maintain',
    now: referenceDate
  }) === 2085,
  'Daily calorie target derives from the complete health profile'
);
assert(
  calculateDailyCalorieTargetFromProfile({
    weightKg: 60,
    heightCm: 165,
    dateOfBirth: '07/09/2000',
    gender: 'female',
    activityLevel: '',
    healthGoal: 'maintain',
    now: referenceDate
  }) === null,
  'Daily calorie target does not invent a goal when profile data is incomplete'
);

const water = calculateWaterRequirement(60);
assert(Boolean(water && water.ml === 2100 && water.glasses === 8), 'Water estimate uses 35 ml/kg');
assert(
  Boolean(
    water &&
      water.valueMl === 2100 &&
      water.method === '35_ml_per_kg' &&
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
