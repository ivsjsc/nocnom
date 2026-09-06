import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  HeartPulse,
  Image as ImageIcon,
  Save,
  Scale,
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
  getBMICategory,
  getIdealWeightRange,
  type ActivityLevel,
  type Gender,
  type HealthGoal
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
  healthGoal: ''
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
          healthGoal: (data.healthGoal as HealthGoal) || ''
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
      (!Number.isFinite(heightValue) || heightValue < 80 || heightValue > 240)
    ) {
      setStatus({
        type: 'error',
        message: 'Chiều cao phải nằm trong khoảng 80–240 cm.'
      });
      return;
    }

    const weightValue = Number(form.weightKg);
    if (
      form.weightKg.trim() &&
      (!Number.isFinite(weightValue) || weightValue < 25 || weightValue > 220)
    ) {
      setStatus({
        type: 'error',
        message: 'Cân nặng phải nằm trong khoảng 25–220 kg.'
      });
      return;
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
        healthGoal: form.healthGoal
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
              <div className="truncate text-xs font-semibold text-slate-500">{user.email}</div>
            </div>
            <ShieldCheck className="w-5 h-5 shrink-0 text-blue-600" aria-hidden="true" />
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
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
                <div className="mt-1.5 text-[10px] font-semibold text-slate-500">
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
                    <div className="text-[10px] font-medium text-slate-500">
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
                      min="80"
                      max="240"
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
                      min="25"
                      max="220"
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
                      <option value="maintain">Duy trì cân nặng lý tưởng</option>
                      <option value="lose">Giảm cân, thon gọn (Thâm hụt nhẹ -300 kcal/ngày)</option>
                      <option value="gain">Tăng cân, tăng cơ (Thặng dư nhẹ +300 kcal/ngày)</option>
                    </select>
                  </label>
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
