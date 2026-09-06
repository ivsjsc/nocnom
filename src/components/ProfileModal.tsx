import { useEffect, useMemo, useState } from 'react';
import { Save, ShieldCheck, UserRound, X } from 'lucide-react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';

type Props = {
  user: User;
  onClose: () => void;
};

type ProfileForm = {
  fullName: string;
  dateOfBirth: string;
  school: string;
  faculty: string;
  studentId: string;
  phone: string;
};

const emptyProfile: ProfileForm = {
  fullName: '',
  dateOfBirth: '',
  school: '',
  faculty: '',
  studentId: '',
  phone: ''
};

const toStringValue = (value: unknown) => (typeof value === 'string' ? value : '');

export default function ProfileModal({ user, onClose }: Props) {
  const [form, setForm] = useState<ProfileForm>({
    ...emptyProfile,
    fullName: user.displayName || ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const profileRef = useMemo(
    () => doc(db, 'users', user.uid, 'profile', 'main'),
    [user.uid]
  );

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setStatus(null);

      try {
        const snapshot = await getDoc(profileRef);
        if (!active) return;

        if (snapshot.exists()) {
          const data = snapshot.data();
          setForm({
            fullName: toStringValue(data.fullName) || user.displayName || '',
            dateOfBirth: toStringValue(data.dateOfBirth),
            school: toStringValue(data.school),
            faculty: toStringValue(data.faculty),
            studentId: toStringValue(data.studentId),
            phone: toStringValue(data.phone)
          });
        }
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
  }, [profileRef, user.displayName]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setStatus(null);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      setStatus({ type: 'error', message: 'Vui lòng nhập họ và tên.' });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      await setDoc(
        profileRef,
        {
          fullName: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth,
          school: form.school.trim(),
          faculty: form.faculty.trim(),
          studentId: form.studentId.trim(),
          phone: form.phone.trim(),
          email: user.email || '',
          authProvider: 'google',
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setStatus({ type: 'success', message: 'Đã lưu hồ sơ nOcnOm.' });
    } catch (error) {
      console.error('Không thể lưu hồ sơ nOcnOm', error);
      setStatus({
        type: 'error',
        message: 'Không thể lưu hồ sơ. Kiểm tra kết nối hoặc quyền Firestore.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Quản lý tài khoản nOcnOm"
      onMouseDown={event => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
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

        <div className="max-h-[calc(90vh-84px)] overflow-y-auto p-5">
          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="h-12 w-12 overflow-hidden rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
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
            Google chỉ dùng để xác thực đăng nhập. Thông tin bên dưới là hồ sơ riêng của nOcnOm và không mở trang quản lý tài khoản Google.
          </p>

          {loading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-500">
              Đang tải hồ sơ...
            </div>
          ) : (
            <div className="mt-5 space-y-4">
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
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Ngày sinh</span>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={event => updateField('dateOfBirth', event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950"
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
  );
}
