import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  ArrowUpRight,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Droplets,
  Edit3,
  Flame,
  HeartPulse,
  LockKeyhole,
  Plus,
  Save,
  Scale,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  UtensilsCrossed,
  X
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  estimateDishCalories,
  getDishNutritionSnapshot,
  getEditableMealDateRange,
  isMealDateEditable,
  mockDb,
  sumMealAddonCalories,
  type Dish,
  type LogEntry,
  type MealAddon,
  type MealKey
} from '../lib/db';
import DishImage from './DishImage';
import MealAddonPicker, { type MealAddonSelection } from './MealAddonPicker';
import {
  loadNutritionAddons,
  type NutritionAddonOption
} from '../lib/nutritionKnowledge';
import {
  calculateAge,
  calculateBMI,
  calculateBMR,
  calculateCalorieGoalPlan,
  calculateTDEEEstimate,
  calculateWaterRequirement,
  getBMICategory,
  getIdealWeightRange,
  roundEnergyEstimateForDisplay,
  HEALTH_LIMITS,
  DEFAULT_BMI_REFERENCE_SYSTEM,
  BMI_REFERENCE_LABELS,
  ACTIVITY_LABELS,
  GOAL_LABELS
} from '../lib/healthUtils';
import {
  getCachedUserProfile,
  loadUserProfile,
  type UserProfileData
} from '../services/userProfile';
import {
  getVietnamDateKey,
  getVietnamTimestampForDateKey,
  VIETNAM_TIME_ZONE
} from '../lib/dateTime';
import { useVietnamBusinessDate } from '../hooks/useVietnamBusinessDate';

const mealKeys: MealKey[] = ['A', 'B', 'C'];
const mealOrder: Record<MealKey, number> = { A: 0, B: 1, C: 2 };
const mealLabels: Record<MealKey, string> = {
  A: 'Bữa sáng',
  B: 'Bữa trưa',
  C: 'Bữa tối'
};

type MealDraft = {
  dishId: string;
  vendorId: string;
  fruitId: string;
  drinkId: string;
};

const emptyDrafts = (): Record<MealKey, MealDraft> => ({
  A: { dishId: '', vendorId: '', fruitId: '', drinkId: '' },
  B: { dishId: '', vendorId: '', fruitId: '', drinkId: '' },
  C: { dishId: '', vendorId: '', fruitId: '', drinkId: '' }
});

const timestampForDateKey = (dateKey: string) =>
  getVietnamTimestampForDateKey(dateKey, '12:00:00') ?? 0;

const formatDay = (timestamp: number) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(timestamp));

const formatDateKey = (dateKey: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(timestampForDateKey(dateKey)));

type DayGroup = {
  key: string;
  timestamp: number;
  logs: LogEntry[];
};

type Props = {
  currentUser?: User | null;
  onOpenProfile?: () => void;
};

