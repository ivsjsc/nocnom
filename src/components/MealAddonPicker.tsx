import { useMemo, useState } from 'react';
import {
  Apple,
  Cookie,
  CupSoda,
  Plus,
  UtensilsCrossed,
  X
} from 'lucide-react';
import {
  MEAL_ADDON_KIND_LABELS,
  defaultServingUnitForAddonKind,
  type MealAddonKind,
  type ServingUnit
} from '../domain/meal/addonNormalizer';
import { mockDb } from '../lib/db';
import type { NutritionAddonOption } from '../lib/nutritionKnowledge';
import { useMealAddonCatalog } from '../hooks/useMealAddonCatalog';

export type MealAddonSelection = {
  fruitId: string;
  drinkId: string;
  sideId: string;
  dessertId: string;
};

type Props = {
  value: MealAddonSelection;
  onChange: (value: MealAddonSelection) => void;
  disabled?: boolean;
  compact?: boolean;
};

type SelectionKey = keyof MealAddonSelection;

const selectionKeyForKind: Record<MealAddonKind, SelectionKey> = {
  fruit: 'fruitId',
  drink: 'drinkId',
  side: 'sideId',
  dessert: 'dessertId'
};

const labelFor = (item: NutritionAddonOption) => {
  const amount = item.servingAmount ?? item.servingG;
  const unit =
    item.servingUnit ??
    defaultServingUnitForAddonKind(item.kind);
  const serving = amount ? ` · ${amount}${unit}` : '';
  const custom = item.source === 'user' ? ' · của bạn' : '';
  return `${item.name} · ≈ ${item.calories} kcal${serving}${custom}`;
};

