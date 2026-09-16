import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type {
  ActivityLevel,
  Gender,
  HealthGoal,
  MacroTargetMode
} from '../lib/healthUtils';
import type { RecommendationMode } from '../domain/meal/recommendationEngine';

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
  dailyCalorieTarget?: number | string;
  macroTargetMode?: MacroTargetMode;
  macroProteinPct?: number | string;
  macroCarbsPct?: number | string;
  macroFatPct?: number | string;
  macroProteinG?: number | string;
  macroCarbsG?: number | string;
  macroFatG?: number | string;
  // Recommendation Engine v2
  recommendationMode?: RecommendationMode;
  mealBudgetVnd?: number | string;
};

export type RecommendationPreferences = {
  recommendationMode: RecommendationMode;
  mealBudgetVnd: number | '';
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

const mergeProfileCache = (
  uid: string,
  patch: Partial<UserProfileData>
): Partial<UserProfileData> => {
  const merged = {
    ...(getCachedUserProfile(uid) || {}),
    ...patch
  };
  try {
    localStorage.setItem(localCacheKey(uid), JSON.stringify(merged));
  } catch {
    // Cache is optional; Firestore remains the source of truth.
  }
  return merged;
};

export const loadUserProfile = async (
  uid: string
): Promise<Partial<UserProfileData>> => {
  assertCurrentUser(uid);

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

    const merged = mergeProfileCache(uid, data);

    window.dispatchEvent(
      new CustomEvent('nocnom:profile-updated', { detail: merged })
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

export const saveRecommendationPreferences = async (
  uid: string,
  preferences: RecommendationPreferences
) => {
  assertCurrentUser(uid);
  const allowedModes: RecommendationMode[] = [
    'balanced',
    'budget',
    'variety',
    'quick'
  ];
  if (!allowedModes.includes(preferences.recommendationMode)) {
    throw new Error('Chế độ gợi ý không hợp lệ.');
  }

  const budget = preferences.mealBudgetVnd;
  if (
    budget !== '' &&
    (
      typeof budget !== 'number' ||
      !Number.isFinite(budget) ||
      budget < 5000 ||
      budget > 2_000_000
    )
  ) {
    throw new Error('Ngân sách/bữa phải từ 5.000đ đến 2.000.000đ.');
  }

  try {
    await setDoc(
      profileRef(uid),
      {
        recommendationMode: preferences.recommendationMode,
        mealBudgetVnd: budget,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    const merged = mergeProfileCache(uid, {
      recommendationMode: preferences.recommendationMode,
      mealBudgetVnd: budget
    });

    window.dispatchEvent(
      new CustomEvent('nocnom:profile-updated', { detail: merged })
    );
  } catch (error) {
    console.error('[firestore-profile]', {
      operation: 'write-recommendation-preferences',
      code: getFirebaseErrorCode(error),
      path: `users/${uid}/profile/main`,
      uid,
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};
