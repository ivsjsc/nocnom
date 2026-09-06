import { useEffect, useMemo, useState } from 'react';
import { Clipboard, Eye, Pencil, Plus, Star } from 'lucide-react';
import { estimateDishCalories, mockDb, type Category, type Dish, type LogEntry } from '../lib/db';
import DishDetailModal from './DishDetailModal';
import DishImage from './DishImage';

export default function MenuPage({ canManage = false }: { canManage?: boolean }) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);

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

  const visibleDishes = useMemo(
    () => activeCategory === 'all' ? dishes : dishes.filter(dish => dish.categoryId === activeCategory),
    [activeCategory, dishes]
  );

  const categoryName = (categoryId: string) =>
    categories.find(category => category.id === categoryId)?.name || 'Món ăn';

  const handleAddDish = async () => {
    if (!canManage) {
      window.alert('Vui lòng đăng nhập để quản lý kho món.');
      return;
    }

    const name = window.prompt('Tên món mới:');
    if (!name?.trim()) return;

    const options = categories.map((category, index) => (index + 1) + '. ' + category.name).join('\n');
    const raw = window.prompt('Chọn danh mục bằng số:\n' + options, '1');
    const index = Number(raw) - 1;
    const category = categories[index];
    if (!category) {
      window.alert('Danh mục không hợp lệ.');
      return;
    }

    const result = await mockDb.addDish(name.trim(), category.id);

    if (result.nutritionMatched && typeof result.dish.calories === 'number') {
      window.alert(
        'Đã nhận diện món trong dữ liệu calo: ' +
          result.dish.name +
          ' · ≈ ' +
          result.dish.calories +
          ' kcal/phần.'
      );
    }
  };

  const handleEditDish = (dish: Dish) => {
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
      mockDb.updateDishImage(dish.id, newImage.trim());
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
      <section className="rounded-[30px] bg-gradient-to-br from-[#3f63f4] to-[#2f4ed8] text-white p-7 shadow-lg shadow-blue-900/10">
        <div className="text-xs font-black uppercase tracking-wide text-blue-50">Quản lý kho món</div>

        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <div className="text-[11px] font-black uppercase text-blue-50">Tổng số món</div>
            <div className="mt-1 text-2xl font-black">{dishes.length}</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <div className="text-[11px] font-black uppercase text-blue-50">Lượt phục vụ</div>
            <div className="mt-1 text-2xl font-black text-orange-400">{logs.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5">
          <button
            type="button"
            onClick={handleAddDish}
            className="rounded-2xl border border-white/20 bg-white/10 h-12 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wide hover:bg-white/15"
          >
            <Plus className="w-4 h-4" />
            Món mới
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-2xl border border-white/20 bg-white/10 h-12 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wide hover:bg-white/15"
          >
            <Clipboard className="w-4 h-4" />
            Sao chép
          </button>
        </div>
      </section>

      {!canManage && (
        <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs font-semibold text-blue-700">
          Đang ở chế độ xem. Nhấn avatar NG ở góc trên để đăng nhập và quản lý kho món.
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={
            'shrink-0 min-w-14 px-4 min-h-11 rounded-xl text-[11px] font-black uppercase ' +
            (activeCategory === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-slate-900 border border-slate-100')
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
              'shrink-0 max-w-28 px-4 min-h-11 rounded-xl text-[11px] leading-tight font-black uppercase ' +
              (activeCategory === category.id ? 'bg-blue-500 text-white' : 'bg-white text-slate-900 border border-slate-100')
            }
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visibleDishes.map(dish => (
          <article
            key={dish.id}
            className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-4 flex items-center gap-4"
          >
            <DishImage src={dish.imageUrl} alt={dish.name} className="w-16 h-16 rounded-2xl shrink-0 border border-slate-100" />

            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black uppercase text-blue-500">{categoryName(dish.categoryId)}</div>
              <h3 className="mt-1 font-black text-sm text-slate-950 leading-snug">{dish.name}</h3>
              <div className="mt-1 text-[10px] font-black uppercase text-slate-500">
                {dish.vendors.length} quán bán · ≈ {estimateDishCalories(dish)} kcal
              </div>
            </div>

            <div className="w-[92px] shrink-0 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => handleEditDish(dish)}
                className="min-w-11 min-h-11 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center"
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
                className="min-w-11 min-h-11 rounded-xl bg-slate-900 text-slate-500 flex items-center justify-center"
                aria-label={'Yêu thích ' + dish.name}
              >
                <Star className={'w-4 h-4 ' + (dish.isFavorite ? 'fill-yellow-400 text-yellow-400' : '')} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDish(dish)}
                className="col-span-2 min-h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"
                aria-label={'Xem ' + dish.name}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </article>
        ))}
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
    </div>
  );
}
