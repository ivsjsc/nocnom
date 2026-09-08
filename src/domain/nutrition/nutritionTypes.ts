import type {
  MacroEnergyConsistency,
  NutritionDataOrigin,
  NutritionDataStatus,
  NutritionRecipeSnapshot,
  NutritionSourceKind
} from './userNutrition';

export type CalorieSource =
  | 'manual'
  | 'nutrition-db'
  | 'category-fallback'
  | 'legacy';

export type NutritionConfidenceLevel =
  | 'high'
  | 'medium'
  | 'low'
  | 'reference'
  | 'unknown';

export type NutritionResolutionStatus =
  | 'AUTO_ACCEPT'
  | 'USER_CONFIRM'
  | 'NO_MATCH';

export type NutritionServingUnit = 'g' | 'ml' | 'portion';

export type NutritionSelection = {
  foodId: string;
  canonicalName: string;
  foodName: string;
  categoryName: string;
  portionSize: 'S' | 'M' | 'L';
  portionGrams?: number;
  servingAmount?: number;
  servingUnit?: NutritionServingUnit;
  kcalTypical: number;
  kcalMin?: number;
  kcalMax?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  macroSource?: 'nutrition-db' | 'manual' | 'recipe';
  confidence: NutritionConfidenceLevel;
  confidenceLabel: string;
  verificationState: string;
  calorieStatus: string;
  validationResult?: string;
  trainingEligibility?: string;
  isReferenceOnly: boolean;
  source: string;
  sourceId?: string;
  sourceUrl?: string;
  matchType: string;
  matchScore?: number;
  resolutionStatus: Exclude<NutritionResolutionStatus, 'NO_MATCH'>;
  confirmedByUser: boolean;
};

export type DishNutritionFields = {
  calories: number;
  calorieSource: CalorieSource;
  calorieBasis: 'portion' | 'grams' | 'category' | 'serving' | '100g';
  portionSize?: 'S' | 'M' | 'L';
  portionGrams?: number;
  servingAmount?: number;
  servingUnit?: NutritionServingUnit;
  kcalMin?: number;
  kcalMax?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  macroSource?: 'nutrition-db' | 'manual' | 'recipe';
  nutritionRecordId?: string;
  nutritionCanonicalName?: string;
  nutritionConfidence?: NutritionConfidenceLevel | 'verified' | 'estimated';
  nutritionVerificationState?: string;
  nutritionCalorieStatus?: string;
  nutritionValidationResult?: string;
  nutritionTrainingEligibility?: string;
  nutritionReferenceOnly?: boolean;
  nutritionSource?: string;
  nutritionSourceId?: string;
  nutritionSourceUrl?: string;
  nutritionMatchType?: string;
  nutritionMatchScore?: number;
  nutritionDataOrigin?: NutritionDataOrigin;
  nutritionDataStatus?: NutritionDataStatus;
  nutritionSourceKind?: NutritionSourceKind;
  nutritionSourceNote?: string;
  userOverrideOfNutritionRecordId?: string;
  macroEnergyKcal?: number;
  macroEnergyDeltaPct?: number;
  macroEnergyConsistency?: MacroEnergyConsistency;
  nutritionRecipe?: NutritionRecipeSnapshot;
};

export type MealNutritionSnapshot = Pick<
  DishNutritionFields,
  | 'calories'
  | 'calorieSource'
  | 'calorieBasis'
  | 'portionSize'
  | 'portionGrams'
  | 'servingAmount'
  | 'servingUnit'
  | 'kcalMin'
  | 'kcalMax'
  | 'proteinG'
  | 'carbsG'
  | 'fatG'
  | 'macroSource'
  | 'nutritionRecordId'
  | 'nutritionCanonicalName'
  | 'nutritionConfidence'
  | 'nutritionVerificationState'
  | 'nutritionCalorieStatus'
  | 'nutritionValidationResult'
  | 'nutritionTrainingEligibility'
  | 'nutritionReferenceOnly'
  | 'nutritionSource'
  | 'nutritionSourceId'
  | 'nutritionSourceUrl'
  | 'nutritionMatchType'
  | 'nutritionMatchScore'
  | 'nutritionDataOrigin'
  | 'nutritionDataStatus'
  | 'nutritionSourceKind'
  | 'nutritionSourceNote'
  | 'userOverrideOfNutritionRecordId'
  | 'macroEnergyKcal'
  | 'macroEnergyDeltaPct'
  | 'macroEnergyConsistency'
  | 'nutritionRecipe'
>;
