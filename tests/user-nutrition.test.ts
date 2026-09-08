import {
  assessMacroEnergyConsistency,
  calculateRecipeNutrition,
  normalizeUserNutritionInput
} from '../src/domain/nutrition/userNutrition';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

function expectThrow(run: () => unknown, message: string) {
  try {
    run();
    console.error(`[FAIL] ${message}`);
    failures++;
  } catch {
    console.log(`[PASS] ${message}`);
  }
}

console.log('=== USER NUTRITION ARCHITECTURE TESTS ===');

const manual = normalizeUserNutritionInput({
  mode: 'manual',
  calories: 520,
  servingAmount: 1,
  servingUnit: 'portion',
  proteinG: 30,
  carbsG: 60,
  fatG: 18,
  sourceKind: 'nutrition-label',
  sourceUrl: 'https://example.com/label'
});

assert(manual.dataOrigin === 'user-manual', 'Manual entry is isolated as user-manual');
assert(manual.dataStatus === 'user-provided', 'Manual entry is never auto-promoted to verified');
assert(manual.sourceKind === 'nutrition-label', 'Manual source kind is preserved');
assert(manual.macroEnergyKcal === 522, 'Atwater 4-4-9 energy is calculated');
assert(manual.macroEnergyConsistency === 'consistent', 'Near-equal kcal and macro energy is consistent');

expectThrow(
  () =>
    normalizeUserNutritionInput({
      mode: 'manual',
      calories: 500,
      proteinG: 25,
      carbsG: 60
    }),
  'Partial macro entry is rejected instead of inventing missing fat'
);

expectThrow(
  () =>
    normalizeUserNutritionInput({
      mode: 'manual',
      calories: 500,
      sourceUrl: 'javascript:alert(1)'
    }),
  'Non-http nutrition source URL is rejected'
);

const recipe = calculateRecipeNutrition({
  servings: 2,
  ingredients: [
    {
      id: 'rice',
      name: 'Cơm chín',
      amountG: 200,
      kcalPer100g: 130,
      proteinPer100g: 2.7,
      carbsPer100g: 28,
      fatPer100g: 0.3
    },
    {
      id: 'chicken',
      name: 'Ức gà',
      amountG: 100,
      kcalPer100g: 165,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6
    }
  ]
});

assert(recipe.calories === 212.5, 'Recipe energy is summed then divided by servings');
assert(recipe.proteinG === 18.2, 'Recipe protein is calculated per serving');
assert(recipe.carbsG === 28, 'Recipe carbohydrate is calculated per serving');
assert(recipe.fatG === 2.1, 'Recipe fat is calculated per serving');

const incompleteRecipe = calculateRecipeNutrition({
  servings: 1,
  ingredients: [
    {
      id: 'rice',
      name: 'Cơm chín',
      amountG: 200,
      kcalPer100g: 130
    }
  ]
});

assert(incompleteRecipe.calories === 260, 'Recipe can calculate calories from kcal/100g alone');
assert(
  incompleteRecipe.proteinG === undefined &&
    incompleteRecipe.carbsG === undefined &&
    incompleteRecipe.fatG === undefined,
  'Recipe macro remains unknown when any ingredient lacks full macro data'
);

const recipeNormalized = normalizeUserNutritionInput({
  mode: 'recipe',
  sourceNote: 'Công thức cá nhân',
  recipe: {
    servings: 1,
    ingredients: [
      {
        id: 'egg',
        name: 'Trứng',
        amountG: 100,
        kcalPer100g: 143,
        proteinPer100g: 12.6,
        carbsPer100g: 0.7,
        fatPer100g: 9.5
      }
    ]
  }
});

assert(recipeNormalized.dataOrigin === 'user-recipe', 'Recipe entry keeps user-recipe provenance');
assert(recipeNormalized.dataStatus === 'recipe-calculated', 'Recipe is labeled calculated, not verified');
assert(recipeNormalized.sourceKind === 'recipe', 'Recipe source kind is explicit');

const inconsistent = assessMacroEnergyConsistency({
  calories: 1000,
  proteinG: 10,
  carbsG: 10,
  fatG: 10
});
assert(inconsistent.macroEnergyConsistency === 'inconsistent', 'Large kcal/macro mismatch is flagged');

if (failures > 0) {
  process.exit(1);
}

console.log('User nutrition architecture tests: PASS');
