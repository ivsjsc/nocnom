import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChefHat,
  Database,
  Image as ImageIcon,
  PenLine,
  Loader2,
  Plus,
  RefreshCw,
  Store,
  Trash2,
  X
} from 'lucide-react';
import {
  mockDb,
  type Category,
  type Dish,
  type NewVendorInput
} from '../lib/db';
import {
  createNutritionLookupResult,
  normalizeFoodName,
  type NutritionLookupResult
} from '../lib/nutritionKnowledge';
import {
  nutritionService,
  resolveNutrition,
  type NutritionResolution,
  type NutritionSearchResult
} from '../services/nutrition';
import type { NutritionSelection } from '../domain/nutrition/nutritionTypes';
import {
  searchFoodImages,
  type FoodImageCandidate
} from '../lib/imageSearch';
import { normalizeExternalImageUrl } from '../lib/url';
import DishImage from './DishImage';
import CustomNutritionEditor, {
  type CustomNutritionEditorState
} from './CustomNutritionEditor';
import type { UserNutritionMode } from '../domain/nutrition/userNutrition';

type Props = {
  categories: Category[];
  onClose: () => void;
  onSaved: (dish: Dish, created: boolean) => void;
};

type NutritionEntryMode = 'reference' | UserNutritionMode;

const currency = new Intl.NumberFormat('vi-VN');