export default function LogsPage({ currentUser, onOpenProfile }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const businessDate = useVietnamBusinessDate();
  const editRange = useMemo(
    () => getEditableMealDateRange(businessDate.now),
    [businessDate.dateKey]
  );
  const [calendarDate, setCalendarDate] = useState(editRange.max);
  const [mealDrafts, setMealDrafts] = useState<Record<MealKey, MealDraft>>(emptyDrafts);
  const [nutritionAddons, setNutritionAddons] = useState<NutritionAddonOption[]>([]);
  const [editorError, setEditorError] = useState('');
  const [dayMode, setDayMode] = useState<'DETAIL' | 'EDIT'>('DETAIL');

  useEffect(() => {
    setCalendarDate(current =>
      current > editRange.max ? editRange.max : current
    );
    setSelectedDayKey(current =>
      current && current > editRange.max ? editRange.max : current
    );
  }, [editRange.max]);

  // Hồ sơ sức khỏe người dùng
  const [profile, setProfile] = useState<Partial<UserProfileData> | null>(() => {
    return currentUser ? getCachedUserProfile(currentUser.uid) : null;
  });

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    let active = true;
    void loadUserProfile(currentUser.uid)
      .then(p => {
        if (active) setProfile(p);
      })
      .catch(err => {
        console.warn('Chưa tải được hồ sơ sức khỏe từ Firestore', err);
      });

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UserProfileData>;
      if (customEvent.detail) {
        setProfile(customEvent.detail);
      }
    };

    window.addEventListener('nocnom:profile-updated', handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener('nocnom:profile-updated', handleProfileUpdate);
    };
  }, [currentUser]);

  useEffect(() => {
    const unsubLogs = mockDb.subscribeLogs(setLogs);
    const unsubDishes = mockDb.subscribeDishes(setDishes);
    void loadNutritionAddons().then(setNutritionAddons);
    return () => {
      unsubLogs();
      unsubDishes();
    };
  }, []);

  useEffect(() => {
    if (!selectedDayKey) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedDayKey(null);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedDayKey]);

  const findDish = (name: string) =>
    dishes.find(
      dish =>
        dish.name === name ||
        dish.legacyNames?.includes(name)
    );

  const resolveCalories = (log: LogEntry) => {
    if (typeof log.calories === 'number' && Number.isFinite(log.calories)) {
      return Math.max(0, Math.round(log.calories));
    }

    const dish = findDish(log.dishName);
    return dish ? estimateDishCalories(dish) : 0;
  };

  const groupedDays = useMemo<DayGroup[]>(() => {
    const groups = new Map<string, LogEntry[]>();

    logs.forEach(log => {
      const key = getVietnamDateKey(log.timestamp);
      const current = groups.get(key) || [];
      current.push(log);
      groups.set(key, current);
    });

    return Array.from(groups.entries())
      .map(([key, dayLogs]) => ({
        key,
        timestamp: timestampForDateKey(key),
        logs: [...dayLogs].sort((a, b) => {
          if (a.mealKey && b.mealKey) {
            return mealOrder[a.mealKey] - mealOrder[b.mealKey];
          }

          if (a.mealKey) return -1;
          if (b.mealKey) return 1;
          return a.timestamp - b.timestamp;
        })
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [logs]);

  const selectedDay = useMemo<DayGroup | null>(() => {
    if (!selectedDayKey) return null;

    return {
      key: selectedDayKey,
      timestamp: timestampForDateKey(selectedDayKey),
      logs: logs
        .filter(log => getVietnamDateKey(log.timestamp) === selectedDayKey)
        .sort((a, b) => {
          if (a.mealKey && b.mealKey) return mealOrder[a.mealKey] - mealOrder[b.mealKey];
          return a.timestamp - b.timestamp;
        })
    };
  }, [logs, selectedDayKey]);

  const selectedDayEditable = selectedDayKey
    ? isMealDateEditable(selectedDayKey, businessDate.now)
    : false;

  useEffect(() => {
    if (!selectedDay) return;

    const next = emptyDrafts();

    mealKeys.forEach(mealKey => {
      const log = selectedDay.logs.find(item => item.mealKey === mealKey);
      if (!log) return;

      const dish = dishes.find(
        item =>
          item.name === log.dishName ||
          item.legacyNames?.includes(log.dishName)
      );
      if (!dish) return;

      const vendor = dish.vendors.find(item => item.name === log.vendorName);
      next[mealKey] = {
        dishId: dish.id,
        vendorId: vendor?.id || '',
        fruitId:
          log.addons?.find(addon => addon.kind === 'fruit')?.nutritionRecordId ||
          log.addons?.find(addon => addon.kind === 'fruit')?.id ||
          '',
        drinkId:
          log.addons?.find(addon => addon.kind === 'drink')?.nutritionRecordId ||
          log.addons?.find(addon => addon.kind === 'drink')?.id ||
          ''
      };
    });

    setMealDrafts(next);
    setEditorError('');
  }, [dishes, selectedDay?.key, logs]);

  const selectedDayCalories = selectedDay
    ? selectedDay.logs.reduce(
        (total, log) => total + resolveCalories(log) + sumMealAddonCalories(log),
        0
      )
    : 0;

  // Ngày nghiệp vụ luôn theo Asia/Ho_Chi_Minh và tự rollover lúc 00:00.
  const todayKey = businessDate.dateKey;

  // Danh sách bữa ăn hôm nay
  const todayLogs = useMemo(() => {
    return logs.filter(log => getVietnamDateKey(log.timestamp) === todayKey);
  }, [logs, todayKey]);

  // Tổng calo hôm nay
  const todayCalories = useMemo(() => {
    return todayLogs.reduce(
      (total, log) => total + resolveCalories(log) + sumMealAddonCalories(log),
      0
    );
  }, [todayLogs, dishes]);

  // Phân bổ calo các bữa ăn hôm nay (Sáng - Trưa - Tối)
  const mealDistribution = useMemo(() => {
    let breakfastKcal = 0;
    let lunchKcal = 0;
    let dinnerKcal = 0;

    todayLogs.forEach(log => {
      const kcal = resolveCalories(log) + sumMealAddonCalories(log);
      if (log.mealKey === 'A') breakfastKcal += kcal;
      else if (log.mealKey === 'B') lunchKcal += kcal;
      else if (log.mealKey === 'C') dinnerKcal += kcal;
    });

    const total = breakfastKcal + lunchKcal + dinnerKcal;
    return {
      breakfastKcal,
      lunchKcal,
      dinnerKcal,
      total,
      breakfastPct: total > 0 ? Math.round((breakfastKcal / total) * 100) : 0,
      lunchPct: total > 0 ? Math.round((lunchKcal / total) * 100) : 0,
      dinnerPct: total > 0 ? Math.round((dinnerKcal / total) * 100) : 0
    };
  }, [todayLogs, dishes]);

  // Thống kê calo 7 ngày gần nhất
  const last7DaysData = useMemo(() => {
    const [tY, tM, tD] = todayKey.split('-').map(Number);
    const todayUtc = Date.UTC(tY, tM - 1, tD, 12, 0, 0);

    const days: Array<{
      dateKey: string;
      shortLabel: string;
      dayNum: string;
      calories: number;
      isToday: boolean;
      mealCount: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayUtc - i * 24 * 60 * 60 * 1000);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;

      const dayLogs = logs.filter(log => getVietnamDateKey(log.timestamp) === key);
      const totalKcal = dayLogs.reduce(
        (sum, log) => sum + resolveCalories(log) + sumMealAddonCalories(log),
        0
      );

      const dayOfWeek = d.getUTCDay();
      const shortDay = dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`;

      days.push({
        dateKey: key,
        shortLabel: i === 0 ? 'Nay' : shortDay,
        dayNum: `${day}/${month}`,
        calories: totalKcal,
        isToday: i === 0,
        mealCount: dayLogs.length
      });
    }

    const maxKcal = Math.max(1600, ...days.map(d => d.calories));
    const totalWeekKcal = days.reduce((sum, d) => sum + d.calories, 0);
    const activeDays = days.filter(d => d.calories > 0).length;
    const avgKcal = activeDays > 0 ? Math.round(totalWeekKcal / activeDays) : 0;

    return { days, maxKcal, avgKcal, totalWeekKcal, activeDays };
  }, [logs, dishes, todayKey]);

  // Tính toán sức khỏe từ hồ sơ. Không suy đoán dữ liệu nhân khẩu học bị thiếu.
  const rawHeight = Number(profile?.heightCm);
  const rawWeight = Number(profile?.weightKg);
  const heightNum =
    Number.isFinite(rawHeight) && rawHeight >= HEALTH_LIMITS.heightCm.min &&
      rawHeight <= HEALTH_LIMITS.heightCm.max
      ? rawHeight
      : null;
  const weightNum =
    Number.isFinite(rawWeight) && rawWeight >= HEALTH_LIMITS.weightKg.min &&
      rawWeight <= HEALTH_LIMITS.weightKg.max
      ? rawWeight
      : null;
  const gender = profile?.gender || '';
  const activityLevel = profile?.activityLevel || '';
  const healthGoal = profile?.healthGoal || '';
  const age = profile?.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;
  const hasBmrGender = gender === 'male' || gender === 'female';
  const hasAdultAge = age !== null && age >= HEALTH_LIMITS.age.min;

  const missingHealthFields = [
    !heightNum ? 'chiều cao' : '',
    !weightNum ? 'cân nặng' : '',
    !profile?.dateOfBirth || !hasAdultAge ? 'ngày sinh hợp lệ (từ 18 tuổi)' : '',
    !hasBmrGender ? 'giới tính dùng cho BMR (Nam/Nữ)' : '',
    !activityLevel ? 'mức vận động' : '',
    !healthGoal ? 'mục tiêu dinh dưỡng' : ''
  ].filter(Boolean);

  const healthProfileComplete = missingHealthFields.length === 0;

  const bmi = heightNum && weightNum ? calculateBMI(weightNum, heightNum) : null;
  const bmiCategory = bmi !== null ? getBMICategory(bmi) : null;
  const idealWeight = heightNum ? getIdealWeightRange(heightNum) : null;

  const bmr =
    healthProfileComplete && heightNum && weightNum && age !== null
      ? calculateBMR(weightNum, heightNum, age, gender)
      : null;
  const tdeeEstimate = calculateTDEEEstimate(bmr, activityLevel);
  const tdee = tdeeEstimate?.value ?? null;
  const calorieGoalPlan = calculateCalorieGoalPlan(tdee, healthGoal);
  const targetCalories = calorieGoalPlan?.value ?? null;
  const displayTdee =
    tdee !== null ? roundEnergyEstimateForDisplay(tdee) : null;
  const displayTargetCalories =
    targetCalories !== null
      ? roundEnergyEstimateForDisplay(targetCalories)
      : null;

  const waterReq = weightNum ? calculateWaterRequirement(weightNum) : null;

  const calorieProgressPct =
    targetCalories !== null && targetCalories > 0
      ? Math.min(100, Math.round((todayCalories / targetCalories) * 100))
      : 0;
  const calorieRemaining =
    targetCalories !== null ? targetCalories - todayCalories : null;

  const openDate = (dateKey: string) => {
    setCalendarDate(dateKey);
    setSelectedDayKey(dateKey);
    setDayMode('DETAIL');
    setEditorError('');
  };

  const patchDraft = (mealKey: MealKey, patch: Partial<MealDraft>) => {
    setMealDrafts(current => ({
      ...current,
      [mealKey]: {
        ...current[mealKey],
        ...patch
      }
    }));
  };

  const saveMeal = (mealKey: MealKey) => {
    if (!selectedDayKey || !selectedDayEditable) return;

    const draft = mealDrafts[mealKey];
    const dish = dishes.find(item => item.id === draft.dishId);

    if (!dish) {
      setEditorError('Hãy chọn món trước khi lưu.');
      return;
    }

    const vendor = dish.vendors.find(item => item.id === draft.vendorId);
    if (dish.vendors.length > 0 && !vendor) {
      setEditorError('Hãy chọn quán cho món này.');
      return;
    }

    const selectedAddonIds = [draft.fruitId, draft.drinkId].filter(Boolean);
    const addons: MealAddon[] = selectedAddonIds
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
        kcalMax: item.kcalMax
      }));

    try {
      mockDb.upsertMealLog({
        dateKey: selectedDayKey,
        mealKey,
        dishName: dish.name,
        vendorName: vendor?.name || 'Không ghi quán',
        price: vendor?.price || 0,
        calories: estimateDishCalories(dish),
        addons,
        nutritionSnapshot: getDishNutritionSnapshot(dish)
      });
      setEditorError('');
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'Không thể lưu lịch sử bữa ăn.');
    }
  };

  const removeMeal = (log: LogEntry) => {
    if (!window.confirm('Xóa ' + (log.mealKey ? mealLabels[log.mealKey] : 'món này') + ' khỏi lịch sử?')) {
      return;
    }

    try {
      mockDb.deleteMealLog(log.id);
      setEditorError('');
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'Không thể xóa lịch sử bữa ăn.');
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* 1. Header Trang Sức Khỏe */}
      <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/20">
              <Activity className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                  Trung tâm Sức khỏe & Dinh dưỡng
                </span>
                {bmiCategory && (
                  <span className={'rounded-full px-2 py-0.5 text-[9px] font-black ' + bmiCategory.badgeBg + ' ' + bmiCategory.badgeText}>
                    {bmiCategory.label}
                  </span>
                )}
              </div>
              <h2 className="mt-0.5 text-xl font-black text-slate-950 dark:text-slate-100">
                Sức khỏe nOcnOm
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Thể trạng, cân bằng Calo & Nhật ký dinh dưỡng sinh viên
              </p>
            </div>
          </div>

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-2xl border border-blue-200 bg-blue-50/80 px-3.5 py-2 text-xs font-black text-blue-700 transition-all hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/40"
            >
              <HeartPulse className="h-4 w-4" />
              <span>Hồ sơ sức khỏe</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </button>
          )}
        </div>
      </section>

      {/* Thông báo nếu chưa nhập thông tin thể trạng */}
      {!healthProfileComplete && (
        <section
          className="surface-warning-readable relative overflow-hidden rounded-[26px] p-4"
          data-ui="health-profile-warning"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm shadow-amber-700/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="warning-title text-sm font-black">
                Hoàn thiện hồ sơ thể trạng
              </div>
              <p className="warning-copy mt-1.5 text-xs font-bold leading-relaxed">
                Hoàn thiện các trường còn thiếu để nOcnOm ước tính BMI, BMR/TDEE và mục tiêu calo mà không tự suy đoán dữ liệu cá nhân. Thiếu: {missingHealthFields.join(', ')}.
              </p>
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-700 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-amber-800 active:scale-95"
                >
                  <span>Cập nhật ngay</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2. Thẻ Thống Kê Sức Khỏe & Thể Trạng (Health Metric Dashboard) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* THẺ 1: Chỉ số BMI & Thể trạng */}
        <section className="health-card flex flex-col justify-between rounded-[26px] border p-4.5 shadow-sm transition-all">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  <Scale className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="health-kicker block text-[11px] font-black tracking-wide">
                    Chỉ số thể trạng
                  </span>
                  <span className="text-sm font-black text-slate-950 dark:text-white">
                    BMI · {BMI_REFERENCE_LABELS[DEFAULT_BMI_REFERENCE_SYSTEM]}
                  </span>
                </div>
              </div>

              {bmiCategory && (
                <span className={'rounded-full px-2.5 py-1 text-[10px] font-black ' + bmiCategory.badgeBg + ' ' + bmiCategory.badgeText}>
                  {bmiCategory.label}
                </span>
              )}
            </div>

            {/* Chỉ số BMI & Phân loại */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-100">
                {bmi !== null ? bmi : '--'}
              </span>
              <span className="health-chip-muted inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-black">
                {heightNum && weightNum ? `${weightNum} kg · ${heightNum} cm` : 'Chưa có số đo'}
              </span>
            </div>

            {/* Thanh đo dải màu BMI Châu Á */}
            <div className="mt-3">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="grid h-full w-full grid-cols-4">
                  <div className="bg-amber-400" title="Gầy (< 18.5)" />
                  <div className="bg-emerald-500" title="Lý tưởng (18.5 - 22.9)" />
                  <div className="bg-orange-500" title="Thừa cân (23 - 24.9)" />
                  <div className="bg-rose-500" title="Béo phì (>= 25)" />
                </div>
              </div>
              <div className="health-copy mt-2 grid grid-cols-4 gap-1 text-[10px] font-black leading-tight">
                <span className="text-left">&lt; 18.5 (Gầy)</span>
                <span className="text-center text-emerald-700 dark:text-emerald-300">18.5 - 22.9</span>
                <span className="text-center">23 - 24.9</span>
                <span className="text-right">&ge; 25</span>
              </div>
            </div>
          </div>

          <div className="health-copy mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-bold dark:border-slate-700 dark:bg-slate-950/80">
            {idealWeight ? (
              <div className="flex items-center justify-between">
                <span>Khoảng cân nặng tham khảo:</span>
                <span className="font-black text-slate-900 dark:text-slate-100">
                  {idealWeight.min} - {idealWeight.max} kg
                </span>
              </div>
            ) : (
              <span>Cập nhật chiều cao để xem khoảng cân nặng tham khảo theo BMI.</span>
            )}
            {bmiCategory && (
              <p className="health-copy mt-1 text-[10px] font-semibold">
                {bmiCategory.description}
              </p>
            )}
          </div>
        </section>

        {/* THẺ 2: Năng lượng Hôm nay (Calo vs Mục tiêu TDEE) & Nhu cầu nước */}
        <section className="health-card flex flex-col justify-between rounded-[26px] border p-4.5 shadow-sm transition-all">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                  <Flame className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="health-kicker block text-[11px] font-black tracking-wide">
                    Năng lượng hôm nay
                  </span>
                  <span className="text-sm font-black text-slate-950 dark:text-white">
                    Calo nạp / Mục tiêu
                  </span>
                </div>
              </div>

              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-black text-blue-800 dark:border-blue-800 dark:bg-blue-500/15 dark:text-blue-200">
                {displayTargetCalories !== null
                  ? `Mục tiêu ≈ ${displayTargetCalories.toLocaleString('vi-VN')} kcal`
                  : 'Cần hồ sơ đầy đủ'}
              </span>
            </div>

            {/* Tiến độ Calo hôm nay */}
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-950 dark:text-slate-100">
                  {todayCalories.toLocaleString('vi-VN')}
                </span>
                <span className="health-copy text-sm font-black">
                  / {displayTargetCalories !== null
                    ? `≈ ${displayTargetCalories.toLocaleString('vi-VN')} kcal`
                    : '-- kcal'}
                </span>
              </div>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                {targetCalories !== null ? `${calorieProgressPct}%` : '--'}
              </span>
            </div>

            <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${calorieProgressPct}%` }}
              />
            </div>

            <div className="health-copy mt-2.5 flex items-center justify-between gap-3 text-xs font-black">
              <span>{todayLogs.length} bữa ăn hôm nay</span>
              <span>
                {calorieRemaining === null
                  ? 'Hoàn thiện hồ sơ để tính mục tiêu'
                  : calorieRemaining > 0
                    ? `Còn khoảng ${roundEnergyEstimateForDisplay(calorieRemaining).toLocaleString('vi-VN')} kcal`
                    : calorieRemaining < 0
                      ? `Vượt khoảng ${roundEnergyEstimateForDisplay(Math.abs(calorieRemaining)).toLocaleString('vi-VN')} kcal`
                      : 'Đã đạt đúng mục tiêu'}
              </span>
            </div>
            {displayTdee !== null && tdee !== null ? (
              <div className="health-copy mt-2 text-[11px] font-bold">
                TDEE ước tính ≈ {displayTdee.toLocaleString('vi-VN')} kcal/ngày
                <span className="font-semibold">
                  {' '}· giá trị tính toán {tdee.toLocaleString('vi-VN')} kcal
                </span>
              </div>
            ) : null}
          </div>

          {/* Gợi ý nước uống */}
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-cyan-300 bg-cyan-50 p-3.5 text-xs font-black text-cyan-950 dark:border-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-50">
            <Droplets className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
            <div className="min-w-0 flex-1">
              <span>Ước tính nước tham khảo: </span>
              {waterReq ? (
                <>
                  <span className="font-extrabold text-cyan-700 dark:text-cyan-300">
                    ~{(waterReq.ml / 1000).toFixed(1)} lít / ngày
                  </span>
                  <span className="font-semibold text-cyan-900 dark:text-cyan-200">
                    {' '}(khoảng {waterReq.glasses} cốc 250ml)
                  </span>
                </>
              ) : (
                <span className="font-semibold text-cyan-900 dark:text-cyan-200">
                  Cập nhật cân nặng để xem ước tính.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* THẺ 3: Xu hướng Calo 7 ngày gần nhất */}
        <section className="health-card flex flex-col justify-between rounded-[26px] border p-4.5 shadow-sm transition-all">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="health-kicker block text-[11px] font-black tracking-wide">
                    Theo dõi tuần
                  </span>
                  <span className="text-sm font-black text-slate-950 dark:text-white">
                    Calo 7 ngày gần nhất
                  </span>
                </div>
              </div>

              <span className="health-copy text-[11px] font-black">
                TB: <strong className="text-slate-950 dark:text-white">~{last7DaysData.avgKcal.toLocaleString('vi-VN')}</strong> kcal/ngày
              </span>
            </div>

            {/* Biểu đồ cột mini 7 ngày */}
            <div className="mt-5 grid grid-cols-7 items-end gap-2 pt-2">
              {last7DaysData.days.map(day => {
                const heightPct = Math.max(
                  12,
                  Math.round((day.calories / last7DaysData.maxKcal) * 100)
                );

                return (
                  <button
                    type="button"
                    key={day.dateKey}
                    onClick={() => openDate(day.dateKey)}
                    className="group flex flex-col items-center gap-1.5 focus:outline-none"
                    title={`${day.dayNum}: ${day.calories.toLocaleString('vi-VN')} kcal (${day.mealCount} bữa)`}
                  >
                    <span className="health-copy text-[9px] font-black group-hover:text-blue-600 dark:group-hover:text-blue-300">
                      {day.calories > 0 ? `${Math.round(day.calories / 100) / 10}k` : '0'}
                    </span>

                    <div className="relative flex h-24 w-full max-w-[28px] items-end rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                      <div
                        className={
                          'w-full rounded-lg transition-all duration-300 ' +
                          (day.isToday
                            ? 'bg-gradient-to-t from-blue-600 to-indigo-500 shadow-sm shadow-blue-500/30'
                            : day.calories > 0
                            ? 'bg-blue-300/80 group-hover:bg-blue-400 dark:bg-blue-600/50'
                            : 'bg-transparent')
                        }
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    <span
                      className={
                        'text-[10px] font-black ' +
                        (day.isToday
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-700 dark:text-slate-300')
                      }
                    >
                      {day.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="health-copy mt-3 flex items-center justify-between gap-2 text-[11px] font-bold">
            <span>Bấm vào cột ngày để xem chi tiết bữa ăn</span>
            <span className="text-blue-600 font-extrabold">7 ngày qua</span>
          </div>
        </section>

        {/* THẺ 4: Tương quan phân bổ bữa ăn (Sáng / Trưa / Tối) */}
        <section className="health-card flex flex-col justify-between rounded-[26px] border p-4.5 shadow-sm transition-all">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
                  <UtensilsCrossed className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="health-kicker block text-[11px] font-black tracking-wide">
                    Cân bằng bữa ăn
                  </span>
                  <span className="text-sm font-black text-slate-950 dark:text-white">
                    Phân bổ Sáng / Trưa / Tối
                  </span>
                </div>
              </div>

              <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[10px] font-black text-purple-800 dark:border-purple-800 dark:bg-purple-500/15 dark:text-purple-200">
                Hôm nay
              </span>
            </div>

            {/* 3 Thống kê bữa */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-2.5 text-center dark:border-amber-900/30 dark:bg-amber-950/20">
                <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                  Sáng 🌅
                </span>
                <div className="mt-1 text-xs font-black text-slate-900 dark:text-slate-100">
                  {mealDistribution.breakfastKcal} kcal
                </div>
                <div className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                  {mealDistribution.breakfastPct}%
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-2.5 text-center dark:border-blue-900/30 dark:bg-blue-950/20">
                <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400">
                  Trưa ☀️
                </span>
                <div className="mt-1 text-xs font-black text-slate-900 dark:text-slate-100">
                  {mealDistribution.lunchKcal} kcal
                </div>
                <div className="text-[10px] font-extrabold text-blue-700 dark:text-blue-300">
                  {mealDistribution.lunchPct}%
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-2.5 text-center dark:border-indigo-900/30 dark:bg-indigo-950/20">
                <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400">
                  Tối 🌙
                </span>
                <div className="mt-1 text-xs font-black text-slate-900 dark:text-slate-100">
                  {mealDistribution.dinnerKcal} kcal
                </div>
                <div className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300">
                  {mealDistribution.dinnerPct}%
                </div>
              </div>
            </div>

            {/* Thanh thanh tỷ lệ màu */}
            <div className="mt-3.5">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                {mealDistribution.total > 0 ? (
                  <>
                    <div
                      className="bg-amber-400"
                      style={{ width: `${mealDistribution.breakfastPct}%` }}
                      title={`Bữa sáng: ${mealDistribution.breakfastPct}%`}
                    />
                    <div
                      className="bg-blue-500"
                      style={{ width: `${mealDistribution.lunchPct}%` }}
                      title={`Bữa trưa: ${mealDistribution.lunchPct}%`}
                    />
                    <div
                      className="bg-indigo-500"
                      style={{ width: `${mealDistribution.dinnerPct}%` }}
                      title={`Bữa tối: ${mealDistribution.dinnerPct}%`}
                    />
                  </>
                ) : (
                  <div className="w-full bg-slate-200 dark:bg-slate-700" />
                )}
              </div>
            </div>
          </div>

          <p className="health-copy mt-3 text-[11px] font-bold leading-relaxed">
            💡 Tỷ lệ năng lượng lý tưởng sinh viên: Sáng 30% · Trưa 40% · Tối 30%. Hạn chế ăn đêm nhiều calo sau 21h.
          </p>
        </section>
      </div>

      {/* 3. Phân Mục Nhật Ký Ăn Uống & Ghi Bù */}
      <div className="pt-2">
        <div className="flex items-center gap-2 px-1 pb-3">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-black text-slate-950 dark:text-slate-100">
            Nhật ký ăn uống theo ngày
          </h3>
        </div>

        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/80 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20">
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-black text-slate-950 dark:text-white">
                    Ghi bù hoặc chỉnh lịch sử
                  </div>
                  <span className="rounded-lg bg-blue-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    Tối đa 3 ngày trước
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
                  Chọn từ {formatDateKey(editRange.min)} đến hôm nay. Ngày tương lai và ngày cũ hơn chỉ được xem.
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <input
                type="date"
                min={editRange.min}
                max={editRange.max}
                value={calendarDate}
                onChange={event => setCalendarDate(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 text-sm font-black text-slate-950 shadow-inner outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-500/10"
                aria-label="Chọn ngày lịch sử ăn uống"
              />
              <button
                type="button"
                onClick={() => openDate(calendarDate)}
                className="min-h-12 rounded-2xl bg-blue-600 px-5 text-xs font-black text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95"
              >
                Mở ngày
              </button>
            </div>
          </div>
        </section>
      </div>


      {groupedDays.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[26px] border border-slate-200 dark:border-slate-700 shadow-sm py-14 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div className="mt-4 font-black text-slate-900 dark:text-slate-100">Chưa có lịch sử</div>
          <p className="mt-1 text-sm text-slate-500">
            Có thể dùng lịch phía trên để ghi bù cho hôm nay hoặc tối đa 3 ngày trước.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedDays.map(day => (
            <button
              type="button"
              key={day.key}
              onClick={() => openDate(day.key)}
              className="w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700 active:scale-[0.99]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black capitalize text-slate-950 dark:text-slate-100">
                    {formatDay(day.timestamp)}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span>{day.logs.length} bữa</span>
                    <span>·</span>
                    <span className="rounded-lg bg-orange-50 px-2 py-1 font-black text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                      ≈ {day.logs
                        .reduce(
                          (total, log) =>
                            total + resolveCalories(log) + sumMealAddonCalories(log),
                          0
                        )
                        .toLocaleString('vi-VN')} kcal
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedDay && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={'Chi tiết ăn uống ngày ' + formatDateKey(selectedDay.key)}
          onMouseDown={event => {
            if (event.currentTarget === event.target) setSelectedDayKey(null);
          }}
        >
          <div className="flex w-full max-w-lg max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
            <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-700 dark:text-blue-300">
                    Lịch sử trong ngày
                  </div>
                  <h3 className="mt-1 text-xl font-black capitalize text-slate-950 dark:text-slate-100">
                    {formatDay(selectedDay.timestamp)}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>{selectedDay.logs.length} bữa đã ghi nhận</span>
                    {selectedDayEditable ? (
                      <span className="rounded-lg bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-600 dark:text-blue-300">
                        Có thể chỉnh sửa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-500">
                        <LockKeyhole className="h-3 w-3" />
                        Chỉ xem
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDayKey(null)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300"
                  aria-label="Đóng chi tiết ngày"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 rounded-[22px] bg-gradient-to-r from-orange-500 to-amber-400 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.12em] text-white">
                      Tổng calo tiêu thụ
                    </div>
                    <div className="mt-0.5 text-2xl font-black">
                      ≈ {selectedDayCalories.toLocaleString('vi-VN')} kcal
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              {editorError && (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                  {editorError}
                </div>
              )}

              {dayMode === 'DETAIL' && selectedDayEditable && (
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDayMode('EDIT')}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-sm active:scale-95"
                  >
                    <Edit3 className="h-4 w-4" />
                    {selectedDay.logs.length > 0 ? 'Chỉnh sửa' : 'Ghi bữa ăn'}
                  </button>
                </div>
              )}

              {dayMode === 'EDIT' && selectedDayEditable && (
                <section className="mb-5 space-y-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setDayMode('DETAIL');
                        setEditorError('');
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-xs font-black text-slate-700 dark:text-slate-200"
                    >
                      Xong chỉnh sửa
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-950 dark:text-white">
                        Ghi bù / chỉnh bữa ăn
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        Mỗi bữa có một món chính và có thể thêm trái cây hoặc nước uống.
                      </div>
                    </div>
                    <Plus className="h-5 w-5 text-blue-500" />
                  </div>

                  {mealKeys.map(mealKey => {
                    const existing = selectedDay.logs.find(log => log.mealKey === mealKey);
                    const draft = mealDrafts[mealKey];
                    const selectedDish = dishes.find(dish => dish.id === draft.dishId);
                    const vendors = selectedDish?.vendors || [];

                    return (
                      <div
                        key={mealKey}
                        className="rounded-[22px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-black uppercase tracking-[0.12em] text-blue-500">
                            {mealLabels[mealKey]}
                          </div>
                          {existing && (
                            <button
                              type="button"
                              onClick={() => removeMeal(existing)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                              aria-label={'Xóa ' + mealLabels[mealKey]}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          <label className="block">
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">Món ăn</span>
                            <select
                              value={draft.dishId}
                              onChange={event => {
                                const dish = dishes.find(item => item.id === event.target.value);
                                patchDraft(mealKey, {
                                  dishId: event.target.value,
                                  vendorId: dish?.vendors[0]?.id || ''
                                });
                              }}
                              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-bold text-slate-950 dark:text-slate-100"
                            >
                              <option value="">— Chọn món —</option>
                              {dishes.map(dish => (
                                <option key={dish.id} value={dish.id}>{dish.name}</option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">Quán / nguồn món</span>
                            <select
                              value={draft.vendorId}
                              onChange={event => patchDraft(mealKey, { vendorId: event.target.value })}
                              disabled={!selectedDish || vendors.length === 0}
                              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-bold text-slate-950 dark:text-slate-100 disabled:opacity-60"
                            >
                              {vendors.length === 0 ? (
                                <option value="">Không ghi quán</option>
                              ) : (
                                <>
                                  <option value="">— Chọn quán —</option>
                                  {vendors.map(vendor => (
                                    <option key={vendor.id} value={vendor.id}>
                                      {vendor.name} · {vendor.price.toLocaleString('vi-VN')}đ
                                    </option>
                                  ))}
                                </>
                              )}
                            </select>
                          </label>

                          <MealAddonPicker
                            value={{
                              fruitId: draft.fruitId,
                              drinkId: draft.drinkId
                            }}
                            onChange={(selection: MealAddonSelection) =>
                              patchDraft(mealKey, selection)
                            }
                            compact
                          />

                          <button
                            type="button"
                            onClick={() => saveMeal(mealKey)}
                            disabled={!draft.dishId || (vendors.length > 0 && !draft.vendorId)}
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                            {existing ? 'Lưu thay đổi' : 'Ghi bữa này'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}

              {dayMode === 'DETAIL' && !selectedDayEditable && (
                <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-xs font-semibold text-slate-500">
                  Lịch sử quá 3 ngày đã được khóa chỉnh sửa. Bạn vẫn có thể xem đầy đủ các bữa đã ghi.
                </div>
              )}

              {dayMode === 'DETAIL' && (selectedDay.logs.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 dark:border-slate-700 px-5 py-8 text-center">
                  <UtensilsCrossed className="mx-auto h-6 w-6 text-slate-300" />
                  <div className="mt-2 text-sm font-black text-slate-700 dark:text-slate-200">
                    Chưa ghi bữa nào trong ngày này
                  </div>
                  {selectedDayEditable && (
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      Chọn món ở phần trên để ghi bù.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDay.logs.map((log, index) => {
                    const dish = findDish(log.dishName);
                    const mainCalories = resolveCalories(log);
                    const addonCalories = sumMealAddonCalories(log);
                    const calories = mainCalories + addonCalories;
                    const mealLabel = log.mealKey
                      ? mealLabels[log.mealKey]
                      : 'Món ' + (index + 1);

                    return (
                      <article
                        key={log.id}
                        className="rounded-[22px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <DishImage
                            src={dish?.imageUrl}
                            alt={log.dishName}
                            className="h-14 w-14 shrink-0 rounded-2xl"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-black uppercase tracking-[0.1em] text-blue-700 dark:text-blue-300">
                              {mealLabel}
                            </div>
                            <h4 className="mt-0.5 truncate text-base font-black text-slate-950 dark:text-white">
                              {log.dishName}
                            </h4>
                            <div className="mt-1 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                              ≈ {calories.toLocaleString('vi-VN')} kcal · {log.price.toLocaleString('vi-VN')}đ
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          Quán: {log.vendorName}
                        </div>

                        {(log.addons?.length ?? 0) > 0 && (
                          <div className="mt-2 space-y-1 rounded-xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 px-3 py-2">
                            {log.addons?.map(addon => (
                              <div
                                key={addon.kind + '-' + addon.id}
                                className="flex items-center justify-between gap-3 text-[10px] font-bold"
                              >
                                <span className="text-emerald-800 dark:text-emerald-200">
                                  {addon.kind === 'fruit' ? 'Trái cây' : 'Nước uống'} · {addon.name}
                                </span>
                                <span className="shrink-0 text-emerald-700 dark:text-emerald-300">
                                  ≈ {addon.calories.toLocaleString('vi-VN')} kcal
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
