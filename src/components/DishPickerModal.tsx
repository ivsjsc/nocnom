import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion } from 'motion/react';
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

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

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
    <motion.div
      className="fixed inset-0 z-[130] bg-slate-950/55 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onMouseDown={event => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <motion.div
        initial={{ y: 48, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 48, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="w-full max-w-lg max-h-[86vh] bg-white dark:bg-slate-900 rounded-[26px] overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">nOcnOm</div>
              <h3 className="truncate text-lg font-black text-slate-900 dark:text-slate-100">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <label className="relative mt-3 block">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Tìm tên món, danh mục hoặc quán..."
              autoFocus
              className="h-11 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              aria-label="Tìm món ăn"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Xóa nội dung tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </label>

          <div className="mt-2 px-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {visibleDishes.length} món phù hợp
          </div>
        </div>

        <div className="p-3 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 space-y-1">
          {visibleDishes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 px-5 py-10 text-center">
              <Search className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" />
              <div className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-400">Không tìm thấy món phù hợp.</div>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-3 text-xs font-black text-blue-600 dark:text-blue-400 hover:underline"
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
                    'w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all ' +
                    (isCurrent
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 ring-1 ring-blue-300 dark:ring-blue-800'
                      : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/70')
                  }
                >
                  <DishImage src={dish.imageUrl} alt={dish.name} className="w-12 h-12 rounded-2xl shrink-0 border border-slate-100 dark:border-slate-800" />
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-slate-900 dark:text-slate-100 truncate">{dish.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {category && <span className="text-blue-600 dark:text-blue-400 font-extrabold">{category}</span>}
                      <span>≈ {estimateDishCalories(dish)} kcal</span>
                      <span>{dish.vendors.length} quán</span>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="shrink-0 rounded-lg bg-blue-600 dark:bg-blue-500 px-2 py-1 text-[9px] font-black uppercase text-white shadow-xs">
                      Hiện tại
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
