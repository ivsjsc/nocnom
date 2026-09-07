export type PortionSize = 'S' | 'M' | 'L';

export type CalorieStatus = 'CALCULATED' | 'ESTIMATED' | 'TABLE_LOOKUP';
export type VerificationState = 'NOT_INDEPENDENTLY_VERIFIED' | 'TABLE_LOOKUP_NOT_INDEPENDENTLY_VERIFIED' | 'VERIFIED';
export type QualityBand = 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH';
export type TrainingEligibility = 'REFERENCE_ONLY' | 'TRAINING_CANDIDATE';

export type NutritionDomain = {
  id: string;
  label_vi: string;
  count: number;
  category_ids: string[];
  food_ids: string[];
};

export type NutritionCategory = {
  id: string;
  label_vi: string;
  domain_id: string;
  count: number;
  food_ids: string[];
};

export type NutritionTaxonomy = {
  domains: NutritionDomain[];
  categories: NutritionCategory[];
};

export type NutritionFoodClassification = {
  domain_id: string;
  domain_vi: string;
  category_id: string;
  category_vi: string;
  source_category?: string;
};

export type NutritionFoodServing = {
  standard_g: number;
  description?: string;
  scaling: Record<PortionSize, number>;
  portion_ids: string[];
};

export type NutritionFoodEnergy = {
  unit: string;
  kcal_per_100g: number;
  kcal_min: number;
  kcal_typical: number;
  kcal_max: number;
  calorie_status: CalorieStatus;
  verification_state: VerificationState;
};

export type NutritionFoodConfidence = {
  label_vi: string;
  quality_band: QualityBand;
};

export type NutritionFoodEstimation = {
  calculation_method?: string;
  evidence_basis?: string;
  composition_basis?: string;
  cooking_method?: string;
  visual_cues?: string;
};

export type NutritionFoodProvenance = {
  source_url?: string;
  source_role?: string;
  direct_dish_measurement?: boolean;
  legacy_source_description?: string;
  legacy_source_type?: string;
};

export type NutritionFoodValidation = {
  result: string;
  audit_severity?: string | null;
  training_eligibility: TrainingEligibility;
  reason?: string;
};

export type NutritionFood = {
  id: string;
  canonical_id: number;
  name: string;
  normalized_name: string;
  aliases: string[];
  normalized_aliases: string[];
  locale: string;
  classification: NutritionFoodClassification;
  serving: NutritionFoodServing;
  energy: NutritionFoodEnergy;
  confidence: NutritionFoodConfidence;
  estimation?: NutritionFoodEstimation;
  provenance?: NutritionFoodProvenance;
  validation?: NutritionFoodValidation;
  audit_flags?: string[];
  notes?: string;
};

export type NutritionPortion = {
  id: string;
  record_id: string;
  food_id: string;
  canonical_id: number;
  dish_name: string;
  category_source?: string;
  portion_size: PortionSize;
  label_vi: string;
  factor_vs_standard: number;
  portion_g: number;
  kcal_min: number;
  kcal_typical: number;
  kcal_max: number;
  kcal_per_100g: number;
  confidence: string;
  source_url?: string;
  evidence_basis?: string;
  training_eligibility?: TrainingEligibility;
  notes?: string;
};

export type NutritionIngredient = {
  id: string;
  name: string;
  normalized_name?: string;
  energy?: {
    kcal_per_100g?: number;
  };
  [key: string]: unknown;
};

export type NutritionIndexes = {
  normalization?: {
    version: number;
    rule: string;
  };
  canonical_id_to_id: Record<string, string>;
  id_to_canonical_id: Record<string, number>;
  name_normalized_to_id: Record<string, string>;
  alias_normalized_to_ids: Record<string, string[]>;
  by_category: Record<string, string[]>;
  by_domain: Record<string, string[]>;
  by_calorie_status?: Record<string, string[]>;
  needs_review_ids?: string[];
  reference_only_ids?: string[];
};

export type NutritionKnowledgeBase = {
  schema: string;
  schema_version: string;
  dataset_version: string;
  locale: string;
  database_name: string;
  validation_status: string;
  purpose?: string;
  statistics: {
    foods: number;
    portions: number;
    ingredients: number;
    training_examples?: number;
    domains: number;
    categories: number;
    needs_review?: number;
    reference_only?: number;
    calorie_status?: Record<string, number>;
    verification_state?: Record<string, number>;
    validation_result?: Record<string, number>;
    training_eligibility?: Record<string, number>;
    confidence_bands?: Record<string, number>;
  };
  taxonomy: NutritionTaxonomy;
  foods: NutritionFood[];
  portions: NutritionPortion[];
  ingredients: NutritionIngredient[];
  indexes: NutritionIndexes;
  [key: string]: unknown;
};

export type SearchMatchType =
  | 'exact_name'
  | 'exact_normalized'
  | 'exact_alias'
  | 'prefix'
  | 'token'
  | 'partial';

export type NutritionSearchResult = {
  food: NutritionFood;
  matchType: SearchMatchType;
  score: number;
  matchedAlias?: string;
  portionM?: NutritionPortion;
  confidenceLabel: string;
  isReferenceOnly: boolean;
};

export type CalorieCalculationResult = {
  foodId: string;
  foodName: string;
  kcalTypical: number;
  kcalMin: number;
  kcalMax: number;
  basis: 'portion' | 'grams';
  portionSize?: PortionSize;
  grams?: number;
  confidence: string;
  qualityBand: QualityBand;
  isReferenceOnly: boolean;
  calorieStatus: CalorieStatus;
  verificationState: VerificationState;
};

export type NutritionAddonKind = 'fruit' | 'drink' | 'side' | 'dessert';

export type NutritionAddonOption = {
  id: string;
  kind: NutritionAddonKind;
  name: string;
  category: string;
  calories: number;
  servingG?: number;
  servingAmount?: number;
  servingUnit?: 'g' | 'ml' | 'portion';
  kcalMin?: number;
  kcalMax?: number;
  source?: string;
  sourceUrl?: string;
  confidence: string;
  isReferenceOnly: boolean;
};
