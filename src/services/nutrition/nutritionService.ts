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
import type {
  NutritionResolutionStatus,
  NutritionSelection
} from '../../domain/nutrition/nutritionTypes';
import { calculatePer100gCalories } from '../../domain/nutrition/calorieCalculator';
import { nutritionConfidenceLevel } from './nutritionResolver';
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

    // 1. Gram-based calculation. The food-level range is on the standard
    // serving basis, while the typical value comes from kcal/100g.
    if (typeof options.grams === 'number') {
      const gramResult = calculatePer100gCalories({
        kcalPer100g: food.energy.kcal_per_100g,
        grams: options.grams,
        standardServingG: food.serving?.standard_g,
        servingKcalMin: food.energy.kcal_min,
        servingKcalMax: food.energy.kcal_max
      });
      if (!gramResult) return null;

      return {
        foodId: food.id,
        foodName: food.name,
        kcalTypical: gramResult.kcalTypical,
        kcalMin: gramResult.kcalMin,
        kcalMax: gramResult.kcalMax,
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

  public async createSelection(
    result: NutritionSearchResult,
    portionSize: PortionSize,
    resolutionStatus: Exclude<NutritionResolutionStatus, 'NO_MATCH'>,
    confirmedByUser: boolean
  ): Promise<NutritionSelection | null> {
    if (result.isReferenceOnly && resolutionStatus === 'AUTO_ACCEPT') {
      return null;
    }

    const calculation = await this.calculateCalories(result.food.id, {
      portionSize
    });
    if (!calculation) return null;

    const food = result.food;
    const servingUnit =
      food.classification?.domain_id === 'beverage' ||
      food.classification?.category_id === 'beverages'
        ? 'ml'
        : 'g';

    return {
      foodId: food.id,
      canonicalName: food.name,
      foodName: food.name,
      categoryName:
        food.classification?.category_vi ||
        food.classification?.source_category ||
        '',
      portionSize,
      portionGrams: calculation.grams,
      servingAmount: calculation.grams,
      servingUnit,
      kcalTypical: calculation.kcalTypical,
      kcalMin: calculation.kcalMin,
      kcalMax: calculation.kcalMax,
      confidence: nutritionConfidenceLevel(result),
      confidenceLabel: result.confidenceLabel,
      verificationState: calculation.verificationState,
      calorieStatus: calculation.calorieStatus,
      validationResult: food.validation?.result,
      trainingEligibility: food.validation?.training_eligibility,
      isReferenceOnly: result.isReferenceOnly,
      source:
        food.provenance?.legacy_source_description ||
        food.provenance?.source_role ||
        'Nutrition Knowledge Base',
      sourceId: food.provenance?.source_role || 'nutrition-kb',
      sourceUrl: food.provenance?.source_url || undefined,
      matchType: result.matchType,
      matchScore: result.score,
      resolutionStatus,
      confirmedByUser
    };
  }

  public async getAddons(kind?: NutritionAddonOption['kind']): Promise<NutritionAddonOption[]> {
    if (this.addonCatalog) {
      return kind ? this.addonCatalog.filter(a => a.kind === kind) : this.addonCatalog;
    }

    if (this.addonPromise) {
      const items = await this.addonPromise;
      return kind ? items.filter(a => a.kind === kind) : items;
    }

    this.addonPromise = (async () => {
      // In browser environment, attempt static fetch
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        try {
          const response = await fetch('/data/nutrition/addons.json', {
            cache: 'force-cache'
          });
          if (response.ok) {
            const rows = (await response.json()) as NutritionAddonOption[];
            const normalizedRows = rows.map(item => ({
              ...item,
              servingAmount:
                item.servingAmount ??
                item.servingG,
              servingUnit:
                item.servingUnit ??
                (item.kind === 'drink' ? 'ml' : 'g')
            }));
            this.addonCatalog = normalizedRows;
            return normalizedRows;
          }
        } catch {
          // Fall through to build from in-memory dataset
        }
      }

      // Build directly from loaded dataset
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
            servingAmount: f.serving?.standard_g,
            servingUnit:
              f.classification?.domain_id === 'fruit' ||
              f.classification?.category_id === 'fruits'
                ? 'g'
                : 'ml',
            kcalMin: f.energy.kcal_min,
            kcalMax: f.energy.kcal_max,
            source: f.provenance?.source_role || 'canonical',
            sourceUrl: f.provenance?.source_url || '',
            confidence: f.confidence.label_vi,
            isReferenceOnly:
              f.validation?.training_eligibility === 'REFERENCE_ONLY' ||
              f.energy?.calorie_status === 'TABLE_LOOKUP' ||
              f.validation?.result === 'NEEDS_REVIEW'
          }));
        this.addonCatalog = fallbackAddons;
        return fallbackAddons;
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
