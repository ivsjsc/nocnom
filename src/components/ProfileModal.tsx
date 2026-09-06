import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, Save, ShieldCheck, UserRound, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import { normalizeExternalImageUrl } from '../lib/url';
import {
  loadUserProfile,
  saveUserProfile
} from '../services/userProfile';

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
};

const emptyProfile: ProfileForm = {
  fullName: '',
  dateOfBirth: '',
  school: '',
  faculty: '',
  studentId: '',
  phone: '',
  photoUrl: ''
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
            ''
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

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setStatus(null);
  };

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

    setSaving(true);
    setStatus(null);

    try {
      const photoUrl = normalizedPhotoUrl || '';
      const fullName = form.fullName.trim();

      await saveUserProfile(user.uid, {
        fullName,
        dateOfBirth: form.dateOfBirth,
        school: form.school.trim(),
        faculty: form.faculty.trim(),
        studentId: form.studentId.trim(),
        phone: form.phone.trim(),
        photoUrl
      });

      onProfileSaved?.(photoUrl, fullName);
      setForm(current => ({ ...current, photoUrl }));
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
    ),
    document.body
  );
}
