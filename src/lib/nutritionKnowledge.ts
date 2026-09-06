export type NutritionConfidence = 'verified' | 'estimated' | 'unknown';

export type NutritionRecord = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  servingG?: number;
  kcalPer100g?: number;
  kcalPerServing?: number;
  source: string;
  sourceUrl: string;
  confidence: NutritionConfidence;
  locale: string;
};

export type NutritionLookupResult = {
  calories: number;
  record: NutritionRecord;
  basis: 'serving' | '100g';
};

type NutritionShard = Record<string, NutritionRecord>;

const shardCache = new Map<string, Promise<NutritionShard>>();

export const normalizeFoodName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const hashKey = (value: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
};

const getShardKey = (normalizedName: string) =>
  (hashKey(normalizedName) & 0xff).toString(16).padStart(2, '0');

const loadShard = (shardKey: string): Promise<NutritionShard> => {
  const cached = shardCache.get(shardKey);
  if (cached) return cached;

  const request = fetch('/data/nutrition/shards/' + shardKey + '.json', {
    cache: 'force-cache'
  })
    .then(async response => {
      if (response.status === 404) return {};
      if (!response.ok) {
        throw new Error('Nutrition shard request failed: HTTP ' + response.status);
      }
      return response.json() as Promise<NutritionShard>;
    })
    .catch(error => {
      console.warn('[nutrition] Unable to load shard ' + shardKey, error);
      return {};
    });

  shardCache.set(shardKey, request);
  return request;
};

export const lookupNutrition = async (
  foodName: string
): Promise<NutritionLookupResult | null> => {
  const normalized = normalizeFoodName(foodName);
  if (!normalized) return null;

  const shard = await loadShard(getShardKey(normalized));
  const record = shard[normalized];
  if (!record) return null;

  if (
    typeof record.kcalPerServing === 'number' &&
    Number.isFinite(record.kcalPerServing) &&
    record.kcalPerServing >= 0
  ) {
    return {
      calories: Math.round(record.kcalPerServing),
      record,
      basis: 'serving'
    };
  }

  if (
    typeof record.kcalPer100g === 'number' &&
    Number.isFinite(record.kcalPer100g) &&
    record.kcalPer100g >= 0
  ) {
    return {
      calories: Math.round(record.kcalPer100g),
      record,
      basis: '100g'
    };
  }

  return null;
};

export const clearNutritionCache = () => {
  shardCache.clear();
};
