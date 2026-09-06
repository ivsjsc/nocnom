import { useEffect, useMemo, useState } from 'react';
import { Clipboard, Eye, Pencil, Plus, Search, Star, X } from 'lucide-react';
import { estimateDishCalories, mockDb, type Category, type Dish, type LogEntry } from '../lib/db';
import DishDetailModal from './DishDetailModal';
import AddDishModal from './AddDishModal';
import DishImage from './DishImage';

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export default function MenuPage({ canManage = false }: { canManage?: boolean }) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [isAddingDish, setIsAddingDish] = useState(false);

  useEffect(() => {
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    const unsubCategories = mockDb.subscribeCategories(setCategories);
    const unsubLogs = mockDb.subscribeLogs(setLogs);
    return () => {
      unsubDishes();
      unsubCategories();
      unsubLogs();
    };
  }, []);

  const categoryLookup = useMemo(
    () => new Map(categories.map(category => [category.id, category.name])),
    [categories]
  );

  const visibleDishes = useMemo(() => {
    const needle = normalizeText(searchQuery);
    return dishes.filter(dish => {
      if (activeCategory !== 'all' && dish.categoryId !== activeCategory) {
        return false;
      }
      if (!needle) return true;

      const searchable = [
        dish.name,
        categoryLookup.get(dish.categoryId) || '',
        ...dish.vendors.map(vendor => vendor.name)
      ]
        .map(normalizeText)
        .join(' ');

      return searchable.includes(needle);
    });
  }, [activeCategory, categoryLookup, dishes, searchQuery]);

  const categoryName = (categoryId: string) =>
    categories.find(category => category.id === categoryId)?.name || 'Món ăn';

  const handleAddDish = () => {
    if (!canManage) {
      window.alert('Vui lòng đăng nhập để quản lý kho món.');
      return;
    }

    setIsAddingDish(true);
  };

  const handleEditDish = async (dish: Dish) => {
    if (!canManage) {
      window.alert('Vui lòng đăng nhập để chỉnh sửa món.');
      return;
    }

    const newName = window.prompt('Tên món:', dish.name);
    if (newName?.trim() && newName.trim() !== dish.name) {
      mockDb.updateDishName(dish.id, newName.trim());
    }

    const newImage = window.prompt('URL hình ảnh:', dish.imageUrl || '');
    if (newImage !== null && newImage !== (dish.imageUrl || '')) {
      try {
        await mockDb.updateDishImage(dish.id, newImage.trim());
      } catch (error) {
        window.alert(
          error instanceof Error
            ? error.message
            : 'URL hình ảnh không hợp lệ.'
        );
      }
    }

    const rawCalories = window.prompt(
      'Năng lượng ước tính (kcal/phần):',
      String(estimateDishCalories(dish))
    );
    if (rawCalories !== null) {
      const calories = Number(rawCalories);
      if (Number.isFinite(calories) && calories > 0 && calories <= 5000) {
        mockDb.updateDishCalories(dish.id, calories);
      } else if (rawCalories.trim()) {
        window.alert('Calo phải là số từ 1 đến 5000 kcal/phần.');
      }
    }

    if (window.confirm('Bạn có muốn thêm một quán phục vụ cho món này?')) {
      const vendorName = window.prompt('Tên quán:');
      if (!vendorName?.trim()) return;
      const rawPrice = window.prompt('Giá (VND):', '30000');
      const price = Number(rawPrice);
      if (!Number.isFinite(price) || price < 0) return;
      const phone = window.prompt('Số điện thoại:', '') || '';
      const address = window.prompt('Địa chỉ:', '') || '';
      mockDb.addVendor(dish.id, vendorName.trim(), price, phone, address);
    }
  };

  const handleCopy = async () => {
    if (!canManage) {
      window.alert('Vui lòng đăng nhập để sao chép dữ liệu quản lý.');
      return;
    }

    const payload = JSON.stringify({
      dishes: mockDb.getDishesSync(),
      categories: mockDb.getCategoriesSync()
    }, null, 2);

    try {
      await navigator.clipboard.writeText(payload);
      window.alert('Đã sao chép dữ liệu kho món.');
    } catch {
      window.alert('Trình duyệt không cho phép sao chép tự động.');
    }
  };

  return (
    <div className="space-y-5 pb-28">
      <section className="rounded-[30px] bg-gradient-to-br from-[#3f63f4] to-[#2f4ed8] text-white p-6 shadow-lg shadow-blue-900/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black uppercase tracking-wide text-blue-100">Quản lý kho món</div>
          <div className="text-[11px] font-extrabold text-blue-200">{dishes.length} món</div>
        </div>

        {/* Search input in Kho Mon */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Tìm tên món, danh mục hoặc quán..."
            className="h-11 w-full rounded-2xl border border-white/20 bg-white/10 pl-10 pr-10 text-xs font-semibold text-white placeholder:text-blue-200/70 focus:border-white focus:bg-white/20 focus:outline-none transition-all"
            aria-label="Tìm kiếm trong Kho món"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-blue-200 hover:bg-white/20 transition-colors"
              aria-label="Xóa nội dung tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-3.5">
            <div className="text-[10px] font-black uppercase text-blue-100">Tổng số món</div>
            <div className="mt-0.5 text-xl font-black">{dishes.length}</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-3.5">
            <div className="text-[10px] font-black uppercase text-blue-100">Lượt phục vụ</div>
            <div className="mt-0.5 text-xl font-black text-amber-200">{logs.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleAddDish}
            className="rounded-2xl border border-white/20 bg-white/10 h-11 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wide hover:bg-white/15 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Món mới
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-2xl border border-white/20 bg-white/10 h-11 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wide hover:bg-white/15 transition-colors"
          >
            <Clipboard className="w-4 h-4" />
            Sao chép
          </button>
        </div>
      </section>

      {!canManage && (
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 px-4 py-3 text-xs font-semibold text-blue-700 dark:text-blue-300">
          Đang ở chế độ xem. Nhấn avatar NG ở góc trên để đăng nhập và quản lý kho món.
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={
            'shrink-0 min-w-14 px-4 min-h-11 rounded-xl text-[11px] font-black uppercase transition-colors ' +
            (activeCategory === 'all'
              ? 'bg-blue-600 dark:bg-blue-500 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700')
          }
        >
          Tất cả
        </button>
        {categories.map(category => (
          <button
            type="button"
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={
              'shrink-0 max-w-32 px-4 min-h-11 rounded-xl text-[11px] leading-tight font-black uppercase transition-colors ' +
              (activeCategory === category.id
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700')
            }
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visibleDishes.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <div className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-400">Không tìm thấy món ăn nào.</div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs font-black text-blue-600 dark:text-blue-400 hover:underline"
              >
                Xóa từ khóa tìm kiếm
              </button>
            )}
          </div>
        ) : (
          visibleDishes.map(dish => (
            <article
              key={dish.id}
              className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex items-center gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <DishImage src={dish.imageUrl} alt={dish.name} className="w-16 h-16 rounded-2xl shrink-0 border border-slate-100 dark:border-slate-800" />

              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400">{categoryName(dish.categoryId)}</div>
                <h3 className="mt-1 font-black text-sm text-slate-900 dark:text-slate-100 leading-snug">{dish.name}</h3>
                <div className="mt-1 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  {dish.vendors.length} quán bán · ≈ {estimateDishCalories(dish)} kcal
                </div>
              </div>

              <div className="w-[92px] shrink-0 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleEditDish(dish)}
                  className="min-w-11 min-h-11 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 flex items-center justify-center transition-colors"
                  aria-label={'Sửa ' + dish.name}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canManage) {
                      window.alert('Vui lòng đăng nhập để thay đổi yêu thích.');
                      return;
                    }
                    mockDb.toggleFavoriteDish(dish.id);
                  }}
                  className="min-w-11 min-h-11 rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center transition-colors"
                  aria-label={'Yêu thích ' + dish.name}
                >
                  <Star className={'w-4 h-4 ' + (dish.isFavorite ? 'fill-yellow-400 text-yellow-400' : '')} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDish(dish)}
                  className="col-span-2 min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center justify-center transition-colors"
                  aria-label={'Xem ' + dish.name}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {selectedDish && (
        <DishDetailModal
          dish={selectedDish}
          day="mon"
          comboKey="A"
          isSelectable={false}
          onClose={() => setSelectedDish(null)}
        />
      )}

      {isAddingDish && (
        <AddDishModal
          categories={categories}
          onClose={() => setIsAddingDish(false)}
          onSaved={(dish, created) => {
            setIsAddingDish(false);
            window.alert(
              created
                ? 'Đã thêm ' + dish.name + ' vào kho món.'
                : 'Món đã tồn tại. Đã cập nhật dữ liệu và bổ sung quán/ảnh nếu có.'
            );
          }}
        />
      )}
    </div>
  );
}
