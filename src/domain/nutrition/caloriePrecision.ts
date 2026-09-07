export const CALORIE_INTERNAL_DECIMALS = 1;

export const normalizeKcalInternal = (
  value: unknown
): number | null => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return null;
  }

  const factor = 10 ** CALORIE_INTERNAL_DECIMALS;
  return Math.round(value * factor) / factor;
};

export const roundKcalForDisplay = (
  value: unknown
): number | null => {
  const normalized = normalizeKcalInternal(value);
  return normalized === null ? null : Math.round(normalized);
};
