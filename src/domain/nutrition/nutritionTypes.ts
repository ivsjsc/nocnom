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

export type NutritionSelection = {
  foodId: string;
  foodName: string;
  categoryName: string;
  portionSize: 'S' | 'M' | 'L';
  portionGrams?: number;
  kcalTypical: number;
  kcalMin?: number;
  kcalMax?: number;
  confidence: NutritionConfidenceLevel;
  confidenceLabel: string;
  verificationState: string;
  calorieStatus: string;
  source: string;
  sourceUrl?: string;
  matchType: string;
  resolutionStatus: Exclude<NutritionResolutionStatus, 'NO_MATCH'>;
  confirmedByUser: boolean;
};

export type DishNutritionFields = {
  calories: number;
  calorieSource: CalorieSource;
  calorieBasis: 'portion' | 'grams' | 'category' | 'serving' | '100g';
  portionSize?: 'S' | 'M' | 'L';
  portionGrams?: number;
  kcalMin?: number;
  kcalMax?: number;
  nutritionRecordId?: string;
  nutritionConfidence?: NutritionConfidenceLevel | 'verified' | 'estimated';
  nutritionVerificationState?: string;
  nutritionSource?: string;
  nutritionSourceUrl?: string;
  nutritionMatchType?: string;
};

export type MealNutritionSnapshot = Pick<
  DishNutritionFields,
  | 'calories'
  | 'calorieSource'
  | 'calorieBasis'
  | 'portionSize'
  | 'portionGrams'
  | 'kcalMin'
  | 'kcalMax'
  | 'nutritionRecordId'
  | 'nutritionConfidence'
  | 'nutritionVerificationState'
  | 'nutritionSource'
  | 'nutritionSourceUrl'
  | 'nutritionMatchType'
>;
