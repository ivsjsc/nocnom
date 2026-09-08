import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  X
} from 'lucide-react';
import {
  estimateDishCalories,
  mockDb,
  type Dish
} from '../lib/db';
import { normalizePriceVnd } from '../domain/menu/vendorOffer';
import { normalizeExternalImageUrl } from '../lib/url';
import DishImage from './DishImage';
import CustomNutritionEditor, {
  type CustomNutritionEditorState
} from './CustomNutritionEditor';
import type {
  UserNutritionInput,
  UserNutritionMode
} from '../domain/nutrition/userNutrition';

type Props = {
  dish: Dish;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditDishModal({
  dish,
  onClose,
  onSaved
}: Props) {
  const [name, setName] = useState(dish.name);
  const [imageUrl, setImageUrl] = useState(dish.imageUrl || '');
  const initialNutritionInput = useMemo<UserNutritionInput>(() => {
    if (dish.nutritionRecipe) {
      return {
        mode: 'recipe',
        sourceKind: 'recipe',
        sourceUrl: dish.nutritionSourceUrl,
        sourceNote: dish.nutritionSourceNote,
        recipe: dish.nutritionRecipe
      };
    }

    return {
      mode: 'manual',
      inputBasis: dish.nutritionInputBasis || 'serving',
      calories: dish.nutritionSourceCalories ?? estimateDishCalories(dish),
      servingAmount: dish.servingAmount,
      servingUnit: dish.servingUnit || 'portion',
      proteinG: dish.nutritionSourceProteinG ?? dish.proteinG,
      carbsG: dish.nutritionSourceCarbsG ?? dish.carbsG,
      fatG: dish.nutritionSourceFatG ?? dish.fatG,
      sourceKind:
        dish.nutritionSourceKind &&
        dish.nutritionSourceKind !== 'reference-db' &&
        dish.nutritionSourceKind !== 'recipe'
          ? dish.nutritionSourceKind
          : 'self-entered',
      sourceUrl:
        dish.nutritionDataOrigin === 'user-manual'
          ? dish.nutritionSourceUrl
          : undefined,
      sourceNote:
        dish.nutritionDataOrigin === 'user-manual'
          ? dish.nutritionSourceNote
          : undefined
    };
  }, [dish]);

  const [nutritionEditing, setNutritionEditing] = useState(false);
  const [nutritionMode, setNutritionMode] = useState<UserNutritionMode>(
    dish.nutritionRecipe ? 'recipe' : 'manual'
  );
  const [nutritionEditorState, setNutritionEditorState] =
    useState<CustomNutritionEditorState>({
      input: initialNutritionInput,
      normalized: null,
      error: ''
    });
  const [vendorName, setVendorName] = useState('');
  const [vendorPrice, setVendorPrice] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const normalizedImageUrl = useMemo(
    () =>
      imageUrl.trim()
        ? normalizeExternalImageUrl(imageUrl)
        : null,
    [imageUrl]
  );

  const imageUrlInvalid =
    Boolean(imageUrl.trim()) && !normalizedImageUrl;

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setSaveError('Tên món không được để trống.');
      return;
    }

    if (imageUrlInvalid) {
      setSaveError(
        'URL ảnh không hợp lệ. Chỉ dùng URL công khai http/https.'
      );
      return;
    }

    if (nutritionEditing && !nutritionEditorState.input) {
      setSaveError(
        nutritionEditorState.error || 'Dữ liệu dinh dưỡng chưa hợp lệ.'
      );
      return;
    }

    const hasVendorDraft = [
      vendorName,
      vendorPrice,
      vendorPhone,
      vendorAddress
    ].some(value => value.trim());

    let normalizedVendorPrice: number | null = null;
    if (hasVendorDraft) {
      if (!vendorName.trim()) {
        setSaveError('Cần nhập tên quán khi bổ sung nơi bán.');
        return;
      }

      normalizedVendorPrice = normalizePriceVnd(Number(vendorPrice));
      if (normalizedVendorPrice === null) {
        setSaveError('Giá quán phải là số nguyên VND hợp lệ.');
        return;
      }
    }

    setIsSaving(true);
    setSaveError('');

    try {
      if (cleanName !== dish.name) {
        mockDb.updateDishName(dish.id, cleanName);
      }

      if (nutritionEditing && nutritionEditorState.input) {
        mockDb.updateDishNutrition(dish.id, nutritionEditorState.input);
      }

      if (hasVendorDraft && normalizedVendorPrice !== null) {
        mockDb.addVendor(
          dish.id,
          vendorName.trim(),
          normalizedVendorPrice,
          vendorPhone.trim(),
          vendorAddress.trim()
        );
      }

      const currentImageUrl = (dish.imageUrl || '').trim();
      if (imageUrl.trim() !== currentImageUrl) {
        await mockDb.updateDishImage(dish.id, imageUrl.trim());
      }

      onSaved();
    } catch (error) {
      console.error('[menu] Unable to save dish edit', error);
      setSaveError(
        'Không thể lưu thay đổi lúc này. Dữ liệu cũ vẫn được giữ; vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-dish-title"
    >
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[28px] bg-white dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur px-5 py-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
              Kho món
            </div>
            <h2
              id="edit-dish-title"
              className="mt-0.5 text-lg font-black text-slate-950 dark:text-white"
            >
              Chỉnh sửa món
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <label className="block">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              Tên món
            </span>
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-bold text-slate-950 dark:text-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
              autoFocus
            />
          </label>

          <section className="rounded-[22px] border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-950 dark:text-white">
                  Ảnh công khai qua URL
                </div>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                  Dán URL ảnh công khai http/https. Ứng dụng chỉ lưu đường dẫn và tải ảnh trực tiếp từ nguồn. Không tải file lên Firebase Storage.
                </p>
              </div>
            </div>

            <input
              type="url"
              inputMode="url"
              value={imageUrl}
              onChange={event => {
                setImageUrl(event.target.value);
                setSaveError('');
              }}
              placeholder="https://example.com/mon-an.jpg"
              className={
                'mt-3 h-12 w-full rounded-2xl border bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-950 dark:text-white focus:outline-none focus:ring-2 ' +
                (imageUrlInvalid
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100 dark:border-red-700'
                  : 'border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-blue-100 dark:focus:ring-blue-500/20')
              }
              aria-invalid={imageUrlInvalid}
            />

            {imageUrlInvalid && (
              <div className="mt-2 text-xs font-bold text-red-700 dark:text-red-300">
                URL chưa hợp lệ. Hãy dùng liên kết http/https công khai.
              </div>
            )}

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {normalizedImageUrl ? (
                <DishImage
                  src={normalizedImageUrl}
                  alt={'Xem trước ' + name}
                  className="h-44 w-full rounded-none"
                />
              ) : (
                <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <ImageIcon className="h-7 w-7" />
                  <span className="text-xs font-bold">
                    {imageUrl.trim()
                      ? 'Chưa thể xem trước URL này'
                      : 'Để trống để bỏ ảnh hiện tại'}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[22px] border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-950 dark:text-white">
                  Dinh dưỡng & Macro
                </div>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                  Calo {estimateDishCalories(dish).toLocaleString('vi-VN')} kcal
                  {' '}· Protein {dish.proteinG ?? '—'} g
                  {' '}· Carb {dish.carbsG ?? '—'} g
                  {' '}· Fat {dish.fatG ?? '—'} g
                </p>
                {dish.proteinG === undefined ||
                dish.carbsG === undefined ||
                dish.fatG === undefined ? (
                  <div className="mt-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    Thiếu dữ liệu:{' '}
                    {[
                      dish.proteinG === undefined ? 'Protein' : '',
                      dish.carbsG === undefined ? 'Carb' : '',
                      dish.fatG === undefined ? 'Fat' : ''
                    ].filter(Boolean).join(' / ')}.
                  </div>
                ) : (
                  <div className="mt-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Đã có đủ Protein / Carb / Fat cho khẩu phần hiện tại.
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setNutritionEditing(value => !value)}
                className="min-h-10 shrink-0 rounded-xl border border-emerald-200 bg-white px-3 text-[10px] font-black text-emerald-800 flex items-center gap-1.5 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300"
              >
                {nutritionEditing ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Thu gọn
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Bổ sung Macro
                  </>
                )}
              </button>
            </div>

            {dish.nutritionRecordId && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                Món này đang liên kết với bản tham khảo
                {dish.nutritionCanonicalName ? ` “${dish.nutritionCanonicalName}”` : ''}.
                Dữ liệu bạn chỉnh sẽ được lưu thành bản cá nhân, không sửa Nutrition DB chung.
              </div>
            )}

            {nutritionEditing && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNutritionMode('manual')}
                    className={
                      'h-11 rounded-xl border text-xs font-black ' +
                      (nutritionMode === 'manual'
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')
                    }
                  >
                    Nhãn / nhập số liệu
                  </button>
                  <button
                    type="button"
                    onClick={() => setNutritionMode('recipe')}
                    className={
                      'h-11 rounded-xl border text-xs font-black ' +
                      (nutritionMode === 'recipe'
                        ? 'border-violet-500 bg-violet-50 text-violet-800'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')
                    }
                  >
                    Tính từ nguyên liệu
                  </button>
                </div>

                <CustomNutritionEditor
                  key={nutritionMode}
                  mode={nutritionMode}
                  initialValue={
                    initialNutritionInput.mode === nutritionMode
                      ? initialNutritionInput
                      : undefined
                  }
                  onChange={setNutritionEditorState}
                />
              </div>
            )}
          </section>

          <section className="rounded-[22px] border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
              <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Bổ sung quán bán (không bắt buộc)
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={vendorName}
                onChange={event => setVendorName(event.target.value)}
                placeholder="Tên quán"
                className="h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold"
              />
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={vendorPrice}
                onChange={event => setVendorPrice(event.target.value)}
                placeholder="Giá (VND)"
                className="h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold"
              />
              <input
                value={vendorPhone}
                onChange={event => setVendorPhone(event.target.value)}
                placeholder="Số điện thoại"
                className="h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold"
              />
              <input
                value={vendorAddress}
                onChange={event => setVendorAddress(event.target.value)}
                placeholder="Địa chỉ"
                className="h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold"
              />
            </div>
          </section>

          {saveError && (
            <div
              className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-xs font-bold text-red-800 dark:text-red-200"
              role="alert"
            >
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-12 rounded-2xl border border-slate-300 dark:border-slate-700 text-sm font-black text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || imageUrlInvalid}
              className="h-12 rounded-2xl bg-blue-600 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
