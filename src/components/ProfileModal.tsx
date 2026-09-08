import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  HeartPulse,
  Image as ImageIcon,
  Save,
  Scale,
  Target,
  ShieldCheck,
  UserRound,
  X
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { normalizeExternalImageUrl } from '../lib/url';
import {
  loadUserProfile,
  saveUserProfile
} from '../services/userProfile';
import {
  calculateAge,
  calculateBMI,
  calculateDailyCalorieTargetFromProfile,
  calculateMacroTargetPlan,
  getBMICategory,
  getIdealWeightRange,
  HEALTH_LIMITS,
  DEFAULT_BMI_REFERENCE_SYSTEM,
  BMI_REFERENCE_LABELS,
  type ActivityLevel,
  type Gender,
  type HealthGoal,
  type MacroTargetMode
} from '../lib/healthUtils';

type Props = {
  user: User;
  onClose: () => void;
  onProfileSaved?: (photoUrl: string, fullName: string) => void;
};

type ProfileForm = {
  fullName: string;
  dateOfBirth: string;
  school: string;
  faculty: string;
  studentId: string;
  phone: string;
  photoUrl: string;
  gender: Gender;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel;
  healthGoal: HealthGoal;
  dailyCalorieTarget: string;
  macroTargetMode: MacroTargetMode;
  macroProteinPct: string;
  macroCarbsPct: string;
  macroFatPct: string;
  macroProteinG: string;
  macroCarbsG: string;
  macroFatG: string;
};

const emptyProfile: ProfileForm = {
  fullName: '',
  dateOfBirth: '',
  school: '',
  faculty: '',
  studentId: '',
  phone: '',
  photoUrl: '',
  gender: '',
  heightCm: '',
  weightKg: '',
  activityLevel: '',
  healthGoal: '',
  dailyCalorieTarget: '',
  macroTargetMode: 'auto',
  macroProteinPct: '',
  macroCarbsPct: '',
  macroFatPct: '',
  macroProteinG: '',
  macroCarbsG: '',
  macroFatG: ''
};

const toStringValue = (value: unknown) => (typeof value === 'string' ? value : '');

