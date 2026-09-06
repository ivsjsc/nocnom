import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { ActivityLevel, Gender, HealthGoal } from '../lib/healthUtils';

export type UserProfileData = {
  fullName: string;
  dateOfBirth: string;
  school: string;
  faculty: string;
  studentId: string;
  phone: string;
  photoUrl: string;
  // Sức khỏe & Thể trạng
  gender?: Gender;
  heightCm?: number | string;
  weightKg?: number | string;
  activityLevel?: ActivityLevel;
  healthGoal?: HealthGoal;
};

const getFirebaseErrorCode = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code || 'unknown');
  }
  return 'unknown';
};

const assertCurrentUser = (uid: string) => {
  const current = auth.currentUser;
  if (!current || current.uid !== uid) {
    throw new Error('Phiên đăng nhập không hợp lệ cho hồ sơ này.');
  }
  return current;
};

const profileRef = (uid: string) =>
  doc(db, 'users', uid, 'profile', 'main');

const localCacheKey = (uid: string) => `nocnom_profile_cache_${uid}`;

export const getCachedUserProfile = (uid: string): Partial<UserProfileData> | null => {
  try {
    const raw = localStorage.getItem(localCacheKey(uid));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<UserProfileData>;
  } catch {
    return null;
  }
};

export const loadUserProfile = async (
  uid: string
): Promise<Partial<UserProfileData>> => {
  assertCurrentUser(uid);

  // Thử đọc từ cache trước nếu có
  const cached = getCachedUserProfile(uid);

  try {
    const snapshot = await getDoc(profileRef(uid));
    if (!snapshot.exists()) {
      return cached || {};
    }
    const data = snapshot.data() as Partial<UserProfileData>;
    try {
      localStorage.setItem(localCacheKey(uid), JSON.stringify(data));
    } catch {
      // Bỏ qua lỗi hạn mức localStorage
    }
    return data;
  } catch (error) {
    console.error('[firestore-profile]', {
      operation: 'read-profile',
      code: getFirebaseErrorCode(error),
      path: `users/${uid}/profile/main`,
      uid,
      message: error instanceof Error ? error.message : String(error)
    });
    if (cached) return cached;
    throw error;
  }
};

export const saveUserProfile = async (
  uid: string,
  data: UserProfileData
) => {
  const user = assertCurrentUser(uid);

  try {
    await setDoc(
      profileRef(uid),
      {
        ...data,
        email: user.email || '',
        authProvider:
          user.providerData.map(provider => provider.providerId).join(',') ||
          'password',
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // Cập nhật cache local
    try {
      localStorage.setItem(localCacheKey(uid), JSON.stringify(data));
    } catch {
      // Ignore cache write error
    }

    // Phát sự kiện toàn cục để các màn hình cập nhật ngay tức thì
    window.dispatchEvent(
      new CustomEvent('nocnom:profile-updated', { detail: data })
    );
  } catch (error) {
    console.error('[firestore-profile]', {
      operation: 'write-profile',
      code: getFirebaseErrorCode(error),
      path: `users/${uid}/profile/main`,
      uid,
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

