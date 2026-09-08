import {
  getVietnamDateTimeParts
} from '../../lib/dateTime';
import {
  DEFAULT_BMI_REFERENCE_SYSTEM,
  HEALTH_LIMITS,
  type ActivityLevel,
  type BMICategory,
  type BMIReferenceSystem,
  type BMREstimate,
  type CalorieGoalPlan,
  type Gender,
  type HealthGoal,
  type MacroTargetPlan,
  type TDEEEstimate,
  type WaterEstimate
} from './healthTypes';

export { HEALTH_LIMITS, DEFAULT_BMI_REFERENCE_SYSTEM };

export const BMI_REFERENCE_LABELS: Record<BMIReferenceSystem, string> = {
  WHO_GLOBAL: 'WHO global reference',
  ASIA_PACIFIC_2000: 'Asia-Pacific reference',
  WHO_ASIAN_ACTION_POINTS: 'WHO Asian action points'
};

export function calculateAge(
  dobString: string,
  now = new Date()
): number | null {
  if (!dobString || !dobString.trim()) return null;
  const clean = dobString.trim();

  let year: number;
  let month: number;
  let day: number;

  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length !== 3) return null;
    day = Number(parts[0]);
    month = Number(parts[1]);
    year = Number(parts[2]);
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length !== 3) return null;
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else {
    return null;
  }

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  const current = getVietnamDateTimeParts(now.getTime());
  if (
    year > current.year ||
    (year === current.year && month > current.month) ||
    (year === current.year &&
      month === current.month &&
      day > current.day)
  ) {
    return null;
  }

  let age = current.year - year;
  if (
    current.month < month ||
    (current.month === month && current.day < day)
  ) {
    age--;
  }

  return age >= 0 && age <= HEALTH_LIMITS.age.max ? age : null;
}

export function calculateBMI(
  weightKg: number,
  heightCm: number
): number | null {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    weightKg < HEALTH_LIMITS.weightKg.min ||
    weightKg > HEALTH_LIMITS.weightKg.max ||
    heightCm < HEALTH_LIMITS.heightCm.min ||
    heightCm > HEALTH_LIMITS.heightCm.max
  ) {
    return null;
  }

  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

const bmiThresholds = (system: BMIReferenceSystem) => {
  if (system === 'WHO_GLOBAL') {
    return { normalMax: 24.9, overweightMax: 29.9 };
  }
  if (system === 'WHO_ASIAN_ACTION_POINTS') {
    return { normalMax: 22.9, overweightMax: 27.4 };
  }
  return { normalMax: 22.9, overweightMax: 24.9 };
};

export function getBMICategory(
  bmi: number,
  referenceSystem: BMIReferenceSystem =
    DEFAULT_BMI_REFERENCE_SYSTEM
): BMICategory {
  const thresholds = bmiThresholds(referenceSystem);
  const base = {
    referenceSystem,
    referenceLabel: BMI_REFERENCE_LABELS[referenceSystem],
    type: 'screening-indicator' as const
  };

  if (bmi < 18.5) {
    return {
      ...base,
      label: 'Dưới khoảng tham khảo',
      color: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
      badgeText: 'text-amber-800 dark:text-amber-300',
      description:
        'BMI hiện thấp hơn khoảng tham khảo. BMI chỉ là chỉ số sàng lọc và không phản ánh đầy đủ thành phần cơ thể.',
      status: 'underweight'
    };
  }

  if (bmi <= thresholds.normalMax) {
    return {
      ...base,
      label: 'Trong khoảng tham khảo',
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
      badgeText: 'text-emerald-800 dark:text-emerald-300',
      description:
        'BMI hiện nằm trong khoảng tham khảo. BMI chỉ là chỉ số sàng lọc và không phản ánh đầy đủ thành phần cơ thể.',
      status: 'normal'
    };
  }

  if (bmi <= thresholds.overweightMax) {
    return {
      ...base,
      label: 'Trên khoảng tham khảo',
      color: 'text-orange-600 dark:text-orange-400',
      badgeBg: 'bg-orange-100 dark:bg-orange-950/60',
      badgeText: 'text-orange-800 dark:text-orange-300',
      description:
        'BMI hiện cao hơn khoảng tham khảo của hệ quy chiếu đang chọn. Đây không phải chẩn đoán y khoa.',
      status: 'overweight'
    };
  }

  return {
    ...base,
    label: 'Cao hơn ngưỡng tham khảo',
    color: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-800 dark:text-rose-300',
    description:
      'BMI hiện cao hơn ngưỡng tham khảo của hệ quy chiếu đang chọn. BMI là chỉ số sàng lọc, không phải chẩn đoán.',
    status: 'obese'
  };
}

