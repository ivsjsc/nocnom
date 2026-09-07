export type MealAddonKind = 'fruit' | 'drink';
export type ServingUnit = 'g' | 'ml' | 'portion';

export type MealAddonSnapshot = {
  id: string;
  kind: MealAddonKind;
  name: string;
  calories: number;
  nutritionRecordId?: string;
  servingG?: number;
  servingAmount?: number;
  servingUnit?: ServingUnit;
  kcalMin?: number;
  kcalMax?: number;
};

const validNonNegative = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0;

const optionalNonNegative = (value: unknown): number | undefined =>
  validNonNegative(value) ? value : undefined;

export const normalizeMealAddons = (
  addons?: MealAddonSnapshot[]
): MealAddonSnapshot[] => {
  if (!Array.isArray(addons)) return [];

  const seenKinds = new Set<MealAddonKind>();
  const seenIds = new Set<string>();
  const normalized: MealAddonSnapshot[] = [];

  for (const addon of addons) {
    if (!addon || (addon.kind !== 'fruit' && addon.kind !== 'drink')) {
      continue;
    }

    const id = String(addon.id ?? '').trim();
    const name = String(addon.name ?? '').trim();
    if (!id || !name || seenKinds.has(addon.kind) || seenIds.has(id)) {
      continue;
    }

    seenKinds.add(addon.kind);
    seenIds.add(id);

    const servingG = optionalNonNegative(addon.servingG);
    const servingAmount =
      optionalNonNegative(addon.servingAmount) ?? servingG;

    const providedUnit =
      addon.servingUnit === 'g' ||
      addon.servingUnit === 'ml' ||
      addon.servingUnit === 'portion'
        ? addon.servingUnit
        : undefined;

    const servingUnit =
      providedUnit ??
      (servingAmount === undefined
        ? 'portion'
        : addon.kind === 'drink'
          ? 'ml'
          : 'g');

    const rawCalories = optionalNonNegative(addon.calories);
    const kcalMin = optionalNonNegative(addon.kcalMin);
    const kcalMax = optionalNonNegative(addon.kcalMax);

    normalized.push({
      id,
      kind: addon.kind,
      name,
      calories: Math.round(rawCalories ?? 0),
      nutritionRecordId: addon.nutritionRecordId
        ? String(addon.nutritionRecordId).trim()
        : undefined,
      servingG,
      servingAmount,
      servingUnit,
      kcalMin:
        kcalMin === undefined ? undefined : Math.round(kcalMin),
      kcalMax:
        kcalMax === undefined ? undefined : Math.round(kcalMax)
    });
  }

  return normalized;
};
