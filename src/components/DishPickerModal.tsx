import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { estimateDishCalories, type Category, type Dish } from '../lib/db';
import DishImage from './DishImage';

type Props = {
  title: string;
  dishes: Dish[];
  categories?: Category[];
  selectedDishId?: string;
  onSelect: (dish: Dish) => void;
  onClose: () => void;
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export default function DishPickerModal({
  title,
  dishes,
  categories = [],
  selectedDishId,
  onSelect,
  onClose
}: Props) {
  const [query, setQuery] = useState('');

  const categoryLookup = useMemo(
    () => new Map(categories.map(category => [category.id, category.name])),
    [categories]
  );

  const visibleDishes = useMemo(() => {
    const needle = normalizeText(query);
    if (!needle) return dishes;

    return dishes.filter(dish => {
      const searchable = [
        dish.name,
        categoryLookup.get(dish.categoryId) || '',
        ...dish.vendors.map(vendor => vendor.name)
      ]
        .map(normalizeText)
        .join(' ');

      return searchable.includes(needle);
    });
  }, [categoryLookup, dishes, query]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-lg max-h-[86vh] bg-white rounded-[26px] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">nOcnOm</div>
              <h3 className="truncate text-lg font-black text-slate-950">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 shrink-0 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <label className="relative mt-4 block">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Tìm tên món, danh mục hoặc quán..."
              autoFocus
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-semibold text-slate-950 placeholder:text-slate-400"
              aria-label="Tìm món ăn"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
                aria-label="Xóa nội dung tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </label>

          <div className="mt-2 px-1 text-[10px] font-bold text-slate-400">
            {visibleDishes.length} món phù hợp
          </div>
        </div>

        <div className="p-3 overflow-y-auto">
          {visibleDishes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
              <Search className="mx-auto h-6 w-6 text-slate-300" />
              <div className="mt-2 text-sm font-bold text-slate-600">Không tìm thấy món phù hợp.</div>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-3 text-xs font-black text-blue-600"
              >
                Xóa tìm kiếm
              </button>
            </div>
          ) : (
            visibleDishes.map(dish => {
              const category = categoryLookup.get(dish.categoryId);
              const isCurrent = dish.id === selectedDishId;

              return (
                <button
                  type="button"
                  key={dish.id}
                  onClick={() => onSelect(dish)}
                  className={
                    'w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-colors ' +
                    (isCurrent ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-blue-50')
                  }
                >
                  <DishImage src={dish.imageUrl} alt={dish.name} className="w-12 h-12 rounded-2xl shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-slate-950 truncate">{dish.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-500">
                      {category && <span>{category}</span>}
                      <span>≈ {estimateDishCalories(dish)} kcal</span>
                      <span>{dish.vendors.length} quán</span>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="shrink-0 rounded-lg bg-blue-600 px-2 py-1 text-[9px] font-black uppercase text-white">
                      Hiện tại
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
