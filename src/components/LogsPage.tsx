import { useEffect, useState } from 'react';
import { Clock3, UtensilsCrossed } from 'lucide-react';
import { mockDb, type Dish, type LogEntry } from '../lib/db';
import DishImage from './DishImage';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);

  useEffect(() => {
    const unsubLogs = mockDb.subscribeLogs(setLogs);
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    return () => {
      unsubLogs();
      unsubDishes();
    };
  }, []);

  const findDish = (name: string) => dishes.find(dish => dish.name === name);

  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-center gap-2 px-2">
        <Clock3 className="w-5 h-5 text-slate-900" />
        <h2 className="text-xl font-black text-slate-950">Lịch sử ăn uống</h2>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-[26px] border border-slate-200 shadow-sm py-14 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-400 mx-auto flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div className="mt-4 font-black text-slate-900">Chưa có lịch sử</div>
          <p className="mt-1 text-sm text-slate-500">Món đã chọn sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => {
            const dish = findDish(log.dishName);
            return (
              <article
                key={log.id}
                className="bg-white rounded-[26px] border border-slate-200 shadow-sm p-4 flex items-center gap-4"
              >
                <DishImage
                  src={dish?.imageUrl}
                  alt={log.dishName}
                  className="w-16 h-16 rounded-2xl shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-sm sm:text-base text-slate-950 truncate">{log.dishName}</h3>
                  <div className="mt-1 text-[11px] font-black uppercase text-slate-500 truncate">
                    Tại: {log.vendorName} · {log.price.toLocaleString('vi-VN')}đ
                  </div>
                </div>
                <time className="self-start mt-2 text-[10px] font-black text-blue-600 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                </time>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
