import type {
  NutritionFood,
  NutritionKnowledgeBase,
  NutritionSearchResult,
  SearchMatchType
} from './nutritionTypes';
import {
  getCachedDataset,
  getFoodByIdSync,
  getPortionsByFoodIdSync,
  loadNutritionDataset
} from './nutritionRepository';

export const normalizeSearchQuery = (value: string): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export type SearchOptions = {
  domainId?: string;
  categoryId?: string;
  limit?: number;
};

const createSearchResult = (
  food: NutritionFood,
  matchType: SearchMatchType,
  score: number,
  matchedAlias?: string
): NutritionSearchResult => {
  const portions = getPortionsByFoodIdSync(food.id);
  const portionM = portions.find(p => p.portion_size === 'M') || portions[0];

  const isReferenceOnly =
    food.validation?.training_eligibility === 'REFERENCE_ONLY' ||
    food.energy?.calorie_status === 'TABLE_LOOKUP' ||
    food.validation?.result === 'NEEDS_REVIEW';

  return {
    food,
    matchType,
    score,
    matchedAlias,
    portionM,
    confidenceLabel: food.confidence?.label_vi || 'Trung bình',
    isReferenceOnly
  };
};

export const searchNutritionFoods = async (
  query: string,
  options: SearchOptions = {}
): Promise<NutritionSearchResult[]> => {
  let dataset = getCachedDataset();
  if (!dataset) {
    dataset = await loadNutritionDataset();
  }

  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return [];

  const { domainId, categoryId, limit = 20 } = options;
  const resultsMap = new Map<string, NutritionSearchResult>();

  const matchesFilter = (food: NutritionFood): boolean => {
    if (domainId && food.classification?.domain_id !== domainId) return false;
    if (categoryId && food.classification?.category_id !== categoryId) return false;
    return true;
  };

  // 1. Exact normalized name via indexes.name_normalized_to_id
  const exactNameFoodId = dataset.indexes?.name_normalized_to_id?.[normalizedQuery];
  if (exactNameFoodId) {
    const food = getFoodByIdSync(exactNameFoodId);
    if (food && matchesFilter(food)) {
      const matchType: SearchMatchType =
        food.name.toLowerCase() === query.toLowerCase().trim()
          ? 'exact_name'
          : 'exact_normalized';
      resultsMap.set(food.id, createSearchResult(food, matchType, 100));
    }
  }

  // 2. Exact alias via indexes.alias_normalized_to_ids
  const exactAliasFoodIds = dataset.indexes?.alias_normalized_to_ids?.[normalizedQuery];
  if (Array.isArray(exactAliasFoodIds)) {
    for (const foodId of exactAliasFoodIds) {
      if (resultsMap.has(foodId)) continue;
      const food = getFoodByIdSync(foodId);
      if (food && matchesFilter(food)) {
        resultsMap.set(
          food.id,
          createSearchResult(food, 'exact_alias', 90, normalizedQuery)
        );
      }
    }
  }

  // 3. Scan for Prefix, Token, and Partial matches across foods
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  for (const food of dataset.foods) {
    if (resultsMap.has(food.id)) continue;
    if (!matchesFilter(food)) continue;

    const normName = food.normalized_name || normalizeSearchQuery(food.name);
    const aliases = food.normalized_aliases || (food.aliases || []).map(normalizeSearchQuery);

    // 3a. Prefix match on food name
    if (normName.startsWith(normalizedQuery)) {
      resultsMap.set(food.id, createSearchResult(food, 'prefix', 80));
      continue;
    }

    // 3b. Prefix match on any alias
    const matchedPrefixAlias = aliases.find(a => a.startsWith(normalizedQuery));
    if (matchedPrefixAlias) {
      resultsMap.set(food.id, createSearchResult(food, 'prefix', 75, matchedPrefixAlias));
      continue;
    }

    // 3c. Token match (all query tokens exist in food name or any alias)
    const allQueryTokensInName = queryTokens.every(tok => normName.includes(tok));
    if (allQueryTokensInName) {
      resultsMap.set(food.id, createSearchResult(food, 'token', 65));
      continue;
    }

    const matchedTokenAlias = aliases.find(a => queryTokens.every(tok => a.includes(tok)));
    if (matchedTokenAlias) {
      resultsMap.set(food.id, createSearchResult(food, 'token', 60, matchedTokenAlias));
      continue;
    }

    // 3d. Partial substring match
    if (normName.includes(normalizedQuery)) {
      resultsMap.set(food.id, createSearchResult(food, 'partial', 50));
      continue;
    }

    const matchedPartialAlias = aliases.find(a => a.includes(normalizedQuery));
    if (matchedPartialAlias) {
      resultsMap.set(food.id, createSearchResult(food, 'partial', 40, matchedPartialAlias));
    }
  }

  const results = Array.from(resultsMap.values());

  // Rank by score descending, then length closer to query, then name
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const lenA = a.food.normalized_name.length;
    const lenB = b.food.normalized_name.length;
    const diffA = Math.abs(lenA - normalizedQuery.length);
    const diffB = Math.abs(lenB - normalizedQuery.length);
    if (diffA !== diffB) return diffA - diffB;
    return a.food.name.localeCompare(b.food.name, 'vi');
  });

  return results.slice(0, limit);
};
