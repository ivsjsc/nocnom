import { useEffect, useState } from 'react';
import { Ban, RotateCcw } from 'lucide-react';
import { estimateDishCalories, mockDb, type Category, type Dish, type Timetable } from '../lib/db';
import DishDetailModal from './DishDetailModal';
import DishImage from './DishImage';
import DishPickerModal from './DishPickerModal';

const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const comboKeys = ['A', 'B', 'C'] as const;
const mealLabels = ['Bữa sáng', 'Bữa trưa', 'Bữa tối'];
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
          Chọn món cho từng bữa. Có thể bỏ bữa khi không ăn; Dashboard và calo sẽ tự cập nhật theo lịch.
        </p>
      </section>

      <div className="space-y-4">
        {dayOrder.map(day => {
          const menu = timetable[day];
          const plannedMealCount = comboKeys.filter(comboKey => !menu.options[comboKey].skipped).length;

          return (
            <section key={day} className="bg-white rounded-[26px] border border-slate-200 shadow-sm p-5">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-[11px] font-black uppercase text-slate-400">Ngày</div>
                  <h3 className="text-xl font-black text-slate-950">{dayDisplay[day]}</h3>
                </div>
                <span className="text-xs font-black text-blue-600">{plannedMealCount} bữa</span>
              </div>

              <div className="space-y-3">
                {comboKeys.map((comboKey, index) => {
                  const menuItem = menu.options[comboKey];
                  const mealLabel = mealLabels[index];

                  if (menuItem.skipped) {
                    return (
                      <article
                        key={comboKey}
                        className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 shrink-0 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                            <Ban className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                              {mealLabel}
                            </div>
                            <div className="mt-0.5 font-black text-sm text-slate-700">
                              Không ăn {mealLabel.toLowerCase()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => mockDb.toggleMealSkipped(day, comboKey, false)}
                            className="min-h-10 shrink-0 rounded-xl border border-blue-200 bg-white px-3 text-[11px] font-black text-blue-600 flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Ăn lại
                          </button>
                        </div>
                      </article>
                    );
                  }

                  const dish = findDish(menuItem.dishId);
                  if (!dish) return null;

                  return (
                    <article key={comboKey} className="rounded-[18px] bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-slate-400 w-5">#{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-500">
                            {mealLabel}
                          </div>
                          <div className="font-black text-sm text-slate-950 truncate">{dish.name}</div>
                          <div className="text-[10px] font-bold text-slate-400">
                            {categoryName(dish)} · ≈ {estimateDishCalories(dish)} kcal
                          </div>
                        </div>
                        <DishImage src={dish.imageUrl} alt={dish.name} className="w-11 h-11 rounded-full shrink-0 border border-slate-100" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setSelected({ dish, day, comboKey })}
                          className="min-h-11 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-700"
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

                      <button
                        type="button"
                        onClick={() => mockDb.toggleMealSkipped(day, comboKey, true)}
                        className="mt-2 min-h-10 w-full rounded-xl text-[11px] font-black text-slate-500 hover:bg-slate-100 flex items-center justify-center gap-2"
                      >
                        <Ban className="w-4 h-4" />
                        Không ăn bữa này
                      </button>
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
        <DishPickerModal
          title="Chọn món thay thế"
          dishes={dishes}
          categories={categories}
          selectedDishId={timetable[swapTarget.day].options[swapTarget.comboKey].dishId}
          onSelect={dish => {
            mockDb.swapDish(swapTarget.day, swapTarget.comboKey, dish.id);
            setSwapTarget(null);
          }}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </div>
  );
}
