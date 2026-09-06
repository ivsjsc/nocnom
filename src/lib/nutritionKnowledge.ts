import {
  nutritionService,
  normalizeSearchQuery,
  type NutritionFood,
  type NutritionPortion,
  type NutritionAddonOption,
  type NutritionAddonKind
} from '../services/nutrition';

export type NutritionConfidence = 'verified' | 'estimated' | 'unknown';

export type NutritionRecord = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  recordType?: string;
  servingG?: number;
  kcalPer100g?: number;
  kcalPerServing?: number;
  kcalMin?: number;
  kcalMax?: number;
  source: string;
  sourceUrl: string;
  confidence: NutritionConfidence;
  locale: string;
  canonicalId?: number;
  isReferenceOnly?: boolean;
};

export type NutritionLookupResult = {
  calories: number;
  record: NutritionRecord;
  basis: 'serving' | '100g';
  portions?: NutritionPortion[];
  kcalMin?: number;
  kcalMax?: number;
};

export const normalizeFoodName = normalizeSearchQuery;

const mapConfidence = (label: string): NutritionConfidence => {
  const norm = (label || '').toLowerCase();
  if (norm.includes('cao') || norm.includes('verified')) return 'verified';
  if (norm.includes('trung bình') || norm.includes('estimated')) return 'estimated';
  return 'estimated';
};

const mapFoodToRecord = (food: NutritionFood): NutritionRecord => {
  return {
    id: food.id,
    canonicalId: food.canonical_id,
    name: food.name,
    aliases: food.aliases || [],
    category: food.classification?.category_vi || food.classification?.source_category || '',
    recordType: food.classification?.domain_id || 'dish',
    servingG: food.serving?.standard_g,
    kcalPer100g: food.energy?.kcal_per_100g,
    kcalPerServing: Math.round(food.energy?.kcal_typical ?? 0),
    kcalMin: food.energy?.kcal_min,
    kcalMax: food.energy?.kcal_max,
    source: food.provenance?.legacy_source_description || food.provenance?.source_role || 'canonical',
    sourceUrl: food.provenance?.source_url || '',
    confidence: mapConfidence(food.confidence?.label_vi),
    locale: food.locale || 'vi-VN',
    isReferenceOnly:
      food.validation?.training_eligibility === 'REFERENCE_ONLY' ||
      food.energy?.calorie_status === 'TABLE_LOOKUP'
  };
};

export const lookupNutrition = async (
  foodName: string
): Promise<NutritionLookupResult | null> => {
  const query = foodName.trim();
  if (!query) return null;

  const results = await nutritionService.searchFoods(query, { limit: 5 });
  if (results.length === 0) return null;

  // Prioritize top matched food
  const topResult = results[0];
  const food = topResult.food;
  const portions = await nutritionService.getPortions(food.id);
  const record = mapFoodToRecord(food);

  return {
    calories: Math.round(food.energy?.kcal_typical ?? 0),
    record,
    basis: 'serving',
    portions,
    kcalMin: food.energy?.kcal_min,
    kcalMax: food.energy?.kcal_max
  };
};

export const clearNutritionCache = () => {
  // no-op, managed by NutritionService singleton
};

export type { NutritionAddonKind, NutritionAddonOption };

export const loadNutritionAddons = async (): Promise<NutritionAddonOption[]> => {
  return nutritionService.getAddons();
};