export function getIdealWeightRange(
  heightCm: number,
  referenceSystem: BMIReferenceSystem =
    DEFAULT_BMI_REFERENCE_SYSTEM
): { min: number; max: number; referenceSystem: BMIReferenceSystem } | null {
  if (
    !Number.isFinite(heightCm) ||
    heightCm < HEALTH_LIMITS.heightCm.min ||
    heightCm > HEALTH_LIMITS.heightCm.max
  ) {
    return null;
  }

  const heightM = heightCm / 100;
  const thresholds = bmiThresholds(referenceSystem);
  return {
    min: Math.round(18.5 * heightM * heightM),
    max: Math.round(thresholds.normalMax * heightM * heightM),
    referenceSystem
  };
}

export function calculateBMREstimate(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): BMREstimate | null {
  if (
    (gender !== 'male' && gender !== 'female') ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(age) ||
    weightKg < HEALTH_LIMITS.weightKg.min ||
    weightKg > HEALTH_LIMITS.weightKg.max ||
    heightCm < HEALTH_LIMITS.heightCm.min ||
    heightCm > HEALTH_LIMITS.heightCm.max ||
    age < HEALTH_LIMITS.age.min ||
    age > HEALTH_LIMITS.age.max
  ) {
    return null;
  }

  let value = 10 * weightKg + 6.25 * heightCm - 5 * age;
  value += gender === 'female' ? -161 : 5;

  return {
    value: Math.round(value),
    equation: 'Mifflin-St Jeor',
    type: 'estimate'
  };
}

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number | null {
  return calculateBMREstimate(
    weightKg,
    heightCm,
    age,
    gender
  )?.value ?? null;
}

export function calculateTDEEEstimate(
  bmr: number | null,
  activityLevel: ActivityLevel
): TDEEEstimate | null {
  if (
    bmr === null ||
    !Number.isFinite(bmr) ||
    bmr <= 0 ||
    !activityLevel
  ) {
    return null;
  }

  const multipliers: Record<Exclude<ActivityLevel, ''>, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  };

  const multiplier = multipliers[activityLevel];
  return {
    value: Math.round(bmr * multiplier),
    bmrValue: bmr,
    multiplier,
    method: 'activity_multiplier',
    type: 'estimate'
  };
}

export function calculateTDEE(
  bmr: number | null,
  activityLevel: ActivityLevel
): number | null {
  return calculateTDEEEstimate(bmr, activityLevel)?.value ?? null;
}

export function calculateCalorieGoalPlan(
  tdee: number | null,
  goal: HealthGoal
): CalorieGoalPlan | null {
  if (
    tdee === null ||
    !Number.isFinite(tdee) ||
    tdee <= 0 ||
    !goal
  ) {
    return null;
  }

  const adjustmentKcal: -300 | 0 | 300 =
    goal === 'lose' ? -300 : goal === 'gain' ? 300 : 0;

  return {
    value: Math.round(tdee + adjustmentKcal),
    strategy: 'fixed_300',
    adjustmentKcal,
    type: 'estimate'
  };
}

export function calculateCalorieGoal(
  tdee: number | null,
  goal: HealthGoal
): number | null {
  return calculateCalorieGoalPlan(tdee, goal)?.value ?? null;
}

