import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'data', 'nutrition', 'source');
const outputDir = path.join(root, 'public', 'data', 'nutrition');
const shardDir = path.join(outputDir, 'shards');

const confidenceRank = {
  verified: 3,
  estimated: 2,
  unknown: 1
};

const normalizeFoodName = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const hashKey = value => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const shardKeyFor = normalizedName =>
  (hashKey(normalizedName) & 0xff).toString(16).padStart(2, '0');

const toNumber = value => {
  if (value === null || value === undefined || value === '') return undefined;
  const normalized = typeof value === 'string' ? value.replace(',', '.').trim() : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
};

const parseCsv = text => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some(value => value.trim() !== '')) rows.push(row);

  if (rows.length === 0) return [];

  const headers = rows[0].map(header => header.replace(/^\uFEFF/, '').trim());

  return rows.slice(1).map(values =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  );
};

const readSourceFile = async filePath => {
  const ext = path.extname(filePath).toLowerCase();
  const text = await fs.readFile(filePath, 'utf8');

  if (ext === '.csv') return parseCsv(text);

  if (ext === '.json') {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.foods)) return parsed.foods;
    if (Array.isArray(parsed.records)) return parsed.records;
    throw new Error('JSON nutrition source must be an array or contain foods[] / records[]: ' + filePath);
  }

  return [];
};

const normalizeAliases = aliases => {
  if (Array.isArray(aliases)) {
    return aliases.map(value => String(value).trim()).filter(Boolean);
  }

  if (typeof aliases === 'string') {
    return aliases
      .split(';')
      .map(value => value.trim())
      .filter(Boolean);
  }

  return [];
};

const canonicalize = (raw, index, sourceFile) => {
  const name = String(raw.name ?? raw.food_name ?? raw.food ?? '').trim();
  if (!name) return { error: 'missing name' };

  const servingG = toNumber(raw.serving_g ?? raw.serving_grams ?? raw.portion_g);
  const kcalPer100g = toNumber(raw.kcal_per_100g ?? raw.calories_per_100g ?? raw.kcal_100g);
  let kcalPerServing = toNumber(
    raw.kcal_per_serving ?? raw.calories_per_serving ?? raw.calories ?? raw.kcal
  );

  if (
    kcalPerServing === undefined &&
    kcalPer100g !== undefined &&
    servingG !== undefined &&
    servingG > 0
  ) {
    kcalPerServing = kcalPer100g * servingG / 100;
  }

  if (kcalPerServing === undefined && kcalPer100g === undefined) {
    return { error: 'missing calorie value' };
  }

  const confidenceRaw = String(raw.confidence ?? 'unknown').toLowerCase();
  const confidence = Object.hasOwn(confidenceRank, confidenceRaw)
    ? confidenceRaw
    : 'unknown';

  const kcalMin = toNumber(raw.kcal_min ?? raw.calories_min);
  const kcalMax = toNumber(raw.kcal_max ?? raw.calories_max);

  const record = {
    id: String(raw.id ?? raw.food_id ?? sourceFile + ':' + (index + 1)),
    name,
    aliases: normalizeAliases(raw.aliases ?? raw.alias ?? raw.alternative_names),
    category: String(raw.category ?? raw.food_category ?? '').trim(),
    recordType: String(raw.record_type ?? raw.recordType ?? 'dish').trim() || 'dish',
    servingG: servingG && servingG > 0 ? servingG : undefined,
    kcalPer100g: kcalPer100g !== undefined && kcalPer100g >= 0
      ? Math.round(kcalPer100g * 100) / 100
      : undefined,
    kcalPerServing: kcalPerServing !== undefined && kcalPerServing >= 0
      ? Math.round(kcalPerServing)
      : undefined,
    kcalMin: kcalMin !== undefined && kcalMin >= 0 ? Math.round(kcalMin) : undefined,
    kcalMax: kcalMax !== undefined && kcalMax >= 0 ? Math.round(kcalMax) : undefined,
    source: String(raw.source ?? '').trim(),
    sourceUrl: String(raw.source_url ?? raw.url ?? '').trim(),
    confidence,
    locale: String(raw.locale ?? '').trim()
  };

  return { record };
};

