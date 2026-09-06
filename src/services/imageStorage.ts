import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata
} from 'firebase/storage';
import { auth, storage } from '../lib/firebase';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const extensionByType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

export type StoredImageMetadata = {
  imageUrl: string;
  imagePath: string;
  imageContentType: string;
  imageSize: number;
  imageSource: 'firebase-storage';
  imageUpdatedAt: number;
};

const getFirebaseErrorCode = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code || 'unknown');
  }
  return 'unknown';
};

const logStorageError = (
  operation: string,
  error: unknown,
  context: { path?: string; uid?: string }
) => {
  console.error('[firebase-storage]', {
    operation,
    code: getFirebaseErrorCode(error),
    message: error instanceof Error ? error.message : String(error),
    path: context.path || null,
    uid: context.uid || null
  });
};

export const validateImageFile = (file: File) => {
  if (!(file instanceof File)) {
    throw new Error('Chưa chọn tệp hình ảnh.');
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.');
  }

  if (file.size <= 0) {
    throw new Error('Tệp ảnh rỗng hoặc không hợp lệ.');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Ảnh vượt quá 5 MB. Hãy chọn ảnh nhỏ hơn.');
  }

  return file;
};

const ensureAuthenticatedUser = async (expectedUid?: string) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Cần đăng nhập trước khi tải ảnh lên.');
  }

  if (expectedUid && user.uid !== expectedUid) {
    throw new Error('Phiên đăng nhập không khớp người dùng hiện tại.');
  }

  // Force token availability before hitting Storage Rules.
  await user.getIdToken();
  return user;
};

export const createFoodImagePath = (
  uid: string,
  foodId: string,
  contentType: string
) => {
  const extension = extensionByType[contentType];
  if (!extension) {
    throw new Error('Định dạng ảnh không được hỗ trợ.');
  }

  const fileId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

  return `users/${uid}/foods/${foodId}/${fileId}.${extension}`;
};

export const uploadUserFoodImage = async ({
  file,
  uid,
  foodId
}: {
  file: File;
  uid: string;
  foodId: string;
}): Promise<StoredImageMetadata> => {
  validateImageFile(file);
  const user = await ensureAuthenticatedUser(uid);
  const imagePath = createFoodImagePath(user.uid, foodId, file.type);
  const imageRef = ref(storage, imagePath);

  const metadata: UploadMetadata = {
    contentType: file.type,
    customMetadata: {
      uploadedBy: user.uid,
      foodId
    }
  };

  try {
    const snapshot = await uploadBytes(imageRef, file, metadata);
    const imageUrl = await getDownloadURL(snapshot.ref);

    return {
      imageUrl,
      imagePath: snapshot.ref.fullPath,
      imageContentType: file.type,
      imageSize: file.size,
      imageSource: 'firebase-storage',
      imageUpdatedAt: Date.now()
    };
  } catch (error) {
    logStorageError('upload-user-food-image', error, {
      path: imagePath,
      uid: user.uid
    });
    throw error;
  }
};

export const deleteUserImageByPath = async ({
  imagePath,
  uid
}: {
  imagePath: string;
  uid: string;
}) => {
  if (!imagePath) return;
  const user = await ensureAuthenticatedUser(uid);

  if (!imagePath.startsWith(`users/${user.uid}/`)) {
    throw new Error('Không thể xóa ảnh ngoài phạm vi dữ liệu của người dùng.');
  }

  try {
    await deleteObject(ref(storage, imagePath));
  } catch (error) {
    logStorageError('delete-user-image', error, {
      path: imagePath,
      uid: user.uid
    });
    throw error;
  }
};

export const describeStorageError = (error: unknown) => {
  const code = getFirebaseErrorCode(error);
  const messages: Record<string, string> = {
    'storage/unauthorized': 'Firebase Storage từ chối quyền truy cập ảnh.',
    'storage/object-not-found': 'Không tìm thấy ảnh trong Firebase Storage.',
    'storage/bucket-not-found': 'Firebase Storage bucket chưa được cấu hình đúng.',
    'storage/project-not-found': 'Không tìm thấy Firebase project cho Storage.',
    'storage/retry-limit-exceeded': 'Tải ảnh quá thời gian cho phép. Hãy thử lại.'
  };

  return messages[code] ||
    (error instanceof Error ? error.message : 'Không thể lưu ảnh lên Firebase Storage.');
};
