import type {
  NutritionFood,
  NutritionIngredient,
  NutritionKnowledgeBase,
  NutritionPortion,
  NutritionTaxonomy
} from './nutritionTypes';

let datasetPromise: Promise<NutritionKnowledgeBase> | null = null;
let cachedDataset: NutritionKnowledgeBase | null = null;

const foodByIdMap = new Map<string, NutritionFood>();
const foodByCanonicalIdMap = new Map<number, NutritionFood>();
const portionsByFoodIdMap = new Map<string, NutritionPortion[]>();
const portionByIdMap = new Map<string, NutritionPortion>();
const foodsByCategoryMap = new Map<string, NutritionFood[]>();
const foodsByDomainMap = new Map<string, NutritionFood[]>();

const validateSchema = (data: unknown): data is NutritionKnowledgeBase => {
  if (!data || typeof data !== 'object') return false;
  const kb = data as Partial<NutritionKnowledgeBase>;

  if (kb.schema !== 'nocnom.nutrition.knowledge') {
    console.error('[NutritionRepository] Invalid schema:', kb.schema);
    return false;
  }

  if (!Array.isArray(kb.foods) || kb.foods.length === 0) {
    console.error('[NutritionRepository] Missing or empty foods array');
    return false;
  }

  if (!Array.isArray(kb.portions) || kb.portions.length === 0) {
    console.error('[NutritionRepository] Missing or empty portions array');
    return false;
  }

  if (!kb.taxonomy || !Array.isArray(kb.taxonomy.domains) || !Array.isArray(kb.taxonomy.categories)) {
    console.error('[NutritionRepository] Invalid taxonomy structure');
    return false;
  }

  return true;
};

const populateLookupCaches = (dataset: NutritionKnowledgeBase) => {
  foodByIdMap.clear();
  foodByCanonicalIdMap.clear();
  portionsByFoodIdMap.clear();
  portionByIdMap.clear();
  foodsByCategoryMap.clear();
  foodsByDomainMap.clear();

  dataset.foods.forEach(food => {
    foodByIdMap.set(food.id, food);
    if (typeof food.canonical_id === 'number') {
      foodByCanonicalIdMap.set(food.canonical_id, food);
    }

    const catId = food.classification?.category_id;
    if (catId) {
      const list = foodsByCategoryMap.get(catId) || [];
      list.push(food);
      foodsByCategoryMap.set(catId, list);
    }

    const domId = food.classification?.domain_id;
    if (domId) {
      const list = foodsByDomainMap.get(domId) || [];
      list.push(food);
      foodsByDomainMap.set(domId, list);
    }
  });

  dataset.portions.forEach(portion => {
    portionByIdMap.set(portion.id, portion);
    const list = portionsByFoodIdMap.get(portion.food_id) || [];
    list.push(portion);
    portionsByFoodIdMap.set(portion.food_id, list);
  });
};

export const loadNutritionDataset = async (): Promise<NutritionKnowledgeBase> => {
  if (cachedDataset) {
    return cachedDataset;
  }

  if (datasetPromise) {
    return datasetPromise;
  }

  datasetPromise = (async () => {
    try {
      const response = await fetch('/data/nutrition/nocnom_nutrition_knowledge.json', {
        cache: 'force-cache'
      });

      if (!response.ok) {
        throw new Error(`Failed to load nutrition dataset: HTTP ${response.status}`);
      }

      const raw = await response.json();
      if (!validateSchema(raw)) {
        throw new Error('Nutrition knowledge base failed schema validation');
      }

      cachedDataset = raw;
      populateLookupCaches(cachedDataset);
      return cachedDataset;
    } catch (error) {
      console.error('[NutritionRepository] Error loading dataset:', error);
      datasetPromise = null;
      throw error;
    }
  })();

  return datasetPromise;
};

export const initNutritionDatasetSync = (dataset: NutritionKnowledgeBase) => {
  if (validateSchema(dataset)) {
    cachedDataset = dataset;
    populateLookupCaches(dataset);
    datasetPromise = Promise.resolve(dataset);
  }
};

export const getCachedDataset = (): NutritionKnowledgeBase | null => cachedDataset;

export const getFoodByIdSync = (id: string): NutritionFood | undefined =>
  foodByIdMap.get(id);

export const getFoodByCanonicalIdSync = (canonicalId: number): NutritionFood | undefined =>
  foodByCanonicalIdMap.get(canonicalId);

export const getPortionsByFoodIdSync = (foodId: string): NutritionPortion[] =>
  portionsByFoodIdMap.get(foodId) || [];

export const getPortionByIdSync = (portionId: string): NutritionPortion | undefined =>
  portionByIdMap.get(portionId);

export const getFoodsByCategorySync = (categoryId: string): NutritionFood[] =>
  foodsByCategoryMap.get(categoryId) || [];

export const getFoodsByDomainSync = (domainId: string): NutritionFood[] =>
  foodsByDomainMap.get(domainId) || [];

export const getTaxonomySync = (): NutritionTaxonomy | null =>
  cachedDataset ? cachedDataset.taxonomy : null;

export const getIngredientsSync = (): NutritionIngredient[] =>
  cachedDataset ? cachedDataset.ingredients : [];
