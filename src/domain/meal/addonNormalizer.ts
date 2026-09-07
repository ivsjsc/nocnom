export type MealAddonKind =
  | 'fruit'
  | 'drink'
  | 'side'
  | 'dessert';

export type ServingUnit = 'g' | 'ml' | 'portion';

export const MEAL_ADDON_KIND_LABELS: Record<MealAddonKind, string> = {
  fruit: 'Trái cây',
  drink: 'Đồ uống',
  side: 'Món phụ',
  dessert: 'Tráng miệng'
};

export const defaultServingUnitForAddonKind = (
  kind: MealAddonKind
): ServingUnit => (kind === 'drink' ? 'ml' : 'g');

export type UserMealAddon = {
  id: string;
  kind: MealAddonKind;
  name: string;
  calories: number;
  servingAmount?: number;
  servingUnit?: ServingUnit;
  createdAt: number;
};

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

const validKinds = new Set<MealAddonKind>([
  'fruit',
  'drink',
  'side',
  'dessert'
]);

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
    if (!addon || !validKinds.has(addon.kind)) {
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
        : defaultServingUnitForAddonKind(addon.kind));

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
