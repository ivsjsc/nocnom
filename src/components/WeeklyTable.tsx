import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { mockDb, type Category, type Dish, type Timetable } from '../lib/db';
import DishDetailModal from './DishDetailModal';
import DishImage from './DishImage';

const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const comboKeys = ['A', 'B', 'C'] as const;
const dayDisplay: Record<string, string> = {
  mon: 'Thứ Hai',
  tue: 'Thứ Ba',
  wed: 'Thứ Tư',
  thu: 'Thứ Năm',
  fri: 'Thứ Sáu',
  sat: 'Thứ Bảy',
  sun: 'Chủ Nhật'
};

export default function WeeklyTable() {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<{ dish: Dish; day: string; comboKey: 'A' | 'B' | 'C' } | null>(null);
  const [swapTarget, setSwapTarget] = useState<{ day: string; comboKey: 'A' | 'B' | 'C' } | null>(null);

  const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

  useEffect(() => {
    const unsubTable = mockDb.subscribe('all', setTimetable);
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    const unsubCategories = mockDb.subscribeCategories(setCategories);
    return () => {
      unsubTable();
      unsubDishes();
      unsubCategories();
    };
  }, []);

  if (!timetable || dishes.length === 0) return null;

  const findDish = (dishId: string) => dishes.find(item => item.id === dishId);
  const categoryName = (dish: Dish) =>
    categories.find(category => category.id === dish.categoryId)?.name || 'Món ăn';

  return (
    <div className="space-y-6 pb-28">
      <section className="bg-white rounded-[26px] border border-slate-200 shadow-sm p-6">
        <h2 className="text-2xl font-black tracking-[0.22em] text-slate-950">LỊCH ĂN</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 font-medium">
          Chọn, điều chỉnh hay thay thế từng món cho 7 ngày và lịch này sẽ phản ánh ngay trên trang Chủ.
        </p>
      </section>

      <div className="space-y-4">
        {dayOrder.map(day => {
          const menu = timetable[day];
          return (
            <section key={day} className="bg-white rounded-[26px] border border-slate-200 shadow-sm p-5">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-[11px] font-black uppercase text-slate-400">Ngày</div>
                  <h3 className="text-xl font-black text-slate-950">{dayDisplay[day]}</h3>
                </div>
                <span className="text-xs font-black text-blue-600">3 món</span>
              </div>

              <div className="space-y-3">
                {comboKeys.map((comboKey, index) => {
                  const dish = findDish(menu.options[comboKey].dishId);
                  if (!dish) return null;

                  return (
                    <article key={comboKey} className="rounded-[18px] bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-slate-400 w-5">#{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-sm text-slate-950 truncate">{dish.name}</div>
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            {categoryName(dish)}
                          </div>
                        </div>
                        <DishImage src={dish.imageUrl} alt={dish.name} className="w-11 h-11 rounded-full shrink-0 border border-slate-100" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setSelected({ dish, day, comboKey })}
                          className="min-h-11 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-600"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => setSwapTarget({ day, comboKey })}
                          className="min-h-11 rounded-xl border border-blue-600 text-blue-700 bg-white text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-50"
                        >
                          Thay món
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {selected && (
        <DishDetailModal
          dish={selected.dish}
          day={selected.day}
          comboKey={selected.comboKey}
          isSelectable={selected.day === todayKey}
          onClose={() => setSelected(null)}
        />
      )}

      {swapTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-lg max-h-[82vh] bg-white rounded-[26px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-blue-500">nOcnOm</div>
                <h3 className="font-black text-lg text-slate-950">Chọn món thay thế</h3>
              </div>
              <button
                type="button"
                onClick={() => setSwapTarget(null)}
                className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto">
              {dishes.map(dish => (
                <button
                  type="button"
                  key={dish.id}
                  onClick={() => {
                    mockDb.swapDish(swapTarget.day, swapTarget.comboKey, dish.id);
                    setSwapTarget(null);
                  }}
                  className="w-full p-3 rounded-2xl flex items-center gap-3 text-left hover:bg-blue-50"
                >
                  <DishImage src={dish.imageUrl} alt={dish.name} className="w-12 h-12 rounded-2xl shrink-0" />
                  <div className="min-w-0">
                    <div className="font-black text-sm text-slate-900 truncate">{dish.name}</div>
                    <div className="text-[11px] font-bold text-slate-400">{dish.vendors.length} quán phục vụ</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
