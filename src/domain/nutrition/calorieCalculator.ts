export const MAX_GRAM_INPUT = 5000;

export type CalorieRange = {
  kcalTypical: number;
  kcalMin: number;
  kcalMax: number;
};

const finiteNonNegative = (value: number) =>
  Number.isFinite(value) && value >= 0;

export const calculatePer100gCalories = ({
  kcalPer100g,
  grams,
  standardServingG,
  servingKcalMin,
  servingKcalMax
}: {
  kcalPer100g: number;
  grams: number;
  standardServingG?: number;
  servingKcalMin?: number;
  servingKcalMax?: number;
}): CalorieRange | null => {
  if (
    !finiteNonNegative(kcalPer100g) ||
    !Number.isFinite(grams) ||
    grams <= 0 ||
    grams > MAX_GRAM_INPUT
  ) {
    return null;
  }

  const kcalTypical = Math.round((kcalPer100g * grams) / 100);
  let kcalMin = kcalTypical;
  let kcalMax = kcalTypical;

  if (
    typeof standardServingG === 'number' &&
    Number.isFinite(standardServingG) &&
    standardServingG > 0 &&
    typeof servingKcalMin === 'number' &&
    finiteNonNegative(servingKcalMin) &&
    typeof servingKcalMax === 'number' &&
    finiteNonNegative(servingKcalMax)
  ) {
    const ratio = grams / standardServingG;
    kcalMin = Math.round(servingKcalMin * ratio);
    kcalMax = Math.round(servingKcalMax * ratio);
  }

  return {
    kcalTypical,
    kcalMin: Math.min(kcalMin, kcalTypical),
    kcalMax: Math.max(kcalMax, kcalTypical)
  };
};
