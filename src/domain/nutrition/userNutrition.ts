export type UserNutritionMode = 'manual' | 'recipe';

export type NutritionInputBasis = 'serving' | '100g' | '100ml';

export type NutritionDataOrigin =
  | 'reference-db'
  | 'user-manual'
  | 'user-recipe';

export type NutritionDataStatus =
  | 'reference'
  | 'estimated'
  | 'user-provided'
  | 'recipe-calculated'
  | 'curated'
  | 'verified';

export type NutritionSourceKind =
  | 'reference-db'
  | 'self-entered'
  | 'nutrition-label'
  | 'manufacturer'
  | 'recipe'
  | 'other';

export type MacroEnergyConsistency =
  | 'not-applicable'
  | 'consistent'
  | 'review'
  | 'inconsistent';

export type RecipeIngredientNutrition = {
  id: string;
  name: string;
  amountG: number;
  kcalPer100g: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  sourceKind?: Exclude<NutritionSourceKind, 'recipe' | 'reference-db'>;
  sourceUrl?: string;
};

export type NutritionRecipeSnapshot = {
  servings: number;
  ingredients: RecipeIngredientNutrition[];
};

export type UserNutritionInput = {
  mode: UserNutritionMode;
  inputBasis?: NutritionInputBasis;
  calories?: number;
  servingAmount?: number;
  servingUnit?: 'g' | 'ml' | 'portion';
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  sourceKind?: NutritionSourceKind;
  sourceUrl?: string;
  sourceNote?: string;
  recipe?: NutritionRecipeSnapshot;
};

export type NormalizedUserNutrition = {
  calories: number;
  inputBasis: NutritionInputBasis;
  sourceCalories: number;
  sourceProteinG?: number;
  sourceCarbsG?: number;
  sourceFatG?: number;
  servingAmount?: number;
  servingUnit: 'g' | 'ml' | 'portion';
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  sourceKind: NutritionSourceKind;
  sourceUrl?: string;
  sourceNote?: string;
  dataOrigin: NutritionDataOrigin;
  dataStatus: Extract<NutritionDataStatus, 'user-provided' | 'recipe-calculated'>;
  macroEnergyKcal?: number;
  macroEnergyDeltaPct?: number;
  macroEnergyConsistency: MacroEnergyConsistency;
  recipe?: NutritionRecipeSnapshot;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

const isFiniteInRange = (
  value: unknown,
  min: number,
  max: number
): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

const validateSourceUrl = (value?: string) => {
  const clean = value?.trim();
  if (!clean) return undefined;

  try {
    const parsed = new URL(clean);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error();
    }
    return parsed.toString();
  } catch {
    throw new Error('URL nguồn dinh dưỡng phải là URL http/https hợp lệ.');
  }
};

export const hasCompleteMacros = (value: {
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}) =>
  isFiniteInRange(value.proteinG, 0, 500) &&
  isFiniteInRange(value.carbsG, 0, 500) &&
  isFiniteInRange(value.fatG, 0, 500);

export const calculateMacroEnergyKcal = ({
  proteinG,
  carbsG,
  fatG
}: {
  proteinG: number;
  carbsG: number;
  fatG: number;
}) => round1(proteinG * 4 + carbsG * 4 + fatG * 9);

export const assessMacroEnergyConsistency = ({
  calories,
  proteinG,
  carbsG,
  fatG
}: {
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}): {
  macroEnergyKcal?: number;
  macroEnergyDeltaPct?: number;
  macroEnergyConsistency: MacroEnergyConsistency;
} => {
  if (
    !isFiniteInRange(calories, 1, 5000) ||
    !hasCompleteMacros({ proteinG, carbsG, fatG })
  ) {
    return {
      macroEnergyConsistency: 'not-applicable'
    };
  }

  const macroEnergyKcal = calculateMacroEnergyKcal({
    proteinG,
    carbsG,
    fatG
  });
  const macroEnergyDeltaPct = round1(
    (Math.abs(macroEnergyKcal - calories) / calories) * 100
  );

  return {
    macroEnergyKcal,
    macroEnergyDeltaPct,
    macroEnergyConsistency:
      macroEnergyDeltaPct <= 10
        ? 'consistent'
        : macroEnergyDeltaPct <= 20
          ? 'review'
          : 'inconsistent'
  };
};

