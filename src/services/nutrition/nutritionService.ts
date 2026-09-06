import type {
  CalorieCalculationResult,
  NutritionAddonOption,
  NutritionCategory,
  NutritionDomain,
  NutritionFood,
  NutritionKnowledgeBase,
  NutritionPortion,
  NutritionSearchResult,
  PortionSize
} from './nutritionTypes';
import {
  getCachedDataset,
  getFoodByCanonicalIdSync,
  getFoodByIdSync,
  getFoodsByCategorySync,
  getFoodsByDomainSync,
  getIngredientsSync,
  getPortionsByFoodIdSync,
  getTaxonomySync,
  loadNutritionDataset
} from './nutritionRepository';
import { normalizeSearchQuery, searchNutritionFoods, type SearchOptions } from './nutritionSearch';

export class NutritionService {
  private static instance: NutritionService;
  private addonCatalog: NutritionAddonOption[] | null = null;
  private addonPromise: Promise<NutritionAddonOption[]> | null = null;

  private constructor() {}

  public static getInstance(): NutritionService {
    if (!NutritionService.instance) {
      NutritionService.instance = new NutritionService();
    }
    return NutritionService.instance;
  }

  public async init(): Promise<NutritionKnowledgeBase> {
    return loadNutritionDataset();
  }

  public getDataset(): NutritionKnowledgeBase | null {
    return getCachedDataset();
  }

  public async getFoodById(id: string): Promise<NutritionFood | undefined> {
    if (!getCachedDataset()) {
      await this.init();
    }
    return getFoodByIdSync(id);
  }

  public async getFoodByCanonicalId(canonicalId: number): Promise<NutritionFood | undefined> {
    if (!getCachedDataset()) {
      await this.init();
    }
    return getFoodByCanonicalIdSync(canonicalId);
  }

  public async searchFoods(
    query: string,
    options?: SearchOptions
  ): Promise<NutritionSearchResult[]> {
    return searchNutritionFoods(query, options);
  }

  public async getFoodsByCategory(categoryId: string): Promise<NutritionFood[]> {
    if (!getCachedDataset()) {
      await this.init();
    }
    return getFoodsByCategorySync(categoryId);
  }

  public async getFoodsByDomain(domainId: string): Promise<NutritionFood[]> {
    if (!getCachedDataset()) {
      await this.init();
    }
    return getFoodsByDomainSync(domainId);
  }

  public async getTaxonomyDomains(): Promise<NutritionDomain[]> {
    if (!getCachedDataset()) {
      await this.init();
    }
    return getTaxonomySync()?.domains || [];
  }

  public async getTaxonomyCategories(domainId?: string): Promise<NutritionCategory[]> {
    if (!getCachedDataset()) {
      await this.init();
    }
    const categories = getTaxonomySync()?.categories || [];
    if (!domainId) return categories;
    return categories.filter(cat => cat.domain_id === domainId);
  }

  public async getPortions(foodId: string): Promise<NutritionPortion[]> {
    if (!getCachedDataset()) {
      await this.init();
    }
    return getPortionsByFoodIdSync(foodId);
  }

