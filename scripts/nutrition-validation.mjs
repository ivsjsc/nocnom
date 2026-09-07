const normalize = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const finiteNonNegative = value =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0;

const addCollision = (map, key, id) => {
  if (!key) return;
  const current = map.get(key) || [];
  if (!current.includes(id)) current.push(id);
  map.set(key, current);
};

export const validateNutritionDataset = dataset => {
  const errors = [];
  const warnings = [];

  if (!dataset || dataset.schema !== 'nocnom.nutrition.knowledge') {
    errors.push('Invalid nutrition schema');
    return {
      errors,
      warnings,
      stats: {
        foodCount: 0,
        portionCount: 0,
        normalizedNameCollisionCount: 0,
        aliasCollisionCount: 0
      },
      collisions: { normalizedNames: [], aliases: [] }
    };
  }

  const foods = Array.isArray(dataset.foods) ? dataset.foods : [];
  const portions = Array.isArray(dataset.portions) ? dataset.portions : [];
  const domains = Array.isArray(dataset.taxonomy?.domains)
    ? dataset.taxonomy.domains
    : [];
  const categories = Array.isArray(dataset.taxonomy?.categories)
    ? dataset.taxonomy.categories
    : [];

  const foodIds = new Set();
  const canonicalIds = new Set();
  const domainIds = new Set(domains.map(item => item.id));
  const categoryIds = new Set(categories.map(item => item.id));
  const normalizedNameMap = new Map();
  const aliasMap = new Map();

  const validCalorieStatus = new Set([
    'CALCULATED',
    'ESTIMATED',
    'TABLE_LOOKUP'
  ]);
  const validVerificationState = new Set([
    'NOT_INDEPENDENTLY_VERIFIED',
    'TABLE_LOOKUP_NOT_INDEPENDENTLY_VERIFIED',
    'VERIFIED'
  ]);
  const validTrainingEligibility = new Set([
    'REFERENCE_ONLY',
    'TRAINING_CANDIDATE'
  ]);
  const validPortionSizes = new Set(['S', 'M', 'L']);

  for (const food of foods) {
    if (!food?.id || typeof food.id !== 'string') {
      errors.push('Food with missing/invalid id');
      continue;
    }

    if (foodIds.has(food.id)) {
      errors.push(`Duplicate food id: ${food.id}`);
    }
    foodIds.add(food.id);

    if (
      typeof food.canonical_id !== 'number' ||
      !Number.isFinite(food.canonical_id)
    ) {
      errors.push(`Invalid canonical id on ${food.id}`);
    } else if (canonicalIds.has(food.canonical_id)) {
      errors.push(`Duplicate canonical id: ${food.canonical_id}`);
    } else {
      canonicalIds.add(food.canonical_id);
    }

    if (!domainIds.has(food.classification?.domain_id)) {
      errors.push(`Invalid domain reference on ${food.id}`);
    }
    if (!categoryIds.has(food.classification?.category_id)) {
      errors.push(`Invalid category reference on ${food.id}`);
    }

    const energy = food.energy || {};
    for (const [field, value] of [
      ['kcal_per_100g', energy.kcal_per_100g],
      ['kcal_min', energy.kcal_min],
      ['kcal_typical', energy.kcal_typical],
      ['kcal_max', energy.kcal_max]
    ]) {
      if (!finiteNonNegative(value)) {
        errors.push(`Invalid ${field} on ${food.id}`);
      }
    }

    if (
      finiteNonNegative(energy.kcal_min) &&
      finiteNonNegative(energy.kcal_typical) &&
      finiteNonNegative(energy.kcal_max) &&
      !(
        energy.kcal_min <= energy.kcal_typical &&
        energy.kcal_typical <= energy.kcal_max
      )
    ) {
      errors.push(`Invalid kcal range ordering on ${food.id}`);
    }

    if (!validCalorieStatus.has(energy.calorie_status)) {
      errors.push(`Invalid calorie_status on ${food.id}`);
    }
    if (!validVerificationState.has(energy.verification_state)) {
      errors.push(`Invalid verification_state on ${food.id}`);
    }

    const eligibility = food.validation?.training_eligibility;
    if (!validTrainingEligibility.has(eligibility)) {
      errors.push(`Invalid training_eligibility on ${food.id}`);
    }

    if (
      !food.serving ||
      !finiteNonNegative(food.serving.standard_g) ||
      food.serving.standard_g <= 0
    ) {
      errors.push(`Invalid standard serving on ${food.id}`);
    }

    const provenance = food.provenance || {};
    if (
      !String(provenance.source_url || '').trim() &&
      !String(provenance.source_role || '').trim() &&
      !String(provenance.legacy_source_description || '').trim()
    ) {
      warnings.push(`Missing explicit provenance on ${food.id}`);
    }

    const normalizedName =
      normalize(food.normalized_name || food.name);
    addCollision(normalizedNameMap, normalizedName, food.id);

    const aliases = Array.isArray(food.normalized_aliases)
      ? food.normalized_aliases
      : Array.isArray(food.aliases)
        ? food.aliases
        : [];
    for (const alias of aliases) {
      addCollision(aliasMap, normalize(alias), food.id);
    }
  }

  const portionIds = new Set();
  const portionsPerFood = new Map();

  for (const portion of portions) {
    if (!portion?.id || typeof portion.id !== 'string') {
      errors.push('Portion with missing/invalid id');
      continue;
    }

    if (portionIds.has(portion.id)) {
      errors.push(`Duplicate portion id: ${portion.id}`);
    }
    portionIds.add(portion.id);

    if (!foodIds.has(portion.food_id)) {
      errors.push(`Orphan portion ${portion.id}: ${portion.food_id}`);
    }

    if (!validPortionSizes.has(portion.portion_size)) {
      errors.push(`Invalid portion size on ${portion.id}`);
    }

    if (
      !finiteNonNegative(portion.portion_g) ||
      portion.portion_g <= 0
    ) {
      errors.push(`Invalid portion amount on ${portion.id}`);
    }

    for (const [field, value] of [
      ['kcal_per_100g', portion.kcal_per_100g],
      ['kcal_min', portion.kcal_min],
      ['kcal_typical', portion.kcal_typical],
      ['kcal_max', portion.kcal_max]
    ]) {
      if (!finiteNonNegative(value)) {
        errors.push(`Invalid portion ${field} on ${portion.id}`);
      }
    }

    if (
      finiteNonNegative(portion.kcal_min) &&
      finiteNonNegative(portion.kcal_typical) &&
      finiteNonNegative(portion.kcal_max) &&
      !(
        portion.kcal_min <= portion.kcal_typical &&
        portion.kcal_typical <= portion.kcal_max
      )
    ) {
      errors.push(`Invalid portion kcal range ordering on ${portion.id}`);
    }

    const bySize = portionsPerFood.get(portion.food_id) || new Map();
    const existing = bySize.get(portion.portion_size);
    if (existing) {
      errors.push(
        `Duplicate portion size ${portion.portion_size} for food ${portion.food_id}`
      );
    } else {
      bySize.set(portion.portion_size, portion.id);
    }
    portionsPerFood.set(portion.food_id, bySize);
  }

  for (const food of foods) {
    const linked = Array.isArray(food.serving?.portion_ids)
      ? food.serving.portion_ids
      : [];

    for (const portionId of linked) {
      if (!portionIds.has(portionId)) {
        errors.push(
          `Broken portion reference ${portionId} on food ${food.id}`
        );
      }
    }

    const bySize = portionsPerFood.get(food.id);
    for (const size of ['S', 'M', 'L']) {
      if (!bySize?.has(size)) {
        errors.push(`Missing portion ${size} for food ${food.id}`);
      }
    }
  }

  const normalizedNames = [...normalizedNameMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ key, ids }));

  const aliases = [...aliasMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ key, ids }));

  for (const collision of normalizedNames) {
    errors.push(
      `Normalized canonical-name collision "${collision.key}": ${collision.ids.join(', ')}`
    );
  }

  if (aliases.length > 0) {
    warnings.push(
      `Detected ${aliases.length} normalized alias collision(s); exact alias search must require disambiguation when multiple records match.`
    );
  }

  return {
    errors,
    warnings,
    stats: {
      foodCount: foods.length,
      portionCount: portions.length,
      normalizedNameCollisionCount: normalizedNames.length,
      aliasCollisionCount: aliases.length,
      missingProvenanceCount: warnings.filter(item =>
        item.startsWith('Missing explicit provenance')
      ).length
    },
    collisions: { normalizedNames, aliases }
  };
};

export const assertNutritionDatasetValid = dataset => {
  const result = validateNutritionDataset(dataset);
  if (result.errors.length > 0) {
    const preview = result.errors.slice(0, 20).join('\n- ');
    throw new Error(
      `Nutrition dataset validation failed with ${result.errors.length} error(s):\n- ${preview}`
    );
  }
  return result;
};
