# nOcnOm Nutrition Knowledge Base

This directory is the canonical source for food and beverage nutrition data used by nOcnOm.

## Architecture

```
data/nutrition/source/*
        |
        v
scripts/build-nutrition-index.mjs
        |
        v
public/data/nutrition/manifest.json
public/data/nutrition/shards/*.json
        |
        v
src/lib/nutritionKnowledge.ts
        |
        +--> Dish.calories -> meal logs -> daily calorie totals
        |
        +--> fruit/drink addon catalog -> meal addons -> daily calorie totals
```

Raw nutrition datasets MUST live in `data/nutrition/source/`. Do not import a large raw dataset directly from `src/`; that would bundle the entire world food catalog into the mobile JavaScript payload.

## Supported source formats

The build script accepts `.csv` and `.json` files in `data/nutrition/source/`.

Canonical fields:

| Field | Required | Description |
|---|---:|---|
| id | recommended | Stable unique identifier |
| name | yes | Canonical food/drink name |
| aliases | no | Alternative names separated by `;` |
| category | no | Food category |
| record_type | no | `dish` (default) or `ingredient` |
| serving_g | no | Standard serving size in grams/ml-equivalent |
| kcal_per_100g | conditional | Energy per 100 g |
| kcal_per_serving | conditional | Energy per standard serving |
| kcal_min | no | Lower estimate for the standard serving |
| kcal_max | no | Upper estimate for the standard serving |
| source | recommended | Data origin, e.g. USDA, national database, manufacturer |
| source_url | no | Reference URL |
| confidence | no | `verified`, `estimated`, or `unknown` |
| locale | no | Locale such as `vi-VN`, `en-US` |

At least one of `kcal_per_100g` or `kcal_per_serving` must be present.

If `kcal_per_serving` is missing but both `serving_g` and `kcal_per_100g` exist, the build process calculates:

```
kcal_per_serving = kcal_per_100g * serving_g / 100
```

## Import workflow

1. Copy the dataset into `data/nutrition/source/`.
2. Map the dataset columns to the canonical fields above.
3. Run:

```bash
npm run nutrition:build
npm run lint
npm run build
```

4. Review `public/data/nutrition/manifest.json`.
5. Deploy normally.

## Runtime behavior

The generated catalog is split into hash shards. nOcnOm downloads only the shard required for the requested food name and caches it in memory. This prevents a very large global dataset from blocking initial page load.

Lookup priority:

1. Explicit/manual calories on the dish.
2. Exact normalized name or alias in the Nutrition Knowledge Base.
3. Existing category fallback estimate.

## Data-quality rules

- Prefer authoritative nutrition databases or manufacturer data.
- Store the source and source URL whenever possible.
- Do not mix kJ and kcal.
- Do not assume every serving is 100 g.
- Use aliases for regional and multilingual dish names.
- Do not delete stable IDs when updating a record.
- Avoid medical claims. Nutrition values are estimates unless the source is verified.

## Scaling note

The sharded static catalog is appropriate for a large read-only reference dataset on Firebase Hosting. If the source dataset grows into hundreds of MB or requires frequent server-side updates, move the generated index to object storage / a searchable backend while keeping the same canonical schema.


## Meal add-ons

The build process also generates `public/data/nutrition/addons.json` from dish records
whose categories are `Trái cây` or `Đồ uống`. The history/editor UI uses this
small generated catalog so each breakfast/lunch/dinner can optionally include one
fruit and one drink without loading the full 300-record dataset into the initial
JavaScript bundle.

Meal add-ons keep a nutrition record ID and their own calorie snapshot. Historical
logs therefore remain stable even if the reference dataset is updated later.


## Runtime nutrition ownership

nOcnOm deliberately separates the static reference catalog from account-owned nutrition data.

| Layer | Storage | Mutable by app user | Purpose |
|---|---|---:|---|
| Reference Nutrition DB | `data/nutrition/source/*` -> generated `public/data/nutrition/*` | No | Shared food reference, portions, provenance and curated/verified states |
| User manual nutrition | `users/{uid}/state/dishes` | Yes | Nutrition label, manufacturer data, user weighing or other explicit user input |
| User recipe nutrition | `users/{uid}/state/dishes` | Yes | Per-serving calculation from ingredient quantities and per-100g values |
| Meal history snapshot | `users/{uid}/state/logs` | Through the bounded history editor | Immutable nutrition snapshot for the recorded meal |

The current reference catalog size is only a dataset snapshot, not a closed list of foods. A user may create foods that do not exist in the reference catalog.

### Override rule

A user edit MUST NOT mutate the canonical reference record. When a personal dish is linked to a reference food and the user changes calories or macros, the dish keeps the canonical link in `nutritionRecordId` / `userOverrideOfNutritionRecordId` while the active values are stored as a user-owned override.

### Provenance states

Runtime dishes distinguish:

- `reference-db`: shared reference data.
- `user-manual`: user-provided values.
- `user-recipe`: calculated from the user's ingredient recipe.
- `verified` / `curated`: reserved for data that has actually passed the corresponding data-governance process. User-entered values are never automatically promoted to verified.

### Macro integrity

Protein / carbohydrate / fat are never inferred from calories alone.

For a manual serving, macro tracking becomes complete only when all three values are present. For a recipe, macro tracking becomes complete only when every ingredient has all three per-100g macro values.

When complete macro values are available, nOcnOm computes an Atwater consistency check:

```
macro_energy_kcal = protein_g * 4 + carbs_g * 4 + fat_g * 9
```

This check is a data-quality signal, not a replacement for source nutrition data. Differences may occur because of fibre, sugar alcohols, alcohol, analytical methods and rounding.
