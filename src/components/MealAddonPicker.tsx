import { useEffect, useMemo, useState } from 'react';
import { Apple, CupSoda } from 'lucide-react';
import {
  loadNutritionAddons,
  type NutritionAddonKind,
  type NutritionAddonOption
} from '../lib/nutritionKnowledge';

export type MealAddonSelection = {
  fruitId: string;
  drinkId: string;
};

type Props = {
  value: MealAddonSelection;
  onChange: (value: MealAddonSelection) => void;
  disabled?: boolean;
  compact?: boolean;
};

const labelFor = (item: NutritionAddonOption) => {
  const amount = item.servingAmount ?? item.servingG;
  const unit =
    item.servingUnit ??
    (item.kind === 'drink' ? 'ml' : 'g');
  const serving = amount ? ` · ${amount}${unit}` : '';
  return `${item.name} · ≈ ${item.calories} kcal${serving}`;
};

export default function MealAddonPicker({
  value,
  onChange,
  disabled = false,
  compact = false
}: Props) {
  const [items, setItems] = useState<NutritionAddonOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void loadNutritionAddons().then(rows => {
      if (!active) return;
      setItems(rows);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const byKind = useMemo(() => {
    const fruit: NutritionAddonOption[] = [];
    const drink: NutritionAddonOption[] = [];

    items.forEach(item => {
      if (item.kind === 'fruit') fruit.push(item);
      if (item.kind === 'drink') drink.push(item);
    });

    return { fruit, drink } satisfies Record<NutritionAddonKind, NutritionAddonOption[]>;
  }, [items]);

  const fields: Array<{
    key: keyof MealAddonSelection;
    kind: NutritionAddonKind;
    label: string;
    icon: typeof Apple;
  }> = [
    { key: 'fruitId', kind: 'fruit', label: 'Trái cây', icon: Apple },
    { key: 'drinkId', kind: 'drink', label: 'Nước uống', icon: CupSoda }
  ];

  return (
    <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 gap-2 sm:grid-cols-2'}>
      {fields.map(field => {
        const Icon = field.icon;

        return (
          <label key={field.key} className="block">
            <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500">
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
  );
}