export default function AddDishModal({
  categories,
  onClose,
  onSaved
}: Props) {
  const [name, setName] = useState('');
  const [fallbackCategoryId, setFallbackCategoryId] = useState(categories[0]?.id ?? '');
  const [nutrition, setNutrition] = useState<NutritionLookupResult | null>(null);
  const [images, setImages] = useState<FoodImageCandidate[]>([]);
  const [selectedImageId, setSelectedImageId] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [vendors, setVendors] = useState<NewVendorInput[]>([]);
  const [vendorName, setVendorName] = useState('');
  const [vendorPrice, setVendorPrice] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [nutritionMode, setNutritionMode] =
    useState<NutritionEntryMode>('reference');
  const [customNutritionState, setCustomNutritionState] =
    useState<CustomNutritionEditorState>({
      input: null,
      normalized: null,
      error: 'Chưa nhập dữ liệu dinh dưỡng.'
    });

  const [suggestions, setSuggestions] = useState<NutritionSearchResult[]>([]);
  const [nutritionResolution, setNutritionResolution] =
    useState<NutritionResolution | null>(null);
  const [selectedNutritionCandidate, setSelectedNutritionCandidate] =
    useState<NutritionSearchResult | null>(null);
  const [selectedPortionSize, setSelectedPortionSize] =
    useState<'S' | 'M' | 'L'>('M');

  const selectedImage = useMemo(
    () => images.find(item => item.id === selectedImageId),
    [images, selectedImageId]
  );

  const normalizedManualImageUrl = useMemo(
    () => normalizeExternalImageUrl(manualImageUrl),
    [manualImageUrl]
  );

  const applyResolution = async (
    resolution: NutritionResolution
  ) => {
    const searchResults = [
      ...(resolution.candidate ? [resolution.candidate] : []),
      ...resolution.alternatives
    ];
    setNutritionResolution(resolution);
    setSuggestions(searchResults);
    setSelectedPortionSize('M');

    if (
      resolution.status === 'AUTO_ACCEPT' &&
      resolution.candidate
    ) {
      const lookup = await createNutritionLookupResult(
        resolution.candidate,
        'M',
        'AUTO_ACCEPT',
        false
      );
      setNutrition(lookup);
      setSelectedNutritionCandidate(resolution.candidate);
      return;
    }

    setNutrition(null);
    setSelectedNutritionCandidate(null);
  };

  const analyze = async (foodName: string) => {
    const query = foodName.trim();
    if (query.length < 2) {
      setNutrition(null);
      setNutritionResolution(null);
      setSelectedNutritionCandidate(null);
      setSuggestions([]);
      setImages([]);
      setSelectedImageId('');
      setAnalysisError('');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const [resolution, imageResults] = await Promise.all([
        resolveNutrition(query, 5),
        searchFoodImages(query, 6)
      ]);
      await applyResolution(resolution);
      setImages(imageResults);
      setSelectedImageId(current =>
        imageResults.some(item => item.id === current) ? current : ''
      );
    } catch (error) {
      console.error('[menu] Unable to analyze dish', error);
      setAnalysisError('Không thể tải đầy đủ dữ liệu gợi ý. Bạn vẫn có thể thêm món thủ công.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const query = name.trim();
    if (query.length < 2) {
      setNutrition(null);
      setImages([]);
      setSelectedImageId('');
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const [resolution, imageResults] = await Promise.all([
          resolveNutrition(query, 5),
          searchFoodImages(query, 6)
        ]);

        if (!active) return;
        await applyResolution(resolution);
        if (!active) return;
        setImages(imageResults);
        setSelectedImageId('');
        setAnalysisError('');
        setIsAnalyzing(false);
      })().catch(error => {
        if (!active) return;
        console.error('[menu] Unable to analyze dish', error);
        setIsAnalyzing(false);
        setAnalysisError('Không thể tải đầy đủ dữ liệu gợi ý. Bạn vẫn có thể thêm món thủ công.');
      });
    }, 650);

    setIsAnalyzing(true);
    setAnalysisError('');

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [name]);

  const handleAddVendor = () => {
    const cleanName = vendorName.trim();
    const price = Number(vendorPrice);

    if (!cleanName) {
      setSaveError('Cần nhập tên quán trước khi thêm.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setSaveError('Giá món tại quán phải là số hợp lệ.');
      return;
    }

    setVendors(current => [
      ...current,
      {
        name: cleanName,
        price: Math.round(price),
        phone: vendorPhone.trim(),
        address: vendorAddress.trim()
      }
    ]);
    setVendorName('');
    setVendorPrice('');
    setVendorPhone('');
    setVendorAddress('');
    setSaveError('');
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setSaveError('Cần nhập tên món.');
      return;
    }
    if (!fallbackCategoryId && !nutrition?.record.category) {
      setSaveError('Cần chọn danh mục cho món chưa có trong dữ liệu.');
      return;
    }
    if (nutritionMode === 'reference' && (!nutrition || !selectedNutritionCandidate)) {
      setSaveError(
        'Chưa có bản ghi tham khảo phù hợp. Chọn “Nhập thủ công” hoặc “Tính từ nguyên liệu” để tạo dữ liệu cá nhân.'
      );
      return;
    }
    if (nutritionMode !== 'reference' && !customNutritionState.input) {
      setSaveError(
        customNutritionState.error ||
          'Dữ liệu dinh dưỡng cá nhân chưa hợp lệ.'
      );
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const safeManualImageUrl = manualImageUrl.trim()
        ? normalizedManualImageUrl
        : null;

      if (manualImageUrl.trim() && !safeManualImageUrl) {
        setSaveError('URL ảnh không hợp lệ. Hãy dùng URL http/https hoặc link chia sẻ Google Drive/Dropbox/GitHub được hỗ trợ.');
        return;
      }

      const existingDish = mockDb.getDishesSync().find(
        dish => normalizeFoodName(dish.name) === normalizeFoodName(cleanName)
      );
      const targetDishId =
        existingDish?.id ||
        'd' +
          (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2));

      let image:
        | {
            url: string;
            source: 'wikimedia-commons' | 'manual';
            sourcePageUrl?: string;
            license?: string;
            attribution?: string;
          }
        | undefined;

      if (selectedImage) {
        image = {
          url: selectedImage.url,
          source: selectedImage.source,
          sourcePageUrl: selectedImage.sourcePageUrl,
          license: selectedImage.license,
          attribution: selectedImage.attribution
        };
      } else if (safeManualImageUrl) {
        image = {
          url: safeManualImageUrl,
          source: 'manual'
        };
      }

      let nutritionSelection: NutritionSelection | undefined;
      if (nutrition && selectedNutritionCandidate) {
        const isAutoAccepted =
          nutritionResolution?.status === 'AUTO_ACCEPT' &&
          nutritionResolution.candidate?.food.id ===
            selectedNutritionCandidate.food.id;

        const selection = await nutritionService.createSelection(
          selectedNutritionCandidate,
          selectedPortionSize,
          isAutoAccepted ? 'AUTO_ACCEPT' : 'USER_CONFIRM',
          !isAutoAccepted
        );

        if (!selection) {
          throw new Error(
            'Không thể xác nhận khẩu phần Nutrition đã chọn. Vui lòng chọn lại dữ liệu món.'
          );
        }
        nutritionSelection = selection;
      }

      const result = await mockDb.addDish(
        cleanName,
        fallbackCategoryId || categories[0]?.id || 'c1',
        {
          dishId: targetDishId,
          image,
          vendors,
          nutritionSelection,
          userNutrition:
            nutritionMode === 'reference'
              ? undefined
              : customNutritionState.input || undefined
        }
      );

      onSaved(result.dish, result.created);
    } catch (error) {
      console.error('[menu] Unable to save dish', error);
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Không thể lưu món. Vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-2xl max-h-[94vh] overflow-hidden rounded-[28px] bg-white shadow-2xl flex flex-col">
        <div className="shrink-0 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
              Smart Add
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-950">Thêm món thông minh</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50">
          <section className="rounded-[22px] bg-white border border-slate-200 p-4">
            <label className="block text-[11px] font-black uppercase tracking-wide text-slate-500">
              1. Tên món
            </label>
            <div className="mt-2 flex gap-2">
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Ví dụ: Cơm tấm sườn bì chả"
                autoFocus
                className="min-w-0 flex-1 h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-950 outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={() => void analyze(name)}
                disabled={isAnalyzing || name.trim().length < 2}
                className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center disabled:opacity-50"
                aria-label="Tìm lại dữ liệu món"
              >
                {isAnalyzing
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <RefreshCw className="w-5 h-5" />}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Cách khai báo dinh dưỡng">
              {([
                {
                  id: 'reference' as const,
                  label: 'Tra cứu DB',
                  desc: '590+ món tham khảo',
                  Icon: Database
                },
                {
                  id: 'manual' as const,
                  label: 'Thủ công',
                  desc: 'Nhãn / tự nhập',
                  Icon: PenLine
                },
                {
                  id: 'recipe' as const,
                  label: 'Nguyên liệu',
                  desc: 'Tính theo công thức',
                  Icon: ChefHat
                }
              ]).map(item => {
                const active = nutritionMode === item.id;
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setNutritionMode(item.id);
                      setSaveError('');
                    }}
                    className={
                      'min-h-[72px] rounded-2xl border p-2.5 text-left transition-all ' +
                      (active
                        ? 'border-blue-500 bg-blue-50 text-blue-950 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200')
                    }
                  >
                    <Icon className="h-4 w-4 text-blue-600" />
                    <div className="mt-1.5 text-[11px] font-black">{item.label}</div>
                    <div className="mt-0.5 text-[9px] font-semibold text-slate-500">
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {nutritionMode === 'reference' && suggestions.length > 0 && name.trim().length >= 2 && (
              <div className="mt-3 space-y-1.5">
                <div className="text-[10px] font-black uppercase text-slate-500">
                  Gợi ý từ Nutrition Knowledge Base:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map(sug => {
                    const isSelected =
                      sug.food.id === selectedNutritionCandidate?.food.id;
                    return (
                      <button
                        key={sug.food.id}
                        type="button"
                        onClick={() => {
                          void (async () => {
                            const lookup = await createNutritionLookupResult(
                              sug,
                              'M',
                              'USER_CONFIRM',
                              true
                            );
                            if (!lookup) {
                              setSaveError(
                                'Bản ghi này chưa đủ điều kiện để dùng làm dữ liệu calo.'
                              );
                              return;
                            }
                            setNutrition(lookup);
                            setSelectedNutritionCandidate(sug);
                            setSelectedPortionSize('M');
                            setSaveError('');
                          })();
                        }}
                        className={
                          'px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ' +
                          (isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300')
                        }
                      >
                        {sug.food.name}
                        <span className="ml-1.5 text-[10px] opacity-75">
                          ≈ {sug.food.energy.kcal_typical} kcal
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {nutritionMode === 'reference' && nutrition ? (
              <div className="mt-3 space-y-2">
                <div
                  className={
                    'rounded-xl border px-3 py-2 text-[11px] font-black ' +
                    (selectedNutritionCandidate?.isReferenceOnly
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : nutritionResolution?.status === 'AUTO_ACCEPT'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-blue-200 bg-blue-50 text-blue-900')
                  }
                >
                  {selectedNutritionCandidate?.isReferenceOnly
                    ? 'Dữ liệu tham khảo · bạn đã xác nhận'
                    : nutritionResolution?.status === 'AUTO_ACCEPT'
                      ? 'Độ tin cậy cao · khớp chính xác'
                      : 'Cần xác nhận · lựa chọn của bạn'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
                    <div className="text-[10px] font-black uppercase text-emerald-700">Calo tự động</div>
                    <div className="mt-1 text-lg font-black text-emerald-900">
                      ≈ {(() => {
                        const portion = nutrition.portions?.find(p => p.portion_size === selectedPortionSize);
                        return portion?.kcal_typical ?? nutrition.calories;
                      })()} kcal
                    </div>
                    <div className="text-[10px] font-bold text-emerald-700">
                      {(() => {
                        const portion = nutrition.portions?.find(
                          p => p.portion_size === selectedPortionSize
                        );
                        const min = portion?.kcal_min ?? nutrition.kcalMin;
                        const max = portion?.kcal_max ?? nutrition.kcalMax;
                        return min !== undefined && max !== undefined
                          ? `Khoảng ${min}–${max} kcal`
                          : '/ khẩu phần chuẩn';
                      })()}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
                    <div className="text-[10px] font-black uppercase text-blue-700">Danh mục dữ liệu</div>
                    <div className="mt-1 text-sm font-black text-blue-950">
                      {nutrition.record.category || 'Món ăn'}
                    </div>
                    <div className="mt-1 text-[10px] font-bold text-blue-700">
                      Độ tin cậy: {nutrition.record.confidence}
                      {nutrition.record.isReferenceOnly && (
                        <span className="ml-1 text-amber-700 font-extrabold">(Tham khảo)</span>
                      )}
                    </div>
                  </div>
                </div>

                {nutrition.portions && nutrition.portions.length > 0 && (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1.5">
                      Khẩu phần món ăn (S / M / L):
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['S', 'M', 'L'] as const).map(size => {
                        const portion = nutrition.portions?.find(p => p.portion_size === size);
                        const isSelected = selectedPortionSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setSelectedPortionSize(size)}
                            className={
                              'p-2 rounded-xl text-center border transition-all ' +
                              (isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300')
                            }
                          >
                            <div className="text-xs font-black">
                              Size {size} {size === 'M' ? '(Chuẩn)' : ''}
                            </div>
                            <div className="text-[11px] font-bold mt-0.5">
                              {portion ? `≈ ${portion.kcal_typical} kcal` : '—'}
                            </div>
                            <div className="text-[9px] opacity-75 mt-0.5">
                              {portion ? `${portion.portion_g}g` : ''}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : nutritionMode === 'reference' && name.trim().length >= 2 && !isAnalyzing ? (
              <div className="mt-3">
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-xs font-semibold text-amber-800">
                  Chưa khớp Nutrition Knowledge Base. Món vẫn có thể được thêm thủ công.
                </div>
                <label className="mt-3 block text-[11px] font-black uppercase text-slate-500">
                  Danh mục
                </label>
                <select
                  value={fallbackCategoryId}
                  onChange={event => setFallbackCategoryId(event.target.value)}
                  className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {nutritionMode !== 'reference' && (
              <div className="mt-3 space-y-3">
                {nutrition && selectedNutritionCandidate ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-blue-800">
                    Có bản tham khảo tương ứng: <strong>{selectedNutritionCandidate.food.name}</strong>.
                    Dữ liệu cá nhân sẽ được lưu riêng và giữ liên kết tới bản tham khảo; không sửa Nutrition DB chung.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-slate-700">
                    Đây là dữ liệu cá nhân của tài khoản. Nutrition DB chung vẫn giữ nguyên.
                  </div>
                )}

                <CustomNutritionEditor
                  key={nutritionMode}
                  mode={nutritionMode}
                  onChange={setCustomNutritionState}
                />

                <label className="block text-[11px] font-black uppercase text-slate-500">
                  Danh mục món
                </label>
                <select
                  value={fallbackCategoryId}
                  onChange={event => setFallbackCategoryId(event.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {analysisError && (
              <div className="mt-3 text-xs font-semibold text-amber-700">{analysisError}</div>
            )}
          </section>

          <section className="rounded-[22px] bg-white border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  2. Hình món
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Tự tìm tối đa 6 ảnh · hoặc dán URL ảnh trực tiếp / link chia sẻ được hỗ trợ
                </div>
              </div>
              <ImageIcon className="w-5 h-5 text-blue-500" />
            </div>

            {isAnalyzing && images.length === 0 ? (
              <div className="mt-4 h-28 rounded-2xl bg-slate-50 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tìm ảnh phù hợp...
              </div>
            ) : images.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {images.map(image => {
                  const selected = image.id === selectedImageId;
                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => {
                        setSelectedImageId(image.id);
                        setManualImageUrl('');
                      }}
                      className={
                        'relative aspect-square overflow-hidden rounded-2xl border-2 bg-slate-100 ' +
                        (selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-transparent')
                      }
                    >
                      <img
                        src={image.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {selected && (
                        <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : name.trim().length >= 2 && !isAnalyzing ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                Chưa tìm thấy ảnh phù hợp từ nguồn miễn phí.
              </div>
            ) : null}

            {selectedImage && (
              <div className="mt-3 text-[10px] leading-relaxed text-slate-500">
                Nguồn: Wikimedia Commons · {selectedImage.license} · {selectedImage.attribution}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
              <div className="text-[10px] font-black uppercase text-emerald-700">
                Ảnh công khai qua URL
              </div>
              <div className="mt-1 text-[10px] font-semibold leading-relaxed text-slate-600">
                nOcnOm không tải ảnh lên Firebase Storage. Hãy chọn ảnh gợi ý từ nguồn công khai hoặc dán URL ảnh HTTPS ổn định để tránh phát sinh chi phí lưu trữ.
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[10px] font-black uppercase text-slate-500">
                Hoặc dán URL ảnh
              </label>
              <input
                value={manualImageUrl}
                onChange={event => {
                  setManualImageUrl(event.target.value);
                  if (event.target.value.trim()) {
                    setSelectedImageId('');
                  }
                }}
                placeholder="https://..."
                className="mt-2 w-full h-11 rounded-xl border border-slate-200 px-3 text-xs"
              />

              {manualImageUrl.trim() ? (
                normalizedManualImageUrl ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Xem trước URL ảnh
                    </div>
                    <div className="flex items-center gap-3">
                      <DishImage
                        src={manualImageUrl}
                        alt={name || 'Ảnh món xem trước'}
                        className="h-20 w-20 shrink-0 rounded-2xl border border-slate-200"
                      />
                      <div className="min-w-0 text-[10px] font-semibold leading-relaxed text-slate-500">
                        Nếu vẫn hiện biểu tượng món ăn thì host đang chặn tải trực tiếp hoặc URL là trang web chứ không phải ảnh.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">
                    URL không hợp lệ.
                  </div>
                )
              ) : null}
            </div>
          </section>

          <section className="rounded-[22px] bg-white border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  3. Quán đang bán
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Một món có thể thêm nhiều quán. Có thể bỏ qua và bổ sung sau.
                </div>
              </div>
            </div>

            {vendors.length > 0 && (
              <div className="mt-4 space-y-2">
                {vendors.map((vendor, index) => (
                  <div
                    key={vendor.name + '-' + index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 flex items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-slate-950">{vendor.name}</div>
                      <div className="mt-1 text-[11px] font-bold text-blue-600">
                        {currency.format(vendor.price)}đ
                      </div>
                      {vendor.address && (
                        <div className="mt-1 truncate text-[10px] text-slate-500">{vendor.address}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setVendors(current => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-rose-500 flex items-center justify-center"
                      aria-label={'Xóa ' + vendor.name}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <input
                value={vendorName}
                onChange={event => setVendorName(event.target.value)}
                placeholder="Tên quán"
                className="col-span-2 h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
              <input
                value={vendorPrice}
                onChange={event => setVendorPrice(event.target.value)}
                inputMode="numeric"
                placeholder="Giá bán"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
              <input
                value={vendorPhone}
                onChange={event => setVendorPhone(event.target.value)}
                inputMode="tel"
                placeholder="Số điện thoại"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
              <input
                value={vendorAddress}
                onChange={event => setVendorAddress(event.target.value)}
                placeholder="Địa chỉ"
                className="col-span-2 h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
              <button
                type="button"
                onClick={handleAddVendor}
                className="col-span-2 min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-black flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Thêm quán vào món
              </button>
            </div>
          </section>

          {saveError && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
              {saveError}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white p-4 grid grid-cols-[0.8fr_1.2fr] gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-2xl bg-slate-100 text-slate-700 text-xs font-black"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !name.trim()}
            className="min-h-12 rounded-2xl bg-blue-600 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isSaving ? 'Đang lưu...' : 'Lưu món'}
          </button>
        </div>
      </div>
    </div>
  );
}
