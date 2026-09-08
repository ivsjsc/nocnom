import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import {
  normalizeUserNutritionInput,
  type NormalizedUserNutrition,
  type NutritionSourceKind,
  type RecipeIngredientNutrition,
  type UserNutritionInput,
  type UserNutritionMode
} from '../domain/nutrition/userNutrition';

export type CustomNutritionEditorState = {
  input: UserNutritionInput | null;
  normalized: NormalizedUserNutrition | null;
  error: string;
};

type Props = {
  mode: UserNutritionMode;
  initialValue?: UserNutritionInput;
  onChange: (state: CustomNutritionEditorState) => void;
};

type IngredientDraft = {
  id: string;
  name: string;
  amountG: string;
  kcalPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
  sourceUrl: string;
};

const newIngredient = (): IngredientDraft => ({
  id:
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  name: '',
  amountG: '',
  kcalPer100g: '',
  proteinPer100g: '',
  carbsPer100g: '',
  fatPer100g: '',
  sourceUrl: ''
});

const optionalNumber = (value: string) =>
  value.trim() === '' ? undefined : Number(value);

const sourceOptions: Array<{
  value: Exclude<NutritionSourceKind, 'reference-db' | 'recipe'>;
  label: string;
}> = [
  { value: 'self-entered', label: 'Tự nhập / tự cân' },
  { value: 'nutrition-label', label: 'Nhãn dinh dưỡng' },
  { value: 'manufacturer', label: 'Website nhà sản xuất' },
  { value: 'other', label: 'Nguồn tham khảo khác' }
];

const consistencyLabel = (
  normalized: NormalizedUserNutrition
) => {
  switch (normalized.macroEnergyConsistency) {
    case 'consistent':
      return {
        label: 'Calo và macro tương đối nhất quán',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800'
      };
    case 'review':
      return {
        label: 'Có chênh lệch năng lượng · nên kiểm tra nguồn',
        className: 'border-amber-200 bg-amber-50 text-amber-900'
      };
    case 'inconsistent':
      return {
        label: 'Chênh lệch lớn · dữ liệu cần xem lại',
        className: 'border-rose-200 bg-rose-50 text-rose-800'
      };
    default:
      return {
        label: 'Chưa đủ Protein / Carb / Fat để đối chiếu 4-4-9',
        className: 'border-slate-200 bg-slate-50 text-slate-700'
      };
  }
};

