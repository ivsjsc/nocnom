export type Gender = 'male' | 'female' | 'other' | '';
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | '';
export type HealthGoal = 'maintain' | 'lose' | 'gain' | '';

export type MacroTargetMode = 'auto' | 'ratio' | 'grams';

export type MacroTargetSettings = {
  mode: MacroTargetMode;
  proteinPct?: number;
  carbsPct?: number;
  fatPct?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

export type BMIReferenceSystem =
  | 'WHO_GLOBAL'
  | 'ASIA_PACIFIC_2000'
  | 'WHO_ASIAN_ACTION_POINTS';

export const DEFAULT_BMI_REFERENCE_SYSTEM: BMIReferenceSystem =
  'ASIA_PACIFIC_2000';

export const HEALTH_LIMITS = {
  weightKg: { min: 25, max: 220 },
  heightCm: { min: 80, max: 240 },
  age: { min: 18, max: 120 }
} as const;

export type BMICategory = {
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  status: 'underweight' | 'normal' | 'overweight' | 'obese';
  referenceSystem: BMIReferenceSystem;
  referenceLabel: string;
  type: 'screening-indicator';
};

export type BMREstimate = {
  value: number;
  equation: 'Mifflin-St Jeor';
  type: 'estimate';
};

export type TDEEEstimate = {
  value: number;
  bmrValue: number;
  multiplier: number;
  method: 'activity_multiplier';
  type: 'estimate';
};

export type CalorieGoalPlan = {
  value: number;
  strategy: 'fixed_300';
  adjustmentKcal: -300 | 0 | 300;
  type: 'estimate';
};

export type MacroTargetPlan = {
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  strategy:
    | 'goal_ratio'
    | 'goal_weight_based'
    | 'custom_ratio'
    | 'custom_grams';
  proteinPerKg?: number;
  fatPerKg?: number;
  goal?: Exclude<HealthGoal, ''>;
  source: 'automatic' | 'user-defined';
  type: 'estimate' | 'user-defined';
  macroEnergyKcal: number;
  calorieDeltaKcal?: number;
  calorieDeltaPct?: number;
  calorieConsistency?: 'aligned' | 'review' | 'inconsistent';
};

export type WaterEstimate = {
  valueMl: number;
  ml: number;
  glasses: number;
  method: '35_ml_per_kg';
  type: 'estimate';
};