export const calculateRecipeNutrition = (
  recipe: NutritionRecipeSnapshot
): {
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  macroEnergyKcal?: number;
  macroEnergyDeltaPct?: number;
  macroEnergyConsistency: MacroEnergyConsistency;
} => {
  if (!Number.isInteger(recipe.servings) || recipe.servings < 1 || recipe.servings > 100) {
    throw new Error('Số khẩu phần công thức phải từ 1 đến 100.');
  }
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    throw new Error('Công thức cần ít nhất 1 nguyên liệu.');
  }
  if (recipe.ingredients.length > 50) {
    throw new Error('Một công thức chỉ hỗ trợ tối đa 50 nguyên liệu.');
  }

  let caloriesTotal = 0;
  let proteinTotal = 0;
  let carbsTotal = 0;
  let fatTotal = 0;
  let allMacrosKnown = true;

  recipe.ingredients.forEach((ingredient, index) => {
    const label = ingredient.name.trim() || `Nguyên liệu ${index + 1}`;
    if (!ingredient.name.trim()) {
      throw new Error(`Cần nhập tên cho ${label.toLowerCase()}.`);
    }
    if (!isFiniteInRange(ingredient.amountG, 0.1, 5000)) {
      throw new Error(`${label}: khối lượng phải từ 0,1 đến 5.000 g.`);
    }
    if (!isFiniteInRange(ingredient.kcalPer100g, 0, 1000)) {
      throw new Error(`${label}: kcal/100g phải từ 0 đến 1.000.`);
    }

    caloriesTotal += ingredient.kcalPer100g * ingredient.amountG / 100;

    const macroValues = [
      ingredient.proteinPer100g,
      ingredient.carbsPer100g,
      ingredient.fatPer100g
    ];
    const hasAnyMacro = macroValues.some(value => value !== undefined);
    const hasAllMacros = macroValues.every(value =>
      isFiniteInRange(value, 0, 100)
    );

    if (hasAnyMacro && !hasAllMacros) {
      throw new Error(
        `${label}: nếu nhập macro nguyên liệu, cần nhập đủ Protein / Carb / Fat trên 100 g.`
      );
    }

    if (!hasAllMacros) {
      allMacrosKnown = false;
      return;
    }

    proteinTotal += (ingredient.proteinPer100g as number) * ingredient.amountG / 100;
    carbsTotal += (ingredient.carbsPer100g as number) * ingredient.amountG / 100;
    fatTotal += (ingredient.fatPer100g as number) * ingredient.amountG / 100;
  });

  const calories = round1(caloriesTotal / recipe.servings);
  if (!isFiniteInRange(calories, 1, 5000)) {
    throw new Error('Năng lượng mỗi khẩu phần của công thức phải từ 1 đến 5.000 kcal.');
  }

  const macros = allMacrosKnown
    ? {
        proteinG: round1(proteinTotal / recipe.servings),
        carbsG: round1(carbsTotal / recipe.servings),
        fatG: round1(fatTotal / recipe.servings)
      }
    : {};

  return {
    calories,
    ...macros,
    ...assessMacroEnergyConsistency({
      calories,
      ...macros
    })
  };
};

