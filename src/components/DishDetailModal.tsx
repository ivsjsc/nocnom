import { useState } from 'react';
import { CheckCircle2, ExternalLink, MapPin, Phone, RefreshCw, X } from 'lucide-react';
import { estimateDishCalories, mockDb, type Dish, type Vendor } from '../lib/db';
import { getSafeExternalUrl } from '../lib/url';
import DishImage from './DishImage';
import DishPickerModal from './DishPickerModal';

type Props = {
  dish: Dish;
  day: string;
  comboKey: 'A' | 'B' | 'C';
  isSelectable?: boolean;
  onClose: () => void;
};

export default function DishDetailModal({
  dish,
  day,
  comboKey,
  isSelectable = true,
  onClose
}: Props) {
  const [isSwapping, setIsSwapping] = useState(false);
  const [allDishes] = useState<Dish[]>(mockDb.getDishes());

  const handleSwap = (newDishId: string) => {
    mockDb.swapDish(day, comboKey, newDishId);
    onClose();
  };

  const handleSelectVendor = (vendor: Vendor) => {
    mockDb.addLog(dish.name, vendor.name, vendor.price, estimateDishCalories(dish));
    mockDb.selectCombo(day, comboKey);
    window.alert('Đã chọn ' + dish.name + ' tại ' + vendor.name + '.');
    onClose();
  };

  if (isSwapping) {
    return (
      <DishPickerModal
        title="Chọn món khác"
        dishes={allDishes}
        selectedDishId={dish.id}
        onSelect={item => handleSwap(item.id)}
        onClose={() => setIsSwapping(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-[26px] overflow-hidden shadow-2xl flex flex-col">
        <div className="relative h-52 bg-slate-100 shrink-0">
          <DishImage src={dish.imageUrl} alt={dish.name} className="w-full h-full rounded-none" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-white/90 text-slate-700 flex items-center justify-center shadow"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute inset-x-0 bottom-0 pt-20 pb-5 px-5 bg-gradient-to-t from-slate-950/85 to-transparent">
            <h2 className="text-2xl font-black text-white">{dish.name}</h2>
            <div className="mt-1 text-xs font-bold text-white/80">
              ≈ {estimateDishCalories(dish)} kcal / phần
            </div>
          </div>
        </div>

        <div className="p-4 overflow-y-auto bg-slate-50 space-y-4">
          {isSelectable && (
            <button
              type="button"
              onClick={() => setIsSwapping(true)}
              className="w-full min-h-11 rounded-2xl bg-white border border-blue-200 text-blue-600 font-black text-xs flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Đổi món khác
            </button>
          )}

          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Các quán phục vụ</div>

          {dish.vendors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500">
              Chưa có quán phục vụ món này.
            </div>
          ) : (
            dish.vendors.map(vendor => {
              const safeLink = getSafeExternalUrl(vendor.link);
              return (
                <article key={vendor.id} className="bg-white rounded-[24px] border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-black text-slate-950">{vendor.name}</h3>
                    <span className="shrink-0 rounded-xl bg-blue-50 text-blue-600 px-3 py-1.5 text-xs font-black">
                      {vendor.price.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-slate-500">
                    {vendor.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        {vendor.phone}
                      </div>
                    )}
                    {vendor.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        {vendor.address}
                      </div>
                    )}
                    {safeLink && (
                      <a
                        href={safeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 font-bold"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Link tham khảo
                      </a>
                    )}
                  </div>

                  {isSelectable && (
                    <button
                      type="button"
                      onClick={() => handleSelectVendor(vendor)}
                      className="mt-4 w-full min-h-11 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Chọn ăn món này
                    </button>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
