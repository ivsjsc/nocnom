import { useEffect, useMemo, useState } from 'react';
import { List, UtensilsCrossed } from 'lucide-react';
import { mockDb, type Dish, type LogEntry, type Timetable } from '../lib/db';
import DishDetailModal from './DishDetailModal';
import DishImage from './DishImage';

const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const weekOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const comboKeys = ['A', 'B', 'C'] as const;
const mealLabels = ['BỮA SÁNG', 'BỮA TRƯA', 'BỮA TỐI'];
const dayDisplay: Record<string, string> = {
  mon: 'Thứ Hai',
  tue: 'Thứ Ba',
  wed: 'Thứ Tư',
  thu: 'Thứ Năm',
  fri: 'Thứ Sáu',
  sat: 'Thứ Bảy',
  sun: 'Chủ Nhật'
};

export default function HomePage() {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selected, setSelected] = useState<{ dish: Dish; comboKey: 'A' | 'B' | 'C' } | null>(null);

  const todayKey = dayKeys[new Date().getDay()];

  useEffect(() => {
    const unsubTable = mockDb.subscribe('all', setTimetable);
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    const unsubLogs = mockDb.subscribeLogs(setLogs);
    return () => {
      unsubTable();
      unsubDishes();
      unsubLogs();
    };
  }, []);

  const eatenToday = useMemo(() => {
    const today = new Date().toDateString();
    return logs.filter(log => new Date(log.timestamp).toDateString() === today).length;
  }, [logs]);

  if (!timetable || dishes.length === 0) {
    return (
      <div className="py-20 flex justify-center text-slate-400">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UtensilsCrossed className="w-5 h-5" />
          Đang tải nOcnOm...
        </div>
      </div>
    );
  }

  const todayMenu = timetable[todayKey];
  const findDish = (id: string) => dishes.find(item => item.id === id);

  return (
    <div className="space-y-6 pb-28">
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.04em] text-slate-500">Đã ăn hôm nay</div>
          <div className="mt-1 text-2xl font-black text-blue-600">{Math.min(eatenToday, 3)}/3 món</div>
        </div>
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.04em] text-slate-500">Lượt phục vụ</div>
          <div className="mt-1 text-2xl font-black text-orange-600">{logs.length}</div>
        </div>
      </section>

      <section className="rounded-[32px] bg-gradient-to-br from-[#3f63f4] to-[#2f4ed8] text-white p-7 shadow-lg shadow-blue-900/10">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Hôm nay {dayDisplay[todayKey]}</h2>
        <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-blue-50">
          Menu 3 món đề xuất cho nOcnOm
        </p>

        <div className="mt-6 space-y-4">
          {comboKeys.map((comboKey, index) => {
            const dish = findDish(todayMenu.options[comboKey].dishId);
            if (!dish) return null;
            const price = dish.vendors[0]?.price;

            return (
              <div
                key={comboKey}
                className="rounded-[22px] border border-white/10 bg-white/10 p-3 flex items-center gap-3"
              >
                <DishImage
                  src={dish.imageUrl}
                  alt={dish.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0 border border-white/20"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black text-blue-50">{mealLabels[index]}</div>
                  <div className="font-black text-sm sm:text-base truncate">{dish.name}</div>
                  <div className="text-[10px] text-blue-50 font-semibold">
                    1 phần · {price ? price.toLocaleString('vi-VN') + 'đ' : 'chưa có giá'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected({ dish, comboKey })}
                  className="shrink-0 min-w-[64px] min-h-11 px-4 py-2 rounded-xl bg-white text-blue-700 text-xs font-extrabold uppercase tracking-wide shadow-sm active:scale-95 transition-transform"
                >
                  Xem
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 px-3 mb-5 text-slate-400">
          <List className="w-5 h-5 text-blue-300" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.24em]">Lịch ăn tuần này</h3>
        </div>

        <div className="space-y-4">
          {weekOrder.map(day => {
            const menu = timetable[day];
            return (
              <div key={day} className="bg-white rounded-[30px] border border-slate-200 shadow-sm p-5">
                <div className="text-[10px] font-black uppercase text-slate-400 mb-3">{dayDisplay[day]}</div>
                <div className="space-y-2">
                  {comboKeys.map((comboKey, index) => {
                    const dish = findDish(menu.options[comboKey].dishId);
                    if (!dish) return null;
                    return (
                      <button
                        type="button"
                        key={comboKey}
                        onClick={() => setSelected({ dish, comboKey })}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-200/70 px-3 py-3 flex items-center gap-3 text-left hover:border-blue-200 transition-colors"
                      >
                        <span className="text-[10px] font-black text-slate-400 w-5">#{index + 1}</span>
                        <span className="flex-1 truncate text-sm font-semibold text-slate-600">{dish.name}</span>
                        <DishImage src={dish.imageUrl} alt={dish.name} className="w-8 h-8 rounded-full shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selected && (
        <DishDetailModal
          dish={selected.dish}
          day={todayKey}
          comboKey={selected.comboKey}
          isSelectable
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
