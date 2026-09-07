export type MigrationCalorieSource =
  | 'manual'
  | 'knowledge'
  | 'nutrition-db'
  | 'category-fallback'
  | 'legacy';

export type MigratableDish = {
  id: string;
  name: string;
  categoryId: string;
  isFavorite: boolean;
  calories?: number;
  calorieSource?: MigrationCalorieSource;
  calorieBasis?: 'portion' | 'grams' | 'category' | 'serving' | '100g';
  nutritionConfidence?: string;
  nutritionVerificationState?: string;
  legacyNames?: string[];
  vendors: unknown[];
  [key: string]: unknown;
};

type MigrationRule = {
  id: string;
  legacyName: string;
  primaryName: string;
  sibling?: {
    id: string;
    name: string;
  };
};

export const DEFAULT_DISH_MIGRATION_RULES: readonly MigrationRule[] = [
  {
    id: 'd2',
    legacyName: 'Phở bò / Phở gà',
    primaryName: 'Phở bò',
    sibling: { id: 'd22', name: 'Phở gà' }
  },
  {
    id: 'd5',
    legacyName: 'Bún riêu / Chả',
    primaryName: 'Bún riêu chả'
  },
  {
    id: 'd11',
    legacyName: 'Bún mắm / cá',
    primaryName: 'Bún mắm cá'
  },
  {
    id: 'd14',
    legacyName: 'Mì Quảng / Hủ tiếu',
    primaryName: 'Mì Quảng',
    sibling: { id: 'd23', name: 'Hủ tiếu' }
  },
  {
    id: 'd17',
    legacyName: 'Bún / Miến xào',
    primaryName: 'Bún xào',
    sibling: { id: 'd24', name: 'Miến xào' }
  },
  {
    id: 'd20',
    legacyName: 'Lẩu mini / Mì ống',
    primaryName: 'Lẩu mini',
    sibling: { id: 'd25', name: 'Mì ống' }
  }
] as const;

const initialDefaultId = (id: string) => {
  const match = /^d(\d+)$/.exec(id);
  if (!match) return false;
  const n = Number(match[1]);
  return n >= 1 && n <= 21;
};

const uniqueStrings = (values: Array<string | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];

const withLegacyProvenance = <T extends MigratableDish>(dish: T): T => {
  if (
    typeof dish.calories === 'number' &&
    Number.isFinite(dish.calories) &&
    dish.calories >= 0 &&
    !dish.calorieSource
  ) {
    return {
      ...dish,
      calorieSource: 'legacy',
      calorieBasis: dish.calorieBasis || 'serving',
      nutritionConfidence: dish.nutritionConfidence || 'unknown',
      nutritionVerificationState:
        dish.nutritionVerificationState || 'LEGACY_SNAPSHOT'
    };
  }
  return dish;
};

const asNewUserFallback = <T extends MigratableDish>(dish: T): T => ({
  ...dish,
  calories: undefined,
  calorieSource: 'category-fallback',
  calorieBasis: 'category',
  nutritionConfidence: 'unknown',
  nutritionVerificationState: 'UNVERIFIED_FALLBACK'
});

export const migrateDefaultDishRecords = <T extends MigratableDish>(
  input: T[],
  mode: 'persisted' | 'new-user' = 'persisted'
): T[] => {
  const mapped = input.map(original => {
    let dish = withLegacyProvenance(original);

    for (const rule of DEFAULT_DISH_MIGRATION_RULES) {
      if (dish.id !== rule.id) continue;
      if (
        dish.name !== rule.legacyName &&
        dish.name !== rule.primaryName
      ) {
        continue;
      }

      if (dish.name === rule.legacyName) {
        dish = {
          ...dish,
          name: rule.primaryName,
          legacyNames: uniqueStrings([
            ...(dish.legacyNames || []),
            rule.legacyName
          ])
        };
      }
    }

    if (mode === 'new-user' && initialDefaultId(dish.id)) {
      dish = asNewUserFallback(dish);
    }

    return dish;
  });

  const result = [...mapped];

  for (const rule of DEFAULT_DISH_MIGRATION_RULES) {
    if (!rule.sibling) continue;

    const primary = result.find(
      dish =>
        dish.id === rule.id &&
        (dish.name === rule.primaryName ||
          dish.legacyNames?.includes(rule.legacyName))
    );
    if (!primary) continue;

    const siblingAlreadyExists = result.some(
      dish =>
        dish.id === rule.sibling!.id ||
        dish.name.trim().toLocaleLowerCase('vi-VN') ===
          rule.sibling!.name.toLocaleLowerCase('vi-VN')
    );
    if (siblingAlreadyExists) continue;

    result.push({
      ...primary,
      id: rule.sibling.id,
      name: rule.sibling.name,
      isFavorite: false,
      calories: undefined,
      calorieSource: 'category-fallback',
      calorieBasis: 'category',
      nutritionConfidence: 'unknown',
      nutritionVerificationState: 'UNVERIFIED_FALLBACK',
      legacyNames: undefined,
      nutritionRecordId: undefined,
      nutritionCanonicalName: undefined,
      nutritionCalorieStatus: undefined,
      nutritionValidationResult: undefined,
      nutritionTrainingEligibility: undefined,
      nutritionReferenceOnly: undefined,
      nutritionSource: undefined,
      nutritionSourceId: undefined,
      nutritionSourceUrl: undefined,
      nutritionMatchType: undefined,
      nutritionMatchScore: undefined,
      portionSize: undefined,
      portionGrams: undefined,
      servingAmount: undefined,
      servingUnit: undefined,
      kcalMin: undefined,
      kcalMax: undefined
    } as T);
  }

  return result;
};
