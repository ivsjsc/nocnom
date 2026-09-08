import { useMemo, useState } from 'react';
import {
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
  const [calories, setCalories] = useState(
    String(estimateDishCalories(dish))
  );
  const [proteinG, setProteinG] = useState(
    dish.proteinG === undefined ? '' : String(dish.proteinG)
  );
  const [carbsG, setCarbsG] = useState(
    dish.carbsG === undefined ? '' : String(dish.carbsG)
  );
  const [fatG, setFatG] = useState(
    dish.fatG === undefined ? '' : String(dish.fatG)
  );
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

    const parsedCalories = Number(calories);
    if (
      !Number.isFinite(parsedCalories) ||
      parsedCalories <= 0 ||
      parsedCalories > 5000
    ) {
      setSaveError('Calo phải là số từ 1 đến 5.000 kcal/phần.');
      return;
    }

    const macroInputs = [proteinG, carbsG, fatG];
    const hasMacroDraft = macroInputs.some(value => value.trim() !== '');
    const parsedMacros = hasMacroDraft
      ? macroInputs.map(value => Number(value))
      : null;

    if (
      parsedMacros &&
      (
        macroInputs.some(value => value.trim() === '') ||
        parsedMacros.some(
          value => !Number.isFinite(value) || value < 0 || value > 500
        )
      )
    ) {
      setSaveError(
        'Nếu nhập Macro, cần nhập đủ Protein / Carb / Fat từ 0 đến 500 g cho cùng khẩu phần.'
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

      if (parsedCalories !== estimateDishCalories(dish)) {
        mockDb.updateDishCalories(dish.id, parsedCalories);
      }

      if (parsedMacros) {
        const [nextProteinG, nextCarbsG, nextFatG] = parsedMacros;
        if (
          nextProteinG !== dish.proteinG ||
          nextCarbsG !== dish.carbsG ||
          nextFatG !== dish.fatG
        ) {
          mockDb.updateDishMacros(dish.id, {
            proteinG: nextProteinG,
            carbsG: nextCarbsG,
            fatG: nextFatG
          });
        }
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

          <label className="block">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              Năng lượng ước tính (kcal/phần)
            </span>
            <input
              type="number"
              min="1"
              max="5000"
              inputMode="numeric"
              value={calories}
              onChange={event => setCalories(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-bold text-slate-950 dark:text-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
            />
          </label>

          <section className="rounded-[22px] border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
            <div className="text-sm font-black text-slate-950 dark:text-white">
              Macro theo khẩu phần hiện tại
            </div>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
              Nhập đủ Protein / Carb / Fat nếu có dữ liệu đáng tin cậy. Để trống cả 3 nếu chưa rõ; nOcnOm không tự suy ra macro từ kcal.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">Protein (g)</span>
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="0.1"
                  inputMode="decimal"
                  value={proteinG}
                  onChange={event => setProteinG(event.target.value)}
                  placeholder="--"
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm font-bold"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">Carb (g)</span>
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="0.1"
                  inputMode="decimal"
                  value={carbsG}
                  onChange={event => setCarbsG(event.target.value)}
                  placeholder="--"
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm font-bold"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">Fat (g)</span>
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="0.1"
                  inputMode="decimal"
                  value={fatG}
                  onChange={event => setFatG(event.target.value)}
                  placeholder="--"
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm font-bold"
                />
              </label>
            </div>
            {dish.macroSource && (
              <div className="mt-2 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                Nguồn macro hiện tại: {dish.macroSource === 'nutrition-db' ? 'Nutrition Knowledge Base' : 'nhập thủ công'}.
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
