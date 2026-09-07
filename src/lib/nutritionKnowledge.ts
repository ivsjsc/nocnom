import {
  nutritionService,
  normalizeSearchQuery,
  type NutritionFood,
  type NutritionPortion,
  type NutritionAddonOption,
  type NutritionAddonKind,
  type NutritionSearchResult,
  resolveNutrition
} from '../services/nutrition';
import type { NutritionSelection } from '../domain/nutrition/nutritionTypes';
import {
  MEAL_ADDON_KIND_LABELS,
  defaultServingUnitForAddonKind,
  type UserMealAddon
} from '../domain/meal/addonNormalizer';

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
  verificationState?: string;
  calorieStatus?: string;
  qualityBand?: string;
};

export type NutritionLookupResult = {
  calories: number;
  record: NutritionRecord;
  basis: 'serving' | '100g';
  portions?: NutritionPortion[];
  kcalMin?: number;
  kcalMax?: number;
  selection?: NutritionSelection;
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
      food.energy?.calorie_status === 'TABLE_LOOKUP' ||
      food.validation?.result === 'NEEDS_REVIEW',
    verificationState: food.energy?.verification_state,
    calorieStatus: food.energy?.calorie_status,
    qualityBand: food.confidence?.quality_band
  };
};

export const createNutritionLookupResult = async (
  result: NutritionSearchResult,
  portionSize: 'S' | 'M' | 'L' = 'M',
  resolutionStatus: 'AUTO_ACCEPT' | 'USER_CONFIRM' = 'USER_CONFIRM',
  confirmedByUser = resolutionStatus === 'USER_CONFIRM'
): Promise<NutritionLookupResult | null> => {
  const portions = await nutritionService.getPortions(result.food.id);
  const selection = await nutritionService.createSelection(
    result,
    portionSize,
    resolutionStatus,
    confirmedByUser
  );
  if (!selection) return null;

  return {
    calories: selection.kcalTypical,
    record: mapFoodToRecord(result.food),
    basis: 'serving',
    portions,
    kcalMin: selection.kcalMin,
    kcalMax: selection.kcalMax,
    selection
  };
};

export const lookupNutrition = async (
  foodName: string
): Promise<NutritionLookupResult | null> => {
  const query = foodName.trim();
  if (!query) return null;

  const resolution = await resolveNutrition(query, 5);
  if (resolution.status !== 'AUTO_ACCEPT' || !resolution.candidate) {
    return null;
  }

  return createNutritionLookupResult(
    resolution.candidate,
    'M',
    'AUTO_ACCEPT',
    false
  );
};

export const clearNutritionCache = () => {
  // no-op, managed by NutritionService singleton
};

export type { NutritionAddonKind, NutritionAddonOption };

export const loadNutritionAddons = async (): Promise<NutritionAddonOption[]> => {
  return nutritionService.getAddons();
};


export const mergeNutritionAddons = (
  base: NutritionAddonOption[],
  custom: UserMealAddon[]
): NutritionAddonOption[] => {
  const customOptions: NutritionAddonOption[] = custom.map(item => ({
    id: item.id,
    kind: item.kind,
    name: item.name,
    category: MEAL_ADDON_KIND_LABELS[item.kind],
    calories: item.calories,
    servingAmount: item.servingAmount,
    servingUnit:
      item.servingUnit ?? defaultServingUnitForAddonKind(item.kind),
    source: 'user',
    confidence: 'Người dùng nhập',
    isReferenceOnly: true
  }));

  const customIds = new Set(customOptions.map(item => item.id));
  return [
    ...customOptions,
    ...base.filter(item => !customIds.has(item.id))
  ];
};
