import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const isAuthPopupDismissed = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
};
