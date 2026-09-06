import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email.trim(), password);

export const createAccountWithEmail = async (
  fullName: string,
  email: string,
  password: string
): Promise<UserCredential> => {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const normalizedName = fullName.trim();

  if (normalizedName) {
    await updateProfile(credential.user, { displayName: normalizedName });
  }

  return credential;
};

export const resetPasswordByEmail = (email: string) =>
  sendPasswordResetEmail(auth, email.trim());

export const isAuthPopupDismissed = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
};

export const getAuthErrorMessage = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return error instanceof Error ? error.message : 'Không thể xác thực tài khoản.';
  }

  const code = String((error as { code?: unknown }).code || '');

  const messages: Record<string, string> = {
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/missing-password': 'Vui lòng nhập mật khẩu.',
    'auth/weak-password': 'Mật khẩu chưa đủ mạnh.',
    'auth/email-already-in-use': 'Email này đã có tài khoản. Hãy đăng nhập hoặc dùng Google.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/user-disabled': 'Tài khoản này đã bị vô hiệu hóa.',
    'auth/too-many-requests': 'Có quá nhiều lần thử. Vui lòng thử lại sau.',
    'auth/network-request-failed': 'Không thể kết nối máy chủ xác thực. Kiểm tra kết nối mạng.',
    'auth/operation-not-allowed': 'Đăng nhập Email/Password chưa được bật trong Firebase Authentication.',
    'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập Google.',
    'auth/popup-closed-by-user': 'Đã đóng cửa sổ đăng nhập Google.',
    'auth/cancelled-popup-request': 'Yêu cầu đăng nhập Google trước đó đã bị hủy.'
  };

  return messages[code] || (error instanceof Error ? error.message : 'Không thể xác thực tài khoản.');
};
