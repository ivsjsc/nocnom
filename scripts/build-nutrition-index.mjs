import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'data', 'nutrition', 'source');
const outputDir = path.join(root, 'public', 'data', 'nutrition');
const masterSourceFile = path.join(sourceDir, 'nocnom_nutrition_knowledge.json');

const main = async () => {
  console.log('[nutrition:build] Reading canonical source:', masterSourceFile);
  const rawText = await fs.readFile(masterSourceFile, 'utf8');
  const dataset = JSON.parse(rawText);

  if (dataset.schema !== 'nocnom.nutrition.knowledge' || !Array.isArray(dataset.foods)) {
    throw new Error('Invalid master dataset schema in ' + masterSourceFile);
  }

  const foods = dataset.foods;
  const portions = dataset.portions || [];
  const ingredients = dataset.ingredients || [];
  const taxonomy = dataset.taxonomy || { domains: [], categories: [] };
  const indexes = dataset.indexes || {};

  console.log(
    `[nutrition:build] Loaded canonical dataset: ${foods.length} foods, ${portions.length} portions, ${ingredients.length} ingredients`
  );

  // Extract Addons directly from canonical dataset (beverage + fruit)
  const addonKindByDomain = new Map([
    ['beverage', 'drink'],
    ['fruit', 'fruit']
  ]);
  const addonKindByCategory = new Map([
    ['beverages', 'drink'],
    ['fruits', 'fruit']
  ]);

  const addons = foods
    .filter(food => {
      const dom = food.classification?.domain_id;
      const cat = food.classification?.category_id;
      return (
        addonKindByDomain.has(dom) ||
        addonKindByCategory.has(cat) ||
        dom === 'beverage' ||
        dom === 'fruit'
      );
    })
    .map(food => {
      const kind =
        addonKindByDomain.get(food.classification?.domain_id) ||
        addonKindByCategory.get(food.classification?.category_id) ||
        (food.classification?.domain_id === 'fruit' ? 'fruit' : 'drink');

      const isReferenceOnly =
        food.validation?.training_eligibility === 'REFERENCE_ONLY' ||
        food.energy?.calorie_status === 'TABLE_LOOKUP';

      return {
        id: food.id,
        kind,
        name: food.name,
        category: food.classification?.category_vi || food.classification?.source_category || food.name,
        calories: Math.round(food.energy?.kcal_typical ?? 0),
        servingG: food.serving?.standard_g,
        kcalMin: food.energy?.kcal_min,
        kcalMax: food.energy?.kcal_max,
        source: food.provenance?.legacy_source_description || food.provenance?.source_role || 'canonical',
        sourceUrl: food.provenance?.source_url || '',
        confidence: food.confidence?.label_vi || 'Trung bình',
        isReferenceOnly
      };
    })
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      return a.name.localeCompare(b.name, 'vi');
    });

  // Prepare runtime knowledge base (omitting bulky training examples and audit logs)
  const runtimeKnowledge = {
    schema: dataset.schema,
    schema_version: dataset.schema_version,
    dataset_version: dataset.dataset_version,
    locale: dataset.locale,
    database_name: dataset.database_name,
    validation_status: dataset.validation_status,
    statistics: dataset.statistics,
    taxonomy,
    indexes,
    foods,
    portions,
    ingredients
  };

  await fs.mkdir(outputDir, { recursive: true });

  const runtimeFilePath = path.join(outputDir, 'nocnom_nutrition_knowledge.json');
  await fs.writeFile(
    runtimeFilePath,
    JSON.stringify(runtimeKnowledge),
    'utf8'
  );

  const addonsFilePath = path.join(outputDir, 'addons.json');
  await fs.writeFile(
    addonsFilePath,
    JSON.stringify(addons, null, 2) + '\n',
    'utf8'
  );

  const manifest = {
    version: 2,
    generatedAt: new Date().toISOString(),
    sourceFile: 'nocnom_nutrition_knowledge.json',
    sourceRecordCount: foods.length,
    portionRecordCount: portions.length,
    ingredientRecordCount: ingredients.length,
    addonCount: addons.length,
    domainCount: taxonomy.domains?.length || 0,
    categoryCount: taxonomy.categories?.length || 0,
    status: 'PASS'
  };

  await fs.writeFile(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );

  console.log(
    `[nutrition:build] SUCCESS! Generated runtime dataset with ${foods.length} foods and ${addons.length} addons into public/data/nutrition/`
  );
};

await main();