  public async calculateCalories(
    foodId: string,
    options: { portionSize?: PortionSize; grams?: number } = {}
  ): Promise<CalorieCalculationResult | null> {
    const food = await this.getFoodById(foodId);
    if (!food) return null;

    const isReferenceOnly =
      food.validation?.training_eligibility === 'REFERENCE_ONLY' ||
      food.energy?.calorie_status === 'TABLE_LOOKUP' ||
      food.validation?.result === 'NEEDS_REVIEW';

    // 1. Gram-based calculation
    if (typeof options.grams === 'number' && Number.isFinite(options.grams) && options.grams > 0) {
      const kcalPer100g = food.energy.kcal_per_100g || 0;
      const kcalTypical = Math.round((kcalPer100g * options.grams) / 100);
      const ratio = options.grams / (food.serving?.standard_g || 100);
      const kcalMin = Math.round((food.energy.kcal_min || kcalTypical * 0.85) * ratio);
      const kcalMax = Math.round((food.energy.kcal_max || kcalTypical * 1.15) * ratio);

      return {
        foodId: food.id,
        foodName: food.name,
        kcalTypical,
        kcalMin,
        kcalMax,
        basis: 'grams',
        grams: options.grams,
        confidence: food.confidence.label_vi,
        qualityBand: food.confidence.quality_band,
        isReferenceOnly,
        calorieStatus: food.energy.calorie_status,
        verificationState: food.energy.verification_state
      };
    }

    // 2. Portion-based calculation (S / M / L)
    const size: PortionSize = options.portionSize || 'M';
    const portions = await this.getPortions(foodId);
    const portion = portions.find(p => p.portion_size === size);

    if (portion) {
      return {
        foodId: food.id,
        foodName: food.name,
        kcalTypical: portion.kcal_typical,
        kcalMin: portion.kcal_min,
        kcalMax: portion.kcal_max,
        basis: 'portion',
        portionSize: size,
        grams: portion.portion_g,
        confidence: portion.confidence || food.confidence.label_vi,
        qualityBand: food.confidence.quality_band,
        isReferenceOnly,
        calorieStatus: food.energy.calorie_status,
        verificationState: food.energy.verification_state
      };
    }

    // Fallback to food-level energy
    return {
      foodId: food.id,
      foodName: food.name,
      kcalTypical: food.energy.kcal_typical,
      kcalMin: food.energy.kcal_min,
      kcalMax: food.energy.kcal_max,
      basis: 'portion',
      portionSize: 'M',
      grams: food.serving?.standard_g,
      confidence: food.confidence.label_vi,
      qualityBand: food.confidence.quality_band,
      isReferenceOnly,
      calorieStatus: food.energy.calorie_status,
      verificationState: food.energy.verification_state
    };
  }

  public async getAddons(kind?: 'fruit' | 'drink'): Promise<NutritionAddonOption[]> {
    if (this.addonCatalog) {
      return kind ? this.addonCatalog.filter(a => a.kind === kind) : this.addonCatalog;
    }

    if (this.addonPromise) {
      const items = await this.addonPromise;
      return kind ? items.filter(a => a.kind === kind) : items;
    }

    this.addonPromise = (async () => {
      try {
        const response = await fetch('/data/nutrition/addons.json', {
          cache: 'force-cache'
        });
        if (!response.ok) {
          throw new Error('Failed to load addons catalog');
        }
        const rows = (await response.json()) as NutritionAddonOption[];
        this.addonCatalog = rows;
        return rows;
      } catch (err) {
        console.warn('[NutritionService] Falling back to building addons from dataset', err);
        const dataset = await this.init();
        const fallbackAddons: NutritionAddonOption[] = dataset.foods
          .filter(
            f =>
              f.classification?.domain_id === 'beverage' ||
              f.classification?.domain_id === 'fruit' ||
              f.classification?.category_id === 'beverages' ||
              f.classification?.category_id === 'fruits'
          )
          .map(f => ({
            id: f.id,
            kind:
              f.classification?.domain_id === 'fruit' ||
              f.classification?.category_id === 'fruits'
                ? 'fruit'
                : 'drink',
            name: f.name,
            category: f.classification?.category_vi || f.name,
            calories: Math.round(f.energy.kcal_typical),
            servingG: f.serving?.standard_g,
            kcalMin: f.energy.kcal_min,
            kcalMax: f.energy.kcal_max,
            source: f.provenance?.source_role || 'canonical',
            sourceUrl: f.provenance?.source_url || '',
            confidence: f.confidence.label_vi,
            isReferenceOnly: f.validation?.training_eligibility === 'REFERENCE_ONLY'
          }));
        this.addonCatalog = fallbackAddons;
        return fallbackAddons;
      }
    })();

    const result = await this.addonPromise;
    return kind ? result.filter(a => a.kind === kind) : result;
  }

  public async getIngredients() {
    if (!getCachedDataset()) {
      await this.init();
    }
    return getIngredientsSync();
  }
}

export const nutritionService = NutritionService.getInstance();
export { normalizeSearchQuery };
