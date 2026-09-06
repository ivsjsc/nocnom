export type Gender = 'male' | 'female' | 'other' | '';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | '';
export type HealthGoal = 'maintain' | 'lose' | 'gain' | '';

export type BMICategory = {
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  status: 'underweight' | 'normal' | 'overweight' | 'obese';
};

/**
 * Tính tuổi từ ngày sinh (định dạng DD/MM/YYYY hoặc YYYY-MM-DD)
 */
export function calculateAge(dobString: string, now = new Date()): number | null {
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

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  if (
    year > currentYear ||
    (year === currentYear && month > currentMonth) ||
    (year === currentYear && month === currentMonth && day > currentDay)
  ) {
    return null;
  }

  let age = currentYear - year;
  if (
    currentMonth < month ||
    (currentMonth === month && currentDay < day)
  ) {
    age--;
  }

  return age >= 0 && age <= 120 ? age : null;
}

/**
 * Tính chỉ số BMI: cân nặng (kg) / [chiều cao (m)]^2
 */
export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    weightKg < 25 ||
    weightKg > 220 ||
    heightCm < 80 ||
    heightCm > 240
  ) {
    return null;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

/**
 * Phân loại BMI theo tiêu chuẩn WHO cho người Châu Á (Asian Pacific)
 * - Gầy: < 18.5
 * - Bình thường: 18.5 - 22.9
 * - Thừa cân / Tiền béo phì: 23.0 - 24.9
 * - Béo phì: >= 25.0
 */
export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) {
    return {
      label: 'Thiếu cân (Gầy)',
      color: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
      badgeText: 'text-amber-800 dark:text-amber-300',
      description: 'Nên bổ sung thêm dinh dưỡng, protein và calo từ các món ăn.',
      status: 'underweight'
    };
  }
  if (bmi <= 22.9) {
    return {
      label: 'Thể trạng lý tưởng',
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
      badgeText: 'text-emerald-800 dark:text-emerald-300',
      description: 'Cơ thể cân đối, hãy duy trì chế độ dinh dưỡng và sinh hoạt này!',
      status: 'normal'
    };
  }
  if (bmi <= 24.9) {
    return {
      label: 'Thừa cân (Tiền béo phì)',
      color: 'text-orange-600 dark:text-orange-400',
      badgeBg: 'bg-orange-100 dark:bg-orange-950/60',
      badgeText: 'text-orange-800 dark:text-orange-300',
      description: 'Nên chú ý khẩu phần ăn, ưu tiên món nhiều rau củ và vận động.',
      status: 'overweight'
    };
  }
  return {
    label: 'Béo phì',
    color: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-800 dark:text-rose-300',
    description: 'Cần kiểm soát lượng calo nạp vào và tăng cường rèn luyện thể chất.',
    status: 'obese'
  };
}

/**
 * Khoảng cân nặng chuẩn theo chiều cao (BMI 18.5 - 22.9)
 */
export function getIdealWeightRange(heightCm: number): { min: number; max: number } | null {
  if (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 240) return null;
  const heightM = heightCm / 100;
  const min = Math.round(18.5 * heightM * heightM);
  const max = Math.round(22.9 * heightM * heightM);
  return { min, max };
}

/**
 * BMR - Basal Metabolic Rate (công thức Mifflin-St Jeor)
 * Nam: 10 * W + 6.25 * H - 5 * Age + 5
 * Nữ: 10 * W + 6.25 * H - 5 * Age - 161
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number | null {
  if (
    (gender !== 'male' && gender !== 'female') ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(age) ||
    weightKg < 25 ||
    weightKg > 220 ||
    heightCm < 80 ||
    heightCm > 240 ||
    age < 18 ||
    age > 120
  ) {
    return null;
  }

  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  bmr += gender === 'female' ? -161 : 5;
  return Math.round(bmr);
}

/**
 * TDEE - Tổng năng lượng tiêu hao hằng ngày
 */
export function calculateTDEE(
  bmr: number | null,
  activityLevel: ActivityLevel
): number | null {
  if (bmr === null || !Number.isFinite(bmr) || bmr <= 0 || !activityLevel) {
    return null;
  }

  const multipliers: Record<Exclude<ActivityLevel, ''>, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  };

  return Math.round(bmr * multipliers[activityLevel]);
}

/**
 * Mục tiêu Calo khuyến nghị theo mục tiêu cá nhân
 */
export function calculateCalorieGoal(
  tdee: number | null,
  goal: HealthGoal
): number | null {
  if (tdee === null || !Number.isFinite(tdee) || tdee <= 0 || !goal) {
    return null;
  }

  if (goal === 'lose') return Math.round(tdee - 300);
  if (goal === 'gain') return Math.round(tdee + 300);
  return Math.round(tdee);
}

/**
 * Ước tính nước cơ bản theo cân nặng: 35 ml/kg/ngày.
 * Đây là heuristic tham khảo; nhu cầu thực tế còn phụ thuộc vận động,
 * thời tiết và tình trạng sức khỏe.
 */
export function calculateWaterRequirement(
  weightKg: number
): { ml: number; glasses: number } | null {
  if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 220) {
    return null;
  }

  const ml = Math.round(weightKg * 35);
  const glasses = Math.round(ml / 250);
  return { ml, glasses };
}

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; desc: string }> = {
  sedentary: { label: 'Ít vận động', desc: 'Ngồi học nhiều, ít tập luyện' },
  light: { label: 'Vận động nhẹ', desc: 'Đi bộ trong KTX, ĐHQG 1-3 ngày/tuần' },
  moderate: { label: 'Vừa phải', desc: 'Thể thao, chạy bộ 3-5 ngày/tuần' },
  active: { label: 'Năng động', desc: 'Gym, tập nặng 6-7 ngày/tuần' },
  '': { label: 'Chưa chọn', desc: 'Cần chọn để ước tính TDEE' }
};

export const GOAL_LABELS: Record<HealthGoal, { label: string; desc: string }> = {
  maintain: { label: 'Duy trì vóc dáng', desc: 'Cân bằng calo nạp và tiêu thụ' },
  lose: { label: 'Giảm cân / Thon gọn', desc: 'Thâm hụt nhẹ ~300 kcal/ngày' },
  gain: { label: 'Tăng cân / Tăng cơ', desc: 'Thặng dư nhẹ ~300 kcal/ngày' },
  '': { label: 'Chưa chọn', desc: 'Cần chọn để tính mục tiêu calo' }
};
