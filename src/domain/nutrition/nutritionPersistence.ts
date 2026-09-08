import type {
  DishNutritionFields,
  MealNutritionSnapshot,
  NutritionSelection
} from './nutritionTypes';
import { normalizeKcalInternal } from './caloriePrecision';

export const nutritionSelectionToDishFields = (
  selection: NutritionSelection
): DishNutritionFields => ({
  calories: normalizeKcalInternal(selection.kcalTypical) ?? 0,
  calorieSource: 'nutrition-db',
  calorieBasis: 'portion',
  portionSize: selection.portionSize,
  portionGrams:
    typeof selection.portionGrams === 'number' &&
    Number.isFinite(selection.portionGrams) &&
    selection.portionGrams > 0
      ? selection.portionGrams
      : undefined,
  servingAmount:
    typeof selection.servingAmount === 'number' &&
    Number.isFinite(selection.servingAmount) &&
    selection.servingAmount > 0
      ? selection.servingAmount
      : selection.portionGrams,
  servingUnit: selection.servingUnit,
  kcalMin:
    typeof selection.kcalMin === 'number' && Number.isFinite(selection.kcalMin)
      ? normalizeKcalInternal(selection.kcalMin) ?? undefined
      : undefined,
  kcalMax:
    typeof selection.kcalMax === 'number' && Number.isFinite(selection.kcalMax)
      ? normalizeKcalInternal(selection.kcalMax) ?? undefined
      : undefined,
  proteinG: selection.proteinG,
  carbsG: selection.carbsG,
  fatG: selection.fatG,
  macroSource: selection.macroSource,
  nutritionRecordId: selection.foodId,
  nutritionCanonicalName: selection.canonicalName,
  nutritionConfidence: selection.confidence,
  nutritionVerificationState: selection.verificationState,
  nutritionCalorieStatus: selection.calorieStatus,
  nutritionValidationResult: selection.validationResult,
  nutritionTrainingEligibility: selection.trainingEligibility,
  nutritionReferenceOnly: selection.isReferenceOnly,
  nutritionSource: selection.source,
  nutritionSourceId: selection.sourceId,
  nutritionSourceUrl: selection.sourceUrl,
  nutritionMatchType: selection.matchType,
  nutritionMatchScore: selection.matchScore
});

export const dishNutritionFieldsToMealSnapshot = (
  fields: Partial<DishNutritionFields>,
  calorieSnapshot: number
): MealNutritionSnapshot => ({
  calories: normalizeKcalInternal(calorieSnapshot) ?? 0,
  calorieSource: fields.calorieSource || 'legacy',
  calorieBasis: fields.calorieBasis || 'serving',
  portionSize: fields.portionSize,
  portionGrams: fields.portionGrams,
  servingAmount: fields.servingAmount,
  servingUnit: fields.servingUnit,
  kcalMin: fields.kcalMin,
  kcalMax: fields.kcalMax,
  proteinG: fields.proteinG,
  carbsG: fields.carbsG,
  fatG: fields.fatG,
  macroSource: fields.macroSource,
  nutritionRecordId: fields.nutritionRecordId,
  nutritionCanonicalName: fields.nutritionCanonicalName,
  nutritionConfidence: fields.nutritionConfidence,
  nutritionVerificationState: fields.nutritionVerificationState,
  nutritionCalorieStatus: fields.nutritionCalorieStatus,
  nutritionValidationResult: fields.nutritionValidationResult,
  nutritionTrainingEligibility: fields.nutritionTrainingEligibility,
  nutritionReferenceOnly: fields.nutritionReferenceOnly,
  nutritionSource: fields.nutritionSource,
  nutritionSourceId: fields.nutritionSourceId,
  nutritionSourceUrl: fields.nutritionSourceUrl,
  nutritionMatchType: fields.nutritionMatchType,
  nutritionMatchScore: fields.nutritionMatchScore
});
