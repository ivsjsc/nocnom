import type {
  NutritionSearchResult,
  SearchMatchType
} from './nutritionTypes';
import { searchNutritionFoods } from './nutritionSearch';
import type {
  NutritionConfidenceLevel,
  NutritionResolutionStatus
} from '../../domain/nutrition/nutritionTypes';

export type NutritionResolutionReason =
  | 'TRUSTED_EXACT_MATCH'
  | 'FUZZY_MATCH_REQUIRES_CONFIRMATION'
  | 'REFERENCE_DATA_REQUIRES_CONFIRMATION'
  | 'LOW_CONFIDENCE_MATCH'
  | 'NO_CANDIDATE';

export type NutritionResolution = {
  status: NutritionResolutionStatus;
  candidate: NutritionSearchResult | null;
  alternatives: NutritionSearchResult[];
  reason: NutritionResolutionReason;
};

const AUTO_MATCH_TYPES: ReadonlySet<SearchMatchType> = new Set([
  'exact_name',
  'exact_normalized',
  'exact_alias'
]);

const CONFIRM_MATCH_TYPES: ReadonlySet<SearchMatchType> = new Set([
  'prefix',
  'token'
]);

export const nutritionConfidenceLevel = (
  result: NutritionSearchResult
): NutritionConfidenceLevel => {
  if (result.isReferenceOnly) return 'reference';

  const band = result.food.confidence?.quality_band;
  if (band === 'HIGH' || band === 'MEDIUM_HIGH') return 'high';
  if (band === 'MEDIUM') return 'medium';
  if (band === 'LOW_MEDIUM' || band === 'LOW') return 'low';
  return 'unknown';
};

export const classifyNutritionCandidate = (
  result: NutritionSearchResult | null
): {
  status: NutritionResolutionStatus;
  reason: NutritionResolutionReason;
} => {
  if (!result) {
    return { status: 'NO_MATCH', reason: 'NO_CANDIDATE' };
  }

  if (result.isReferenceOnly) {
    return {
      status: AUTO_MATCH_TYPES.has(result.matchType) ? 'USER_CONFIRM' : 'NO_MATCH',
      reason: 'REFERENCE_DATA_REQUIRES_CONFIRMATION'
    };
  }

  if (AUTO_MATCH_TYPES.has(result.matchType)) {
    return { status: 'AUTO_ACCEPT', reason: 'TRUSTED_EXACT_MATCH' };
  }

  if (CONFIRM_MATCH_TYPES.has(result.matchType)) {
    return {
      status: 'USER_CONFIRM',
      reason: 'FUZZY_MATCH_REQUIRES_CONFIRMATION'
    };
  }

  if (result.matchType === 'partial' && result.score >= 50) {
    return {
      status: 'USER_CONFIRM',
      reason: 'LOW_CONFIDENCE_MATCH'
    };
  }

  return { status: 'NO_MATCH', reason: 'LOW_CONFIDENCE_MATCH' };
};

export const resolveNutrition = async (
  query: string,
  limit = 5
): Promise<NutritionResolution> => {
  const results = await searchNutritionFoods(query, { limit });
  const candidate = results[0] || null;
  const decision = classifyNutritionCandidate(candidate);

  return {
    ...decision,
    candidate,
    alternatives: results.slice(1, Math.min(limit, 4))
  };
};