export const normalizeUserNutritionInput = (
  input: UserNutritionInput
): NormalizedUserNutrition => {
  if (input.mode === 'recipe') {
    if (!input.recipe) {
      throw new Error('Thiếu dữ liệu công thức.');
    }

    const recipe = {
      servings: input.recipe.servings,
      ingredients: input.recipe.ingredients.map(ingredient => ({
        ...ingredient,
        id: ingredient.id || `ingredient-${cryptoSafeId()}`,
        name: ingredient.name.trim(),
        sourceUrl: validateSourceUrl(ingredient.sourceUrl)
      }))
    };

    const calculated = calculateRecipeNutrition(recipe);

    return {
      calories: calculated.calories,
      inputBasis: 'serving',
      sourceCalories: calculated.calories,
      servingUnit: 'portion',
      proteinG: calculated.proteinG,
      carbsG: calculated.carbsG,
      fatG: calculated.fatG,
      sourceKind: 'recipe',
      sourceUrl: validateSourceUrl(input.sourceUrl),
      sourceNote: input.sourceNote?.trim() || undefined,
      dataOrigin: 'user-recipe',
      dataStatus: 'recipe-calculated',
      macroEnergyKcal: calculated.macroEnergyKcal,
      macroEnergyDeltaPct: calculated.macroEnergyDeltaPct,
      macroEnergyConsistency: calculated.macroEnergyConsistency,
      recipe
    };
  }

  if (!isFiniteInRange(input.calories, 1, 5000)) {
    throw new Error('Calo thủ công phải từ 1 đến 5.000 kcal cho cùng một khẩu phần.');
  }

  const inputBasis: NutritionInputBasis = input.inputBasis || 'serving';
  const macroEntries = [
    ['Protein', input.proteinG],
    ['Carb', input.carbsG],
    ['Fat', input.fatG]
  ] as const;

  macroEntries.forEach(([label, value]) => {
    if (value !== undefined && !isFiniteInRange(value, 0, 500)) {
      throw new Error(`${label} phải là số hợp lệ từ 0 đến 500 g theo đúng đơn vị nguồn.`);
    }
  });

  if (
    input.servingAmount !== undefined &&
    !isFiniteInRange(input.servingAmount, 0.1, 5000)
  ) {
    throw new Error('Khẩu phần phải từ 0,1 đến 5.000 g/ml.');
  }

  if (
    inputBasis === '100g' &&
    (!isFiniteInRange(input.servingAmount, 0.1, 5000) || input.servingUnit !== 'g')
  ) {
    throw new Error('Khi số liệu nguồn tính trên 100 g, hãy nhập khối lượng khẩu phần thực tế bằng gram.');
  }

  if (
    inputBasis === '100ml' &&
    (!isFiniteInRange(input.servingAmount, 0.1, 5000) || input.servingUnit !== 'ml')
  ) {
    throw new Error('Khi số liệu nguồn tính trên 100 ml, hãy nhập dung tích khẩu phần thực tế bằng ml.');
  }

  const scale =
    inputBasis === '100g' || inputBasis === '100ml'
      ? (input.servingAmount as number) / 100
      : 1;

  const calories = round1(input.calories * scale);
  const proteinG =
    input.proteinG === undefined ? undefined : round1(input.proteinG * scale);
  const carbsG =
    input.carbsG === undefined ? undefined : round1(input.carbsG * scale);
  const fatG =
    input.fatG === undefined ? undefined : round1(input.fatG * scale);

  const consistency = assessMacroEnergyConsistency({
    calories,
    proteinG,
    carbsG,
    fatG
  });

  return {
    calories,
    inputBasis,
    sourceCalories: round1(input.calories),
    sourceProteinG:
      input.proteinG === undefined ? undefined : round1(input.proteinG),
    sourceCarbsG:
      input.carbsG === undefined ? undefined : round1(input.carbsG),
    sourceFatG:
      input.fatG === undefined ? undefined : round1(input.fatG),
    servingAmount:
      input.servingAmount === undefined
        ? undefined
        : round1(input.servingAmount),
    servingUnit:
      inputBasis === '100g'
        ? 'g'
        : inputBasis === '100ml'
          ? 'ml'
          : input.servingUnit || 'portion',
    proteinG,
    carbsG,
    fatG,
    sourceKind:
      input.sourceKind && input.sourceKind !== 'reference-db' && input.sourceKind !== 'recipe'
        ? input.sourceKind
        : 'self-entered',
    sourceUrl: validateSourceUrl(input.sourceUrl),
    sourceNote: input.sourceNote?.trim() || undefined,
    dataOrigin: 'user-manual',
    dataStatus: 'user-provided',
    ...consistency
  };
};

const cryptoSafeId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
