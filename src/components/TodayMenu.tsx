import { useEffect, useState } from 'react';
import { mockDb, DayMenu, Dish } from '../lib/db';
import VendorCard from './VendorCard';

export default function TodayMenu() {
  const [menu, setMenu] = useState<DayMenu | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const todayKey = days[new Date().getDay()];

  useEffect(() => {
    const unsubMenu = mockDb.subscribe(todayKey, setMenu);
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    return () => { unsubMenu(); unsubDishes(); };
  }, [todayKey]);

  if (!menu || dishes.length === 0) return (
    <div className="flex justify-center py-20">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-stone-500 font-medium">Đang tải thực đơn...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900">
          Thực đơn {menu.dayName}
        </h2>
        <p className="text-stone-500">Chọn món và quán yêu thích của bạn cho ngày hôm nay</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['A', 'B', 'C'] as const).map((key) => {
          const item = menu.options[key];
          const dish = dishes.find(d => d.id === item.dishId);
          if (!dish) return null;

          const comboNames: Record<string, string> = { A: "Chuẩn", B: "Nhanh", C: "Healthy" };
          const comboColors: Record<string, string> = {
            A: "bg-blue-50 text-blue-700 border-blue-200",
            B: "bg-orange-50 text-orange-700 border-orange-200",
            C: "bg-green-50 text-green-700 border-green-200"
          };

          return (
            <div key={key} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${comboColors[key]}`}>
                  Combo {key} • {comboNames[key]}
                </span>
                <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-1 rounded-md">
                  Còn {item.stock} phần
                </span>
              </div>
              
              <h3 className="text-xl font-semibold text-stone-800 mb-4">
                {dish.name}
              </h3>
              
              <div className="space-y-3 mt-auto">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Chọn quán để đặt:</p>
                {dish.vendors.length > 0 ? (
                  dish.vendors.map(vendor => (
                    <div key={vendor.id}>
                      <VendorCard vendor={vendor} dishId={dish.id} showOrderButton={true} />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-400 italic">Chưa có quán nào phục vụ món này.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