export function calculateMacroTargetPlan(
  calorieTarget: number | null,
  goal: HealthGoal
): MacroTargetPlan | null {
  if (
    calorieTarget === null ||
    !Number.isFinite(calorieTarget) ||
    calorieTarget <= 0 ||
    !goal
  ) {
    return null;
  }

  // Internal balanced presets used as an app planning aid, not a clinical
  // prescription. The weight-loss preset prioritizes protein while the gain
  // preset keeps carbohydrate availability higher.
  const ratios: Record<
    Exclude<HealthGoal, ''>,
    { protein: number; carbs: number; fat: number }
  > = {
    maintain: { protein: 0.2, carbs: 0.5, fat: 0.3 },
    lose: { protein: 0.3, carbs: 0.45, fat: 0.25 },
    gain: { protein: 0.25, carbs: 0.5, fat: 0.25 }
  };

  const ratio = ratios[goal];
  const round1 = (value: number) => Math.round(value * 10) / 10;

  return {
    calorieTarget: Math.round(calorieTarget),
    proteinG: round1((calorieTarget * ratio.protein) / 4),
    carbsG: round1((calorieTarget * ratio.carbs) / 4),
    fatG: round1((calorieTarget * ratio.fat) / 9),
    proteinPct: Math.round(ratio.protein * 100),
    carbsPct: Math.round(ratio.carbs * 100),
    fatPct: Math.round(ratio.fat * 100),
    strategy: 'goal_ratio',
    goal,
    type: 'estimate'
  };
}

export function calculateDailyCalorieTargetFromProfile({
  weightKg,
  heightCm,
  dateOfBirth,
  gender = '',
  activityLevel = '',
  healthGoal = '',
  now = new Date()
}: {
  weightKg?: number | string;
  heightCm?: number | string;
  dateOfBirth?: string;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  healthGoal?: HealthGoal;
  now?: Date;
}): number | null {
  const weight = Number(weightKg);
  const height = Number(heightCm);
  const age = calculateAge(dateOfBirth || '', now);

  if (
    !Number.isFinite(weight) ||
    !Number.isFinite(height) ||
    age === null ||
    age < HEALTH_LIMITS.age.min
  ) {
    return null;
  }

  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  return calculateCalorieGoal(tdee, healthGoal);
}

export function calculateWaterRequirement(
  weightKg: number
): WaterEstimate | null {
  if (
    !Number.isFinite(weightKg) ||
    weightKg < HEALTH_LIMITS.weightKg.min ||
    weightKg > HEALTH_LIMITS.weightKg.max
  ) {
    return null;
  }

  const valueMl = Math.round(weightKg * 35);
  return {
    valueMl,
    ml: valueMl,
    glasses: Math.round(valueMl / 250),
    method: '35_ml_per_kg',
    type: 'estimate'
  };
}

export const roundEnergyEstimateForDisplay = (
  value: number,
  step = 50
): number =>
  Number.isFinite(value) && step > 0
    ? Math.round(value / step) * step
    : 0;

export const ACTIVITY_LABELS: Record<
  ActivityLevel,
  { label: string; desc: string }
> = {
  sedentary: {
    label: 'Ít vận động',
    desc: 'Ngồi học nhiều, ít tập luyện'
  },
  light: {
    label: 'Vận động nhẹ',
    desc: 'Đi bộ trong KTX, ĐHQG 1-3 ngày/tuần'
  },
  moderate: {
    label: 'Vừa phải',
    desc: 'Thể thao, chạy bộ 3-5 ngày/tuần'
  },
  active: {
    label: 'Năng động',
    desc: 'Gym, tập nặng 6-7 ngày/tuần'
  },
  '': {
    label: 'Chưa chọn',
    desc: 'Cần chọn để ước tính TDEE'
  }
};

export const GOAL_LABELS: Record<
  HealthGoal,
  { label: string; desc: string }
> = {
  maintain: {
    label: 'Duy trì',
    desc: 'Mục tiêu bằng TDEE ước tính'
  },
  lose: {
    label: 'Giảm cân',
    desc: 'Mặc định fixed_300: -300 kcal/ngày'
  },
  gain: {
    label: 'Tăng cân',
    desc: 'Mặc định fixed_300: +300 kcal/ngày'
  },
  '': {
    label: 'Chưa chọn',
    desc: 'Cần chọn để tính mục tiêu calo'
  }
};