export default function CustomNutritionEditor({
  mode,
  initialValue,
  onChange
}: Props) {
  const [calories, setCalories] = useState(
    initialValue?.mode === 'manual' && initialValue.calories !== undefined
      ? String(initialValue.calories)
      : ''
  );
  const [servingAmount, setServingAmount] = useState(
    initialValue?.mode === 'manual' && initialValue.servingAmount !== undefined
      ? String(initialValue.servingAmount)
      : ''
  );
  const [servingUnit, setServingUnit] = useState<'g' | 'ml' | 'portion'>(
    initialValue?.mode === 'manual'
      ? initialValue.servingUnit || 'portion'
      : 'portion'
  );
  const [proteinG, setProteinG] = useState(
    initialValue?.mode === 'manual' && initialValue.proteinG !== undefined
      ? String(initialValue.proteinG)
      : ''
  );
  const [carbsG, setCarbsG] = useState(
    initialValue?.mode === 'manual' && initialValue.carbsG !== undefined
      ? String(initialValue.carbsG)
      : ''
  );
  const [fatG, setFatG] = useState(
    initialValue?.mode === 'manual' && initialValue.fatG !== undefined
      ? String(initialValue.fatG)
      : ''
  );
  const [sourceKind, setSourceKind] = useState<
    Exclude<NutritionSourceKind, 'reference-db' | 'recipe'>
  >(
    initialValue?.mode === 'manual' &&
      initialValue.sourceKind &&
      initialValue.sourceKind !== 'reference-db' &&
      initialValue.sourceKind !== 'recipe'
      ? initialValue.sourceKind
      : 'self-entered'
  );
  const [sourceUrl, setSourceUrl] = useState(initialValue?.sourceUrl || '');
  const [sourceNote, setSourceNote] = useState(initialValue?.sourceNote || '');
  const [servings, setServings] = useState(
    initialValue?.mode === 'recipe' && initialValue.recipe
      ? String(initialValue.recipe.servings)
      : '1'
  );
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(() => {
    if (initialValue?.mode === 'recipe' && initialValue.recipe?.ingredients.length) {
      return initialValue.recipe.ingredients.map(item => ({
        id: item.id,
        name: item.name,
        amountG: String(item.amountG),
        kcalPer100g: String(item.kcalPer100g),
        proteinPer100g:
          item.proteinPer100g === undefined ? '' : String(item.proteinPer100g),
        carbsPer100g:
          item.carbsPer100g === undefined ? '' : String(item.carbsPer100g),
        fatPer100g:
          item.fatPer100g === undefined ? '' : String(item.fatPer100g),
        sourceUrl: item.sourceUrl || ''
      }));
    }
    return [newIngredient()];
  });

  const state = useMemo<CustomNutritionEditorState>(() => {
    let input: UserNutritionInput;

    if (mode === 'manual') {
      input = {
        mode: 'manual',
        calories: Number(calories),
        servingAmount: optionalNumber(servingAmount),
        servingUnit,
        proteinG: optionalNumber(proteinG),
        carbsG: optionalNumber(carbsG),
        fatG: optionalNumber(fatG),
        sourceKind,
        sourceUrl: sourceUrl.trim() || undefined,
        sourceNote: sourceNote.trim() || undefined
      };
    } else {
      const parsedIngredients: RecipeIngredientNutrition[] = ingredients.map(
        ingredient => ({
          id: ingredient.id,
          name: ingredient.name,
          amountG: Number(ingredient.amountG),
          kcalPer100g: Number(ingredient.kcalPer100g),
          proteinPer100g: optionalNumber(ingredient.proteinPer100g),
          carbsPer100g: optionalNumber(ingredient.carbsPer100g),
          fatPer100g: optionalNumber(ingredient.fatPer100g),
          sourceUrl: ingredient.sourceUrl.trim() || undefined
        })
      );

      input = {
        mode: 'recipe',
        sourceKind: 'recipe',
        sourceUrl: sourceUrl.trim() || undefined,
        sourceNote: sourceNote.trim() || undefined,
        recipe: {
          servings: Number(servings),
          ingredients: parsedIngredients
        }
      };
    }

    try {
      return {
        input,
        normalized: normalizeUserNutritionInput(input),
        error: ''
      };
    } catch (error) {
      return {
        input: null,
        normalized: null,
        error:
          error instanceof Error
            ? error.message
            : 'Dữ liệu dinh dưỡng chưa hợp lệ.'
      };
    }
  }, [
    calories,
    carbsG,
    fatG,
    ingredients,
    mode,
    proteinG,
    servingAmount,
    servingUnit,
    servings,
    sourceKind,
    sourceNote,
    sourceUrl
  ]);

  useEffect(() => {
    onChange(state);
  }, [onChange, state]);

  const consistency = state.normalized
    ? consistencyLabel(state.normalized)
    : null;

  if (mode === 'recipe') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3 text-[11px] font-semibold leading-relaxed text-violet-900">
          nOcnOm tính theo từng nguyên liệu và chia cho số khẩu phần. Calo có thể tính được dù một số nguyên liệu thiếu macro; Protein / Carb / Fat chỉ được coi là đủ khi <strong>tất cả nguyên liệu</strong> có đủ ba giá trị.
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <label className="block">
            <span className="text-[10px] font-black uppercase text-slate-600">
              Số khẩu phần của công thức
            </span>
            <input
              type="number"
              min="1"
              max="100"
              value={servings}
              onChange={event => setServings(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950"
            />
          </label>
          <button
            type="button"
            onClick={() => setIngredients(current => [...current, newIngredient()])}
            className="h-11 rounded-xl border border-violet-200 bg-white px-3 text-xs font-black text-violet-700 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Nguyên liệu
          </button>
        </div>

        <div className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div
              key={ingredient.id}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-black text-slate-800">
                  Nguyên liệu {index + 1}
                </div>
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setIngredients(current =>
                        current.filter(item => item.id !== ingredient.id)
                      )
                    }
                    className="h-9 w-9 rounded-xl text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                    aria-label={`Xóa nguyên liệu ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <input
                value={ingredient.name}
                onChange={event =>
                  setIngredients(current =>
                    current.map(item =>
                      item.id === ingredient.id
                        ? { ...item, name: event.target.value }
                        : item
                    )
                  )
                }
                placeholder="Tên nguyên liệu, ví dụ: Ức gà"
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold"
              />

              <div className="mt-2 grid grid-cols-2 gap-2">
                <label>
                  <span className="text-[9px] font-black uppercase text-slate-500">
                    Khối lượng (g)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ingredient.amountG}
                    onChange={event =>
                      setIngredients(current =>
                        current.map(item =>
                          item.id === ingredient.id
                            ? { ...item, amountG: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-2.5 text-sm font-bold"
                  />
                </label>
                <label>
                  <span className="text-[9px] font-black uppercase text-slate-500">
                    kcal / 100 g
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ingredient.kcalPer100g}
                    onChange={event =>
                      setIngredients(current =>
                        current.map(item =>
                          item.id === ingredient.id
                            ? { ...item, kcalPer100g: event.target.value }
                            : item
                        )
                      )
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-2.5 text-sm font-bold"
                  />
                </label>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {([
                  ['proteinPer100g', 'Protein'],
                  ['carbsPer100g', 'Carb'],
                  ['fatPer100g', 'Fat']
                ] as const).map(([field, label]) => (
                  <label key={field}>
                    <span className="text-[9px] font-black text-slate-500">
                      {label}/100g
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={ingredient[field]}
                      onChange={event =>
                        setIngredients(current =>
                          current.map(item =>
                            item.id === ingredient.id
                              ? { ...item, [field]: event.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="--"
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-2 text-sm font-bold"
                    />
                  </label>
                ))}
              </div>

              <input
                type="url"
                value={ingredient.sourceUrl}
                onChange={event =>
                  setIngredients(current =>
                    current.map(item =>
                      item.id === ingredient.id
                        ? { ...item, sourceUrl: event.target.value }
                        : item
                    )
                  )
                }
                placeholder="URL nguồn nguyên liệu (không bắt buộc)"
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold"
              />
            </div>
          ))}
        </div>

        {state.normalized && (
          <div className="rounded-2xl border border-violet-200 bg-white p-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">
              Kết quả / khẩu phần
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-base font-black text-slate-950">
                  {state.normalized.calories}
                </div>
                <div className="text-[9px] font-bold text-slate-500">kcal</div>
              </div>
              {[
                ['P', state.normalized.proteinG],
                ['C', state.normalized.carbsG],
                ['F', state.normalized.fatG]
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div className="text-base font-black text-slate-950">
                    {value === undefined ? '—' : value}
                  </div>
                  <div className="text-[9px] font-bold text-slate-500">
                    {label} (g)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <SourceFields
          sourceUrl={sourceUrl}
          sourceNote={sourceNote}
          onSourceUrl={setSourceUrl}
          onSourceNote={setSourceNote}
          recipe
        />

        <ValidationState state={state} consistency={consistency} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-[11px] font-semibold leading-relaxed text-blue-900">
        Nhập theo <strong>cùng một khẩu phần</strong>. Protein / Carb / Fat là tùy chọn, nhưng nếu nhập thì phải đủ cả ba. nOcnOm không suy ngược macro từ số kcal.
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-black uppercase text-slate-600">
            Năng lượng / khẩu phần
          </span>
          <div className="mt-1.5 relative">
            <input
              type="number"
              min="1"
              max="5000"
              step="0.1"
              value={calories}
              onChange={event => setCalories(event.target.value)}
              placeholder="Ví dụ 520"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-3 pr-12 text-sm font-bold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">
              kcal
            </span>
          </div>
        </label>

        <label className="block">
          <span className="text-[10px] font-black uppercase text-slate-600">
            Khẩu phần
          </span>
          <div className="mt-1.5 flex">
            <input
              type="number"
              min="0.1"
              max="5000"
              step="0.1"
              value={servingAmount}
              onChange={event => setServingAmount(event.target.value)}
              placeholder="Không bắt buộc"
              className="h-11 min-w-0 flex-1 rounded-l-xl border border-r-0 border-slate-300 bg-white px-3 text-sm font-bold"
            />
            <select
              value={servingUnit}
              onChange={event =>
                setServingUnit(event.target.value as 'g' | 'ml' | 'portion')
              }
              className="h-11 rounded-r-xl border border-slate-300 bg-slate-50 px-2 text-xs font-black"
            >
              <option value="portion">phần</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
            </select>
          </div>
        </label>
      </div>

      <div>
        <div className="text-[10px] font-black uppercase text-slate-600">
          Macro / cùng khẩu phần
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {[
            ['Protein', proteinG, setProteinG],
            ['Carb', carbsG, setCarbsG],
            ['Fat', fatG, setFatG]
          ].map(([label, value, setter]) => (
            <label key={label as string} className="block">
              <span className="text-[9px] font-bold text-slate-500">
                {label as string} (g)
              </span>
              <input
                type="number"
                min="0"
                max="500"
                step="0.1"
                value={value as string}
                onChange={event =>
                  (setter as (value: string) => void)(event.target.value)
                }
                placeholder="--"
                className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-2.5 text-sm font-bold"
              />
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] font-black uppercase text-slate-600">
          Nguồn dữ liệu
        </span>
        <select
          value={sourceKind}
          onChange={event =>
            setSourceKind(
              event.target.value as Exclude<
                NutritionSourceKind,
                'reference-db' | 'recipe'
              >
            )
          }
          className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold"
        >
          {sourceOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <SourceFields
        sourceUrl={sourceUrl}
        sourceNote={sourceNote}
        onSourceUrl={setSourceUrl}
        onSourceNote={setSourceNote}
      />

      <ValidationState state={state} consistency={consistency} />
    </div>
  );
}

function SourceFields({
  sourceUrl,
  sourceNote,
  onSourceUrl,
  onSourceNote,
  recipe = false
}: {
  sourceUrl: string;
  sourceNote: string;
  onSourceUrl: (value: string) => void;
  onSourceNote: (value: string) => void;
  recipe?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <input
        type="url"
        value={sourceUrl}
        onChange={event => onSourceUrl(event.target.value)}
        placeholder={
          recipe
            ? 'URL công thức / nguồn tham khảo (không bắt buộc)'
            : 'URL nguồn dinh dưỡng (không bắt buộc)'
        }
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
      />
      <textarea
        value={sourceNote}
        onChange={event => onSourceNote(event.target.value)}
        rows={2}
        placeholder="Ghi chú nguồn, cách cân hoặc thông tin khẩu phần..."
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
      />
    </div>
  );
}

function ValidationState({
  state,
  consistency
}: {
  state: CustomNutritionEditorState;
  consistency:
    | {
        label: string;
        className: string;
      }
    | null;
}) {
  if (state.error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold leading-relaxed text-amber-900 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {state.error}
      </div>
    );
  }

  if (!state.normalized || !consistency) return null;

  return (
    <div className={`rounded-xl border px-3 py-2 text-[10px] font-bold leading-relaxed flex items-start gap-2 ${consistency.className}`}>
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        {consistency.label}
        {state.normalized.macroEnergyKcal !== undefined &&
          state.normalized.macroEnergyDeltaPct !== undefined && (
            <span className="block mt-0.5">
              4P + 4C + 9F ≈ {state.normalized.macroEnergyKcal} kcal · lệch {state.normalized.macroEnergyDeltaPct}% so với kcal đã nhập/tính.
            </span>
          )}
      </div>
    </div>
  );
}
