import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserProfileData = {
  fullName: string;
  dateOfBirth: string;
  school: string;
  faculty: string;
  studentId: string;
  phone: string;
  photoUrl: string;
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

export const loadUserProfile = async (
  uid: string
): Promise<Partial<UserProfileData>> => {
  assertCurrentUser(uid);

  try {
    const snapshot = await getDoc(profileRef(uid));
    if (!snapshot.exists()) return {};
    return snapshot.data() as Partial<UserProfileData>;
  } catch (error) {
    console.error('[firestore-profile]', {
      operation: 'read-profile',
      code: getFirebaseErrorCode(error),
      path: `users/${uid}/profile/main`,
      uid,
      message: error instanceof Error ? error.message : String(error)
    });
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