export default function ProfileModal({
  user,
  onClose,
  onProfileSaved
}: Props) {
  const [form, setForm] = useState<ProfileForm>({
    ...emptyProfile,
    fullName: user.displayName || '',
    photoUrl: user.photoURL || ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const normalizedPhotoUrl = useMemo(
    () => normalizeExternalImageUrl(form.photoUrl),
    [form.photoUrl]
  );

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setStatus(null);

      try {
        const data = await loadUserProfile(user.uid);
        if (!active) return;

        setForm({
          fullName: toStringValue(data.fullName) || user.displayName || '',
          dateOfBirth: toStringValue(data.dateOfBirth),
          school: toStringValue(data.school),
          faculty: toStringValue(data.faculty),
          studentId: toStringValue(data.studentId),
          phone: toStringValue(data.phone),
          photoUrl:
            toStringValue(data.photoUrl) ||
            user.photoURL ||
            '',
          gender: (data.gender as Gender) || '',
          heightCm: data.heightCm ? String(data.heightCm) : '',
          weightKg: data.weightKg ? String(data.weightKg) : '',
          activityLevel: (data.activityLevel as ActivityLevel) || '',
          healthGoal: (data.healthGoal as HealthGoal) || '',
          dailyCalorieTarget: data.dailyCalorieTarget
            ? String(data.dailyCalorieTarget)
            : '',
          macroTargetMode: (data.macroTargetMode as MacroTargetMode) || 'auto',
          macroProteinPct:
            data.macroProteinPct !== undefined && data.macroProteinPct !== ''
              ? String(data.macroProteinPct)
              : '',
          macroCarbsPct:
            data.macroCarbsPct !== undefined && data.macroCarbsPct !== ''
              ? String(data.macroCarbsPct)
              : '',
          macroFatPct:
            data.macroFatPct !== undefined && data.macroFatPct !== ''
              ? String(data.macroFatPct)
              : '',
          macroProteinG:
            data.macroProteinG !== undefined && data.macroProteinG !== ''
              ? String(data.macroProteinG)
              : '',
          macroCarbsG:
            data.macroCarbsG !== undefined && data.macroCarbsG !== ''
              ? String(data.macroCarbsG)
              : '',
          macroFatG:
            data.macroFatG !== undefined && data.macroFatG !== ''
              ? String(data.macroFatG)
              : ''
        });
      } catch (error) {
        if (!active) return;
        console.error('Không thể tải hồ sơ nOcnOm', error);
        setStatus({
          type: 'error',
          message: 'Chưa tải được hồ sơ từ cloud. Kiểm tra kết nối rồi thử lại.'
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user.displayName, user.photoURL, user.uid]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const updateField = <K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) => {
    setForm(current => ({ ...current, [field]: value }));
    setStatus(null);
  };

  const currentHeight = parseFloat(form.heightCm);
  const currentWeight = parseFloat(form.weightKg);
  const liveBMI = useMemo(() => {
    if (!isNaN(currentHeight) && !isNaN(currentWeight)) {
      return calculateBMI(currentWeight, currentHeight);
    }
    return null;
  }, [currentHeight, currentWeight]);

  const bmiCategory = useMemo(() => {
    return liveBMI !== null ? getBMICategory(liveBMI) : null;
  }, [liveBMI]);

  const idealWeight = useMemo(() => {
    return !isNaN(currentHeight) ? getIdealWeightRange(currentHeight) : null;
  }, [currentHeight]);

  const automaticCalorieTarget = useMemo(
    () =>
      calculateDailyCalorieTargetFromProfile({
        weightKg: form.weightKg,
        heightCm: form.heightCm,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        activityLevel: form.activityLevel,
        healthGoal: form.healthGoal
      }),
    [
      form.activityLevel,
      form.dateOfBirth,
      form.gender,
      form.healthGoal,
      form.heightCm,
      form.weightKg
    ]
  );

  const effectiveCalorieTarget = useMemo(() => {
    const custom = Number(form.dailyCalorieTarget);
    return form.dailyCalorieTarget.trim() &&
      Number.isFinite(custom) &&
      custom >= 800 &&
      custom <= 6000
      ? custom
      : automaticCalorieTarget;
  }, [automaticCalorieTarget, form.dailyCalorieTarget]);

  const macroTargetPreview = useMemo(
    () =>
      calculateMacroTargetPlan(
        effectiveCalorieTarget,
        form.healthGoal,
        Number.isFinite(currentWeight) ? currentWeight : null,
        form.macroTargetMode === 'ratio'
          ? {
              mode: 'ratio',
              proteinPct: Number(form.macroProteinPct),
              carbsPct: Number(form.macroCarbsPct),
              fatPct: Number(form.macroFatPct)
            }
          : form.macroTargetMode === 'grams'
            ? {
                mode: 'grams',
                proteinG: Number(form.macroProteinG),
                carbsG: Number(form.macroCarbsG),
                fatG: Number(form.macroFatG)
              }
            : { mode: 'auto' }
      ),
    [
      currentWeight,
      effectiveCalorieTarget,
      form.healthGoal,
      form.macroCarbsG,
      form.macroCarbsPct,
      form.macroFatG,
      form.macroFatPct,
      form.macroProteinG,
      form.macroProteinPct,
      form.macroTargetMode
    ]
  );

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      setStatus({ type: 'error', message: 'Vui lòng nhập họ và tên.' });
      return;
    }

    const cleanPhotoUrl = form.photoUrl.trim();
    if (cleanPhotoUrl && !normalizedPhotoUrl) {
      setStatus({
        type: 'error',
        message: 'URL ảnh đại diện không hợp lệ. Hãy dùng URL http/https.'
      });
      return;
    }

    if (form.dateOfBirth.trim() && calculateAge(form.dateOfBirth) === null) {
      setStatus({
        type: 'error',
        message: 'Ngày sinh không hợp lệ hoặc nằm trong tương lai.'
      });
      return;
    }

    const heightValue = Number(form.heightCm);
    if (
      form.heightCm.trim() &&
      (!Number.isFinite(heightValue) || heightValue < HEALTH_LIMITS.heightCm.min ||
        heightValue > HEALTH_LIMITS.heightCm.max)
    ) {
      setStatus({
        type: 'error',
        message: `Chiều cao phải nằm trong khoảng ${HEALTH_LIMITS.heightCm.min}–${HEALTH_LIMITS.heightCm.max} cm.`
      });
      return;
    }

    const weightValue = Number(form.weightKg);
    if (
      form.weightKg.trim() &&
      (!Number.isFinite(weightValue) || weightValue < HEALTH_LIMITS.weightKg.min ||
        weightValue > HEALTH_LIMITS.weightKg.max)
    ) {
      setStatus({
        type: 'error',
        message: `Cân nặng phải nằm trong khoảng ${HEALTH_LIMITS.weightKg.min}–${HEALTH_LIMITS.weightKg.max} kg.`
      });
      return;
    }

    const dailyCalorieTargetValue = Number(form.dailyCalorieTarget);
    if (
      form.dailyCalorieTarget.trim() &&
      (!Number.isFinite(dailyCalorieTargetValue) ||
        dailyCalorieTargetValue < 800 ||
        dailyCalorieTargetValue > 6000)
    ) {
      setStatus({
        type: 'error',
        message: 'Mục tiêu calo tùy chỉnh phải từ 800 đến 6.000 kcal/ngày.'
      });
      return;
    }

    const ratioValues = [
      form.macroProteinPct,
      form.macroCarbsPct,
      form.macroFatPct
    ];
    const ratioNumbers = ratioValues.map(value => Number(value));
    if (form.macroTargetMode === 'ratio') {
      if (
        ratioValues.some(value => !value.trim()) ||
        ratioNumbers.some(
          value => !Number.isFinite(value) || value < 0 || value > 100
        )
      ) {
        setStatus({
          type: 'error',
          message: 'Tỷ lệ Macro cần đủ Protein / Carb / Fat, mỗi giá trị từ 0 đến 100%.'
        });
        return;
      }

      const ratioTotal = ratioNumbers.reduce((sum, value) => sum + value, 0);
      if (Math.abs(ratioTotal - 100) > 0.1) {
        setStatus({
          type: 'error',
          message: `Tổng tỷ lệ Macro phải bằng 100%. Hiện tại là ${ratioTotal.toFixed(1)}%.`
        });
        return;
      }

      if (!effectiveCalorieTarget) {
        setStatus({
          type: 'error',
          message: 'Chế độ tỷ lệ % cần có mục tiêu calo/ngày. Hãy hoàn thiện hồ sơ hoặc nhập mục tiêu calo tùy chỉnh.'
        });
        return;
      }
    }

    const gramValues = [
      form.macroProteinG,
      form.macroCarbsG,
      form.macroFatG
    ];
    const gramNumbers = gramValues.map(value => Number(value));
    if (form.macroTargetMode === 'grams') {
      if (
        gramValues.some(value => !value.trim()) ||
        gramNumbers.some(
          value => !Number.isFinite(value) || value < 0 || value > 500
        ) ||
        gramNumbers.every(value => value === 0)
      ) {
        setStatus({
          type: 'error',
          message: 'Mục tiêu gram cần đủ Protein / Carb / Fat từ 0 đến 500 g/ngày và không thể đồng thời bằng 0.'
        });
        return;
      }
    }

    setSaving(true);
    setStatus(null);

    try {
      const photoUrl = normalizedPhotoUrl || '';
      const fullName = form.fullName.trim();
      const hNum = parseFloat(form.heightCm);
      const wNum = parseFloat(form.weightKg);

      await saveUserProfile(user.uid, {
        fullName,
        dateOfBirth: form.dateOfBirth,
        school: form.school.trim(),
        faculty: form.faculty.trim(),
        studentId: form.studentId.trim(),
        phone: form.phone.trim(),
        photoUrl,
        gender: form.gender,
        heightCm: !isNaN(hNum) && hNum > 0 ? hNum : '',
        weightKg: !isNaN(wNum) && wNum > 0 ? wNum : '',
        activityLevel: form.activityLevel,
        healthGoal: form.healthGoal,
        dailyCalorieTarget:
          form.dailyCalorieTarget.trim()
            ? Math.round(dailyCalorieTargetValue)
            : '',
        macroTargetMode: form.macroTargetMode,
        macroProteinPct:
          form.macroTargetMode === 'ratio' ? ratioNumbers[0] : '',
        macroCarbsPct:
          form.macroTargetMode === 'ratio' ? ratioNumbers[1] : '',
        macroFatPct:
          form.macroTargetMode === 'ratio' ? ratioNumbers[2] : '',
        macroProteinG:
          form.macroTargetMode === 'grams' ? gramNumbers[0] : '',
        macroCarbsG:
          form.macroTargetMode === 'grams' ? gramNumbers[1] : '',
        macroFatG:
          form.macroTargetMode === 'grams' ? gramNumbers[2] : ''
      });

      onProfileSaved?.(photoUrl, fullName);
      setForm(current => ({ ...current, photoUrl }));
      setStatus({ type: 'success', message: 'Đã lưu hồ sơ sức khỏe & thông tin nOcnOm.' });
    } catch (error) {
      console.error('Không thể lưu hồ sơ nOcnOm', error);
      setStatus({
        type: 'error',
        message: 'Không thể lưu hồ sơ. Vui lòng thử lại.'
      });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Quản lý tài khoản nOcnOm"
      onMouseDown={event => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex w-full max-w-lg max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="shrink-0 flex items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">
              Tài khoản nOcnOm
            </div>
            <h2 className="truncate text-xl font-black text-slate-950">Hồ sơ cá nhân</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 shrink-0 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center"
            aria-label="Đóng hồ sơ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="h-12 w-12 overflow-hidden rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
              {normalizedPhotoUrl || user.photoURL ? (
                <img
                  src={normalizedPhotoUrl || user.photoURL || ''}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  onError={event => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <UserRound className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-950">{form.fullName || user.displayName || 'Người dùng nOcnOm'}</div>
              <div className="truncate text-xs font-bold text-slate-700">{user.email}</div>
            </div>
            <ShieldCheck className="w-5 h-5 shrink-0 text-blue-600" aria-hidden="true" />
          </div>

          <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-700">
            Tài khoản có thể đăng nhập bằng Email/Password hoặc Google. Thông tin bên dưới là hồ sơ riêng của nOcnOm.
          </p>

          {loading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-500">
              Đang tải hồ sơ...
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Ảnh đại diện URL
                </span>
                <input
                  value={form.photoUrl}
                  onChange={event => updateField('photoUrl', event.target.value)}
                  placeholder="https://..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                  inputMode="url"
                />
                <div className="mt-1.5 text-[10px] font-bold text-slate-700">
                  Dán URL ảnh trực tiếp. Ảnh này là hồ sơ riêng của nOcnOm và sẽ được dùng ở avatar trên header.
                </div>
                {form.photoUrl.trim() && !normalizedPhotoUrl ? (
                  <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
                    URL ảnh không hợp lệ.
                  </div>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Họ và tên</span>
                <input
                  value={form.fullName}
                  onChange={event => updateField('fullName', event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950"
                  autoComplete="name"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Ngày sinh (DD/MM/YYYY)</span>
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={(() => {
                      if (!form.dateOfBirth) return '';
                      if (form.dateOfBirth.includes('-')) {
                        const [yyyy, mm, dd] = form.dateOfBirth.split('-');
                        if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`;
                      }
                      return form.dateOfBirth;
                    })()}
                    onChange={event => {
                      const val = event.target.value;
                      if (val.includes('/')) {
                        const parts = val.split('/');
                        if (parts.length === 3 && parts[2].length === 4) {
                          const [dd, mm, yyyy] = parts;
                          updateField('dateOfBirth', `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
                          return;
                        }
                      }
                      updateField('dateOfBirth', val);
                    }}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Số điện thoại</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={event => updateField('phone', event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </label>
              </div>

              {/* Phần Sức khỏe & Thể trạng */}
              <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">
                      Chỉ số Thể trạng & Sức khỏe
                    </div>
                    <div className="text-[10px] font-semibold text-slate-700">
                      Ước tính BMI, BMR/TDEE và nhu cầu nước dựa trên dữ liệu bạn cung cấp
                    </div>
                  </div>
                </div>

                {/* Giới tính */}
                <div className="mt-3.5">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                    Giới tính
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'male', label: 'Nam' },
                      { id: 'female', label: 'Nữ' },
                      { id: 'other', label: 'Khác' }
                    ].map(item => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => updateField('gender', item.id as Gender)}
                        className={
                          'h-11 rounded-2xl border text-xs font-black transition-all ' +
                          (form.gender === item.id
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300')
                        }
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.gender === 'other' ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-amber-800">
                    Công thức BMR Mifflin–St Jeor dùng hai nhóm Nam/Nữ. nOcnOm sẽ không tự gán giới tính khi bạn chọn “Khác”, nên mục tiêu BMR/TDEE sẽ để trống.
                  </div>
                ) : null}

                {/* Chiều cao & Cân nặng */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                      Chiều cao (cm)
                    </span>
                    <input
                      type="number"
                      min={HEALTH_LIMITS.heightCm.min}
                      max={HEALTH_LIMITS.heightCm.max}
                      step="0.5"
                      placeholder="VD: 168"
                      value={form.heightCm}
                      onChange={event => updateField('heightCm', event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-black text-slate-950 shadow-inner focus:border-blue-500 focus:outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                      Cân nặng (kg)
                    </span>
                    <input
                      type="number"
                      min={HEALTH_LIMITS.weightKg.min}
                      max={HEALTH_LIMITS.weightKg.max}
                      step="0.1"
                      placeholder="VD: 58"
                      value={form.weightKg}
                      onChange={event => updateField('weightKg', event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-black text-slate-950 shadow-inner focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                </div>

                {/* Preview BMI trực quan */}
                {liveBMI !== null && bmiCategory ? (
                  <div className="mt-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-black text-slate-900">
                          Chỉ số BMI: <span className="text-blue-600 font-extrabold">{liveBMI}</span>
                        </span>
                      </div>
                      <span className={'rounded-full px-2.5 py-0.5 text-[10px] font-black ' + bmiCategory.badgeBg + ' ' + bmiCategory.badgeText}>
                        {bmiCategory.label}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] font-medium text-slate-600">
                      {bmiCategory.description}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold text-slate-500">
                      Hệ quy chiếu: {BMI_REFERENCE_LABELS[DEFAULT_BMI_REFERENCE_SYSTEM]}
                    </div>

                    {idealWeight && (
                      <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] font-semibold text-slate-500">
                        <span>Khoảng cân nặng tham khảo:</span>
                        <span className="font-bold text-slate-800">
                          {idealWeight.min} - {idealWeight.max} kg
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Mức độ vận động */}
                <div className="mt-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                      Mức độ vận động
                    </span>
                    <select
                      value={form.activityLevel}
                      onChange={event => updateField('activityLevel', event.target.value as ActivityLevel)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Chọn mức độ vận động</option>
                      <option value="sedentary">Ít vận động (Học bài, ngồi nhiều, ít tập luyện)</option>
                      <option value="light">Vận động nhẹ (Đi bộ trong KTX, ĐHQG 1-3 ngày/tuần)</option>
                      <option value="moderate">Vừa phải (Chạy bộ, thể thao 3-5 ngày/tuần)</option>
                      <option value="active">Năng động (Tập gym, thể thao nặng 6-7 ngày/tuần)</option>
                    </select>
                  </label>
                </div>

                {/* Mục tiêu sức khỏe */}
                <div className="mt-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-600">
                      Mục tiêu dinh dưỡng
                    </span>
                    <select
                      value={form.healthGoal}
                      onChange={event => updateField('healthGoal', event.target.value as HealthGoal)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Chọn mục tiêu dinh dưỡng</option>
                      <option value="maintain">Duy trì theo TDEE ước tính</option>
                      <option value="lose">Giảm cân, thon gọn (Thâm hụt nhẹ -300 kcal/ngày)</option>
                      <option value="gain">Tăng cân, tăng cơ (Thặng dư nhẹ +300 kcal/ngày)</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3 rounded-2xl border border-blue-200 bg-white p-3.5">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-600">
                      <Target className="h-3.5 w-3.5 text-blue-600" />
                      Mục tiêu calo/ngày tùy chỉnh
                    </span>
                    <input
                      type="number"
                      min="800"
                      max="6000"
                      step="10"
                      inputMode="numeric"
                      value={form.dailyCalorieTarget}
                      onChange={event =>
                        updateField('dailyCalorieTarget', event.target.value)
                      }
                      placeholder="Để trống = tự tính theo hồ sơ"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-black text-slate-950 focus:border-blue-500 focus:outline-none"
                    />
                    <div className="mt-1.5 text-[10px] font-semibold leading-relaxed text-slate-600">
                      Nếu nhập giá trị này, nOcnOm sẽ ưu tiên mục tiêu bạn đặt. Để trống để dùng mục tiêu tự động từ BMR/TDEE và mục tiêu dinh dưỡng.
                    </div>
                  </label>
                </div>

                <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wide text-slate-700">
                        Mục tiêu Macro
                      </div>
                      <div className="mt-1 text-[10px] font-semibold leading-relaxed text-slate-600">
                        Chọn cách đặt Protein / Carb / Fat. Đây là mục tiêu lập kế hoạch; không phải số liệu món ăn và không được dùng để suy ngược macro còn thiếu.
                      </div>
                    </div>
                    <Target className="h-4 w-4 shrink-0 text-emerald-600" />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Cách đặt mục tiêu Macro">
                    {([
                      { id: 'auto', label: 'Tự động', hint: 'Theo hồ sơ' },
                      { id: 'ratio', label: 'Tỷ lệ %', hint: 'Tự chia kcal' },
                      { id: 'grams', label: 'Gram/ngày', hint: 'Tự đặt P/C/F' }
                    ] as Array<{ id: MacroTargetMode; label: string; hint: string }>).map(item => {
                      const active = form.macroTargetMode === item.id;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          role="radio"
                          aria-checked={active}
                          onClick={() => updateField('macroTargetMode', item.id)}
                          className={
                            'min-h-[62px] rounded-2xl border px-2 py-2 text-left transition-all ' +
                            (active
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-100'
                              : 'border-slate-200 bg-slate-50 text-slate-700')
                          }
                        >
                          <div className="text-[10px] font-black">{item.label}</div>
                          <div className="mt-0.5 text-[9px] font-semibold text-slate-500">{item.hint}</div>
                        </button>
                      );
                    })}
                  </div>

                  {form.macroTargetMode === 'auto' && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-slate-700">
                      nOcnOm dùng cân nặng + mục tiêu dinh dưỡng khi đủ dữ liệu. Nếu chưa đủ cân nặng hợp lệ, engine dùng preset tỷ lệ theo mục tiêu. Mọi kết quả đều được gắn trạng thái <strong>ước tính</strong>.
                    </div>
                  )}

                  {form.macroTargetMode === 'ratio' && (
                    <div className="mt-3">
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          ['macroProteinPct', 'Protein %'],
                          ['macroCarbsPct', 'Carb %'],
                          ['macroFatPct', 'Fat %']
                        ] as const).map(([field, label]) => (
                          <label key={field} className="block">
                            <span className="text-[9px] font-black text-slate-600">{label}</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              inputMode="decimal"
                              value={form[field]}
                              onChange={event => updateField(field, event.target.value)}
                              placeholder="0"
                              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm font-black text-slate-950 focus:border-emerald-500 focus:outline-none"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] font-bold text-slate-600">
                        Tổng hiện tại:{' '}
                        <span className={
                          Math.abs(
                            Number(form.macroProteinPct || 0) +
                            Number(form.macroCarbsPct || 0) +
                            Number(form.macroFatPct || 0) -
                            100
                          ) <= 0.1
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }>
                          {(
                            Number(form.macroProteinPct || 0) +
                            Number(form.macroCarbsPct || 0) +
                            Number(form.macroFatPct || 0)
                          ).toFixed(1)}%
                        </span>
                        {' '}· phải bằng 100%.
                      </div>
                      {!effectiveCalorieTarget && (
                        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold leading-relaxed text-amber-800">
                          Cần có mục tiêu calo/ngày để đổi tỷ lệ % thành số gram.
                        </div>
                      )}
                    </div>
                  )}

                  {form.macroTargetMode === 'grams' && (
                    <div className="mt-3">
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          ['macroProteinG', 'Protein (g)'],
                          ['macroCarbsG', 'Carb (g)'],
                          ['macroFatG', 'Fat (g)']
                        ] as const).map(([field, label]) => (
                          <label key={field} className="block">
                            <span className="text-[9px] font-black text-slate-600">{label}</span>
                            <input
                              type="number"
                              min="0"
                              max="500"
                              step="0.1"
                              inputMode="decimal"
                              value={form[field]}
                              onChange={event => updateField(field, event.target.value)}
                              placeholder="0"
                              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm font-black text-slate-950 focus:border-emerald-500 focus:outline-none"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] font-semibold leading-relaxed text-slate-600">
                        nOcnOm chỉ quy đổi năng lượng theo 4 kcal/g Protein, 4 kcal/g Carb và 9 kcal/g Fat để kiểm tra tính nhất quán; không tự sửa giá trị bạn nhập.
                      </div>
                    </div>
                  )}

                  {macroTargetPreview ? (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[10px] font-black uppercase tracking-wide text-emerald-800">
                          Xem trước mục tiêu/ngày
                        </div>
                        <div className="text-[9px] font-black text-emerald-700">
                          {macroTargetPreview.source === 'user-defined' ? 'Do bạn đặt' : 'Ước tính tự động'}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white p-2">
                          <div className="text-sm font-black text-slate-950">{macroTargetPreview.proteinG} g</div>
                          <div className="text-[9px] font-bold text-slate-500">Protein · {macroTargetPreview.proteinPct}%</div>
                        </div>
                        <div className="rounded-xl bg-white p-2">
                          <div className="text-sm font-black text-slate-950">{macroTargetPreview.carbsG} g</div>
                          <div className="text-[9px] font-bold text-slate-500">Carb · {macroTargetPreview.carbsPct}%</div>
                        </div>
                        <div className="rounded-xl bg-white p-2">
                          <div className="text-sm font-black text-slate-950">{macroTargetPreview.fatG} g</div>
                          <div className="text-[9px] font-bold text-slate-500">Fat · {macroTargetPreview.fatPct}%</div>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] font-semibold text-slate-700">
                        Năng lượng từ macro ≈ <strong>{macroTargetPreview.macroEnergyKcal.toLocaleString('vi-VN')} kcal</strong>
                        {effectiveCalorieTarget
                          ? <> · mục tiêu calo {Math.round(effectiveCalorieTarget).toLocaleString('vi-VN')} kcal</>
                          : null}
                      </div>
                      {macroTargetPreview.calorieConsistency &&
                        macroTargetPreview.calorieConsistency !== 'aligned' && (
                          <div className={
                            'mt-2 rounded-xl border px-3 py-2 text-[10px] font-bold leading-relaxed ' +
                            (macroTargetPreview.calorieConsistency === 'review'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-rose-200 bg-rose-50 text-rose-800')
                          }>
                            Macro quy đổi lệch {macroTargetPreview.calorieDeltaPct}% so với mục tiêu calo hiện tại.
                            nOcnOm giữ nguyên cả hai mục tiêu để bạn quyết định, không tự điều chỉnh số liệu.
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-slate-600">
                      Chưa đủ dữ liệu hợp lệ để tạo mục tiêu Macro. nOcnOm sẽ không tự điền giá trị còn thiếu.
                    </div>
                  )}
                </div>
              </div>


              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Trường học</span>
                <input
                  value={form.school}
                  onChange={event => updateField('school', event.target.value)}
                  placeholder="Ví dụ: Đại học ..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Khoa / ngành</span>
                  <input
                    value={form.faculty}
                    onChange={event => updateField('faculty', event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Mã sinh viên</span>
                  <input
                    value={form.studentId}
                    onChange={event => updateField('studentId', event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Email đăng nhập</span>
                <input
                  value={user.email || ''}
                  readOnly
                  className="h-12 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500"
                />
              </label>

              {status && (
                <div
                  className={
                    'rounded-2xl px-4 py-3 text-xs font-bold ' +
                    (status.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700')
                  }
                  role="status"
                >
                  {status.message}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="min-h-12 w-full rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu hồ sơ nOcnOm'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    ),
    document.body
  );
}