export default function MealAddonPicker({
  value,
  onChange,
  disabled = false,
  compact = false
}: Props) {
  const { items, loading } = useMealAddonCatalog();
  const [showCreate, setShowCreate] = useState(false);
  const [draftKind, setDraftKind] = useState<MealAddonKind>('fruit');
  const [draftName, setDraftName] = useState('');
  const [draftCalories, setDraftCalories] = useState('');
  const [draftAmount, setDraftAmount] = useState('');
  const [draftUnit, setDraftUnit] = useState<ServingUnit>('g');
  const [createError, setCreateError] = useState('');

  const byKind = useMemo(() => {
    const grouped: Record<MealAddonKind, NutritionAddonOption[]> = {
      fruit: [],
      drink: [],
      side: [],
      dessert: []
    };

    items.forEach(item => {
      grouped[item.kind].push(item);
    });

    Object.values(grouped).forEach(group =>
      group.sort((a, b) =>
        a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
      )
    );

    return grouped;
  }, [items]);

  const fields: Array<{
    key: SelectionKey;
    kind: MealAddonKind;
    label: string;
    icon: typeof Apple;
  }> = [
    { key: 'fruitId', kind: 'fruit', label: 'Trái cây', icon: Apple },
    { key: 'drinkId', kind: 'drink', label: 'Đồ uống', icon: CupSoda },
    { key: 'sideId', kind: 'side', label: 'Món phụ', icon: UtensilsCrossed },
    { key: 'dessertId', kind: 'dessert', label: 'Tráng miệng', icon: Cookie }
  ];

  const changeDraftKind = (kind: MealAddonKind) => {
    setDraftKind(kind);
    setDraftUnit(defaultServingUnitForAddonKind(kind));
    setCreateError('');
  };

  const createAddon = () => {
    const name = draftName.trim();
    const calories = Number(draftCalories);
    const servingAmount = draftAmount.trim()
      ? Number(draftAmount)
      : undefined;

    if (!name) {
      setCreateError('Nhập tên món kèm, ví dụ: Dưa hấu hoặc Nước ép cam.');
      return;
    }

    if (
      !Number.isFinite(calories) ||
      calories < 0 ||
      calories > 2000
    ) {
      setCreateError('Calo/phần phải từ 0 đến 2.000 kcal.');
      return;
    }

    if (
      servingAmount !== undefined &&
      (!Number.isFinite(servingAmount) ||
        servingAmount <= 0 ||
        servingAmount > 5000)
    ) {
      setCreateError('Khẩu phần phải lớn hơn 0 và không quá 5.000.');
      return;
    }

    try {
      const item = mockDb.addMealAddon({
        kind: draftKind,
        name,
        calories,
        servingAmount,
        servingUnit: draftUnit
      });

      const key = selectionKeyForKind[draftKind];
      onChange({
        ...value,
        [key]: item.id
      });

      setDraftName('');
      setDraftCalories('');
      setDraftAmount('');
      setCreateError('');
      setShowCreate(false);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : 'Không thể tạo món kèm.'
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 gap-2 sm:grid-cols-2'}>
        {fields.map(field => {
          const Icon = field.icon;

          return (
            <label key={field.key} className="block">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-300">
                <Icon className="h-3.5 w-3.5" />
                {field.label} · không bắt buộc
              </span>
              <select
                value={value[field.key]}
                disabled={disabled || loading}
                onChange={event =>
                  onChange({
                    ...value,
                    [field.key]: event.target.value
                  })
                }
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-950 dark:text-slate-100 disabled:opacity-60"
              >
                <option value="">
                  {loading ? 'Đang tải dữ liệu calorie...' : '— Không thêm —'}
                </option>
                {byKind[field.kind].map(item => (
                  <option key={item.id} value={item.id}>
                    {labelFor(item)}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      {!disabled && (
        <div className="rounded-2xl border border-dashed border-blue-200 dark:border-blue-800 bg-white/80 dark:bg-slate-950/40">
          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex min-h-11 w-full items-center justify-center gap-2 px-4 text-xs font-black text-blue-700 dark:text-blue-300"
            >
              <Plus className="h-4 w-4" />
              Tạo món kèm của tôi
            </button>
          ) : (
            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-slate-950 dark:text-white">
                    Tạo món kèm
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Ví dụ: Trái cây → Dưa hấu; Đồ uống → Nước ép cam.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setCreateError('');
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500"
                  aria-label="Đóng tạo món kèm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] font-black text-slate-500">Danh mục</span>
                  <select
                    value={draftKind}
                    onChange={event =>
                      changeDraftKind(event.target.value as MealAddonKind)
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold"
                  >
                    {(Object.keys(MEAL_ADDON_KIND_LABELS) as MealAddonKind[]).map(kind => (
                      <option key={kind} value={kind}>
                        {MEAL_ADDON_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-slate-500">Tên món kèm</span>
                  <input
                    value={draftName}
                    onChange={event => setDraftName(event.target.value)}
                    placeholder={draftKind === 'drink' ? 'Nước ép cam' : 'Dưa hấu'}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-slate-500">Calo / phần</span>
                  <input
                    type="number"
                    min="0"
                    max="2000"
                    inputMode="decimal"
                    value={draftCalories}
                    onChange={event => setDraftCalories(event.target.value)}
                    placeholder="Ví dụ: 80"
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold"
                  />
                </label>

                <div className="grid grid-cols-[1fr_82px] gap-2">
                  <label className="block">
                    <span className="text-[10px] font-black text-slate-500">Khẩu phần</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={draftAmount}
                      onChange={event => setDraftAmount(event.target.value)}
                      placeholder="200"
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black text-slate-500">Đơn vị</span>
                    <select
                      value={draftUnit}
                      onChange={event =>
                        setDraftUnit(event.target.value as ServingUnit)
                      }
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-bold"
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="portion">phần</option>
                    </select>
                  </label>
                </div>
              </div>

              {createError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {createError}
                </div>
              )}

              <button
                type="button"
                onClick={createAddon}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white active:scale-[0.99]"
              >
                <Plus className="h-4 w-4" />
                Tạo và chọn món kèm
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
