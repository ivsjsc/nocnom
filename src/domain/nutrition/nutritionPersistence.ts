import type {
  DishNutritionFields,
  MealNutritionSnapshot,
  NutritionSelection
} from './nutritionTypes';

export const nutritionSelectionToDishFields = (
  selection: NutritionSelection
): DishNutritionFields => ({
  calories: Math.max(0, Math.round(selection.kcalTypical)),
  calorieSource: 'nutrition-db',
  calorieBasis: 'portion',
  portionSize: selection.portionSize,
  portionGrams:
    typeof selection.portionGrams === 'number' &&
    Number.isFinite(selection.portionGrams) &&
    selection.portionGrams > 0
      ? selection.portionGrams
      : undefined,
  kcalMin:
    typeof selection.kcalMin === 'number' && Number.isFinite(selection.kcalMin)
      ? Math.max(0, Math.round(selection.kcalMin))
      : undefined,
  kcalMax:
    typeof selection.kcalMax === 'number' && Number.isFinite(selection.kcalMax)
      ? Math.max(0, Math.round(selection.kcalMax))
      : undefined,
  nutritionRecordId: selection.foodId,
  nutritionConfidence: selection.confidence,
  nutritionVerificationState: selection.verificationState,
  nutritionSource: selection.source,
  nutritionSourceUrl: selection.sourceUrl,
  nutritionMatchType: selection.matchType
});

export const dishNutritionFieldsToMealSnapshot = (
  fields: Partial<DishNutritionFields>,
  calorieSnapshot: number
): MealNutritionSnapshot => ({
  calories: Math.max(0, Math.round(calorieSnapshot)),
  calorieSource: fields.calorieSource || 'legacy',
  calorieBasis: fields.calorieBasis || 'serving',
  portionSize: fields.portionSize,
  portionGrams: fields.portionGrams,
  kcalMin: fields.kcalMin,
  kcalMax: fields.kcalMax,
  nutritionRecordId: fields.nutritionRecordId,
  nutritionConfidence: fields.nutritionConfidence,
  nutritionVerificationState: fields.nutritionVerificationState,
  nutritionSource: fields.nutritionSource,
  nutritionSourceUrl: fields.nutritionSourceUrl,
  nutritionMatchType: fields.nutritionMatchType
});
