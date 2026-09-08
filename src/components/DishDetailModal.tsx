import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, MapPin, Phone, RefreshCw, X } from 'lucide-react';
import {
  estimateDishCalories,
  getDishNutritionSnapshot,
  mockDb,
  type Dish,
  type MealAddon,
  type Vendor
} from '../lib/db';
import { getSafeExternalUrl } from '../lib/url';
import DishImage from './DishImage';
import DishPickerModal from './DishPickerModal';
import MealAddonPicker, { type MealAddonSelection } from './MealAddonPicker';
import {
  loadNutritionAddons,
  type NutritionAddonOption
} from '../lib/nutritionKnowledge';
import {
  nutritionService,
  type NutritionPortion,
  type NutritionFood
} from '../services/nutrition';

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
  const [addonSelection, setAddonSelection] = useState<MealAddonSelection>({
    fruitId: '',
    drinkId: ''
  });
  const [nutritionAddons, setNutritionAddons] = useState<NutritionAddonOption[]>([]);
  const [portions, setPortions] = useState<NutritionPortion[]>([]);
  const [canonicalFood, setCanonicalFood] = useState<NutritionFood | null>(null);

  useEffect(() => {
    void loadNutritionAddons().then(setNutritionAddons);

    if (dish.nutritionRecordId) {
      void nutritionService.getFoodById(dish.nutritionRecordId).then(food => {
        if (food) {
          setCanonicalFood(food);
          void nutritionService.getPortions(food.id).then(setPortions);
        }
      });
    } else {
      // Never infer canonical nutrition from a fuzzy top result in detail view.
      // Legacy/fallback dishes remain explicitly unlinked until user confirms
      // a Nutrition Knowledge Base candidate.
      setCanonicalFood(null);
      setPortions([]);
    }
  }, [dish]);

  const handleSwap = (newDishId: string) => {
    mockDb.swapDish(day, comboKey, newDishId);
    onClose();
  };

  const handleSelectVendor = (vendor: Vendor) => {
    const selectedIds = [addonSelection.fruitId, addonSelection.drinkId].filter(Boolean);
    const addons: MealAddon[] = selectedIds
      .map(id => nutritionAddons.find(item => item.id === id))
      .filter((item): item is NutritionAddonOption => Boolean(item))
      .map(item => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        calories: item.calories,
        nutritionRecordId: item.id,
        servingG: item.servingG,
        servingAmount: item.servingAmount ?? item.servingG,
        servingUnit: item.servingUnit ?? (item.kind === 'drink' ? 'ml' : 'g'),
        kcalMin: item.kcalMin,
        kcalMax: item.kcalMax,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG
      }));

    mockDb.addLog(
      dish.name,
      vendor.name,
      vendor.price,
      estimateDishCalories(dish),
      comboKey,
      addons,
      getDishNutritionSnapshot(dish)
    );
    mockDb.selectCombo(day, comboKey);
    const addonText = addons.length > 0
      ? ' + ' + addons.map(addon => addon.name).join(' + ')
      : '';
    window.alert('Đã chọn ' + dish.name + addonText + ' tại ' + vendor.name + '.');
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
            <div className="mt-1 text-xs font-bold text-white/90">
              ≈ {estimateDishCalories(dish)} kcal
              {dish.portionSize ? ` / phần ${dish.portionSize}` : ' / phần'}
              {dish.calorieSource === 'category-fallback'
                ? ' · ước tính theo nhóm món'
                : ''}
            </div>
          </div>
        </div>

        {dish.imageSourceUrl && (
          <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-2 text-[10px] text-slate-500">
            Ảnh:{' '}
            <a
              href={getSafeExternalUrl(dish.imageSourceUrl) || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600"
            >
              {dish.imageSource === 'wikimedia-commons' ? 'Wikimedia Commons' : 'Nguồn ảnh'}
            </a>
            {dish.imageLicense ? ' · ' + dish.imageLicense : ''}
            {dish.imageAttribution ? ' · ' + dish.imageAttribution : ''}
          </div>
        )}

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

          {isSelectable && (
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-3">
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Ăn kèm · không bắt buộc
              </div>
              <MealAddonPicker
                value={addonSelection}
                onChange={setAddonSelection}
                compact
              />
            </div>
          )}

          {(canonicalFood || dish.calorieSource) && (
            <div className="rounded-[22px] border border-blue-100 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                  Nutrition Knowledge Base
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  {dish.nutritionConfidence === 'high'
                    ? 'Độ tin cậy cao'
                    : dish.nutritionConfidence === 'reference'
                      ? 'Dữ liệu tham khảo'
                      : canonicalFood?.confidence.label_vi || 'Ước tính'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700">
                Nguồn calo:{' '}
                <span className="font-black text-slate-950">
                  {dish.calorieSource === 'nutrition-db'
                    ? dish.nutritionSource || 'Nutrition Knowledge Base'
                    : dish.calorieSource === 'manual'
                      ? 'Nhập thủ công'
                      : dish.calorieSource === 'category-fallback'
                        ? 'Ước tính theo nhóm món'
                        : 'Dữ liệu cũ'}
                </span>
                {dish.servingAmount
                  ? ` · ${dish.servingAmount}${dish.servingUnit || 'g'}`
                  : dish.portionGrams
                    ? ` · ${dish.portionGrams}g`
                    : ''}
              </div>

              {dish.proteinG !== undefined &&
                dish.carbsG !== undefined &&
                dish.fatG !== undefined ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-emerald-50 px-2.5 py-2 text-center">
                    <div className="text-[9px] font-black uppercase text-emerald-700">Protein</div>
                    <div className="mt-0.5 text-sm font-black text-emerald-950">{dish.proteinG} g</div>
                  </div>
                  <div className="rounded-xl bg-blue-50 px-2.5 py-2 text-center">
                    <div className="text-[9px] font-black uppercase text-blue-700">Carb</div>
                    <div className="mt-0.5 text-sm font-black text-blue-950">{dish.carbsG} g</div>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-2.5 py-2 text-center">
                    <div className="text-[9px] font-black uppercase text-amber-700">Fat</div>
                    <div className="mt-0.5 text-sm font-black text-amber-950">{dish.fatG} g</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
                  Chưa có đủ Protein / Carb / Fat cho khẩu phần này. nOcnOm không suy ra macro từ kcal.
                </div>
              )}

              {dish.nutritionReferenceOnly ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900">
                  Dữ liệu tham khảo · {dish.nutritionCalorieStatus || 'REFERENCE_ONLY'} ·
                  không được coi là số liệu đã xác minh độc lập.
                </div>
              ) : null}

              {canonicalFood?.energy.kcal_min && canonicalFood.energy.kcal_max && (
                <div className="text-xs text-slate-600 font-semibold">
                  Mức calo tham chiếu:{' '}
                  <span className="font-black text-slate-950">
                    {dish.kcalMin ?? canonicalFood.energy.kcal_min}–{dish.kcalMax ?? canonicalFood.energy.kcal_max} kcal
                  </span>
                  {canonicalFood.energy.kcal_per_100g && (
                    <span className="text-slate-500 ml-1.5">
                      (≈ {canonicalFood.energy.kcal_per_100g} kcal / 100g)
                    </span>
                  )}
                </div>
              )}

              {canonicalFood && portions.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-2">
                    Khẩu phần định lượng (S / M / L):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {portions.map(p => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-2 text-center"
                      >
                        <div className="text-[11px] font-black text-slate-900">
                          {p.portion_size} ({p.label_vi})
                        </div>
                        <div className="text-xs font-black text-blue-600 mt-0.5">
                          ≈ {p.kcal_typical} kcal
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          {p.portion_g}g
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