const preferRecord = (current, candidate) => {
  if (!current) return candidate;

  const currentRank = confidenceRank[current.confidence] ?? 0;
  const candidateRank = confidenceRank[candidate.confidence] ?? 0;

  if (candidateRank > currentRank) return candidate;

  if (candidateRank === currentRank) {
    const currentHasServing = current.kcalPerServing !== undefined ? 1 : 0;
    const candidateHasServing = candidate.kcalPerServing !== undefined ? 1 : 0;
    if (candidateHasServing > currentHasServing) return candidate;
  }

  return current;
};

const main = async () => {
  await fs.mkdir(sourceDir, { recursive: true });

  const sourceFiles = (await fs.readdir(sourceDir))
    .filter(file => ['.csv', '.json'].includes(path.extname(file).toLowerCase()))
    .sort();

  const records = [];
  const errors = [];

  for (const file of sourceFiles) {
    const rows = await readSourceFile(path.join(sourceDir, file));

    rows.forEach((raw, index) => {
      const result = canonicalize(raw, index, file);
      if (result.error) {
        errors.push({ file, row: index + 2, error: result.error });
      } else {
        records.push(result.record);
      }
    });
  }

  const lookup = new Map();

  for (const record of records) {
    const names = [record.name, ...record.aliases];

    for (const candidateName of names) {
      const normalized = normalizeFoodName(candidateName);
      if (!normalized) continue;

      lookup.set(normalized, preferRecord(lookup.get(normalized), record));
    }
  }

  await fs.rm(shardDir, { recursive: true, force: true });
  await fs.mkdir(shardDir, { recursive: true });

  const shards = new Map();

  for (const [key, record] of lookup.entries()) {
    const shardKey = shardKeyFor(key);
    if (!shards.has(shardKey)) shards.set(shardKey, {});
    shards.get(shardKey)[key] = record;
  }

  for (const [shardKey, entries] of shards.entries()) {
    await fs.writeFile(
      path.join(shardDir, shardKey + '.json'),
      JSON.stringify(entries),
      'utf8'
    );
  }

  const addonKindByCategory = new Map([
    ['trai cay', 'fruit'],
    ['do uong', 'drink']
  ]);

  const addons = records
    .filter(record => record.recordType !== 'ingredient')
    .map(record => ({
      record,
      kind: addonKindByCategory.get(normalizeFoodName(record.category))
    }))
    .filter(item =>
      item.kind &&
      typeof item.record.kcalPerServing === 'number' &&
      Number.isFinite(item.record.kcalPerServing)
    )
    .map(({ record, kind }) => ({
      id: record.id,
      kind,
      name: record.name,
      category: record.category,
      calories: Math.round(record.kcalPerServing),
      servingG: record.servingG,
      kcalMin: record.kcalMin,
      kcalMax: record.kcalMax,
      source: record.source,
      sourceUrl: record.sourceUrl,
      confidence: record.confidence
    }))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      return a.name.localeCompare(b.name, 'vi');
    });

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'addons.json'),
    JSON.stringify(addons, null, 2) + '\n',
    'utf8'
  );

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceFiles,
    sourceRecordCount: records.length,
    lookupKeyCount: lookup.size,
    shardCount: shards.size,
    addonCount: addons.length,
    invalidRecordCount: errors.length,
    invalidRecords: errors.slice(0, 100)
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );

  console.log(
    '[nutrition] built ' +
      records.length +
      ' records / ' +
      lookup.size +
      ' lookup keys / ' +
      shards.size +
      ' shards'
  );

  if (errors.length > 0) {
    console.warn(
      '[nutrition] skipped ' +
        errors.length +
        ' invalid rows. See public/data/nutrition/manifest.json'
    );
  }
};

await main();
