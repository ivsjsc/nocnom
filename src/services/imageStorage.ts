import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadMetadata,
  type UploadTaskSnapshot
} from 'firebase/storage';
import { auth, storage } from '../lib/firebase';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const OPTIMIZE_THRESHOLD_BYTES = 800 * 1024;
const WEBP_QUALITY = 0.82;

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

export type ImageUploadProgress = (progressPercent: number) => void;

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

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  contentType: string,
  quality: number
) => new Promise<Blob | null>(resolve => {
  canvas.toBlob(resolve, contentType, quality);
});

const optimizedFileName = (originalName: string) => {
  const base = originalName.replace(/\.[^.]+$/, '').trim() || 'image';
  return base + '.webp';
};

/**
 * Mobile-first optimization. Correctness is preserved:
 * - validate the original first;
 * - only use optimized output when it is smaller;
 * - fall back to the original file if browser decoding/encoding is unavailable.
 */
export const optimizeImageForUpload = async (file: File): Promise<File> => {
  validateImageFile(file);

  if (
    typeof document === 'undefined' ||
    typeof createImageBitmap !== 'function'
  ) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);

    const longestSide = Math.max(bitmap.width, bitmap.height);
    const needsResize = longestSide > MAX_IMAGE_DIMENSION;
    const needsCompression = file.size > OPTIMIZE_THRESHOLD_BYTES;

    if (!needsResize && !needsCompression) {
      return file;
    }

    const scale = needsResize
      ? MAX_IMAGE_DIMENSION / longestSide
      : 1;

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToBlob(
      canvas,
      'image/webp',
      WEBP_QUALITY
    );

    if (!blob || blob.size <= 0 || blob.size >= file.size) {
      return file;
    }

    if (blob.size > MAX_IMAGE_BYTES) {
      return file;
    }

    return new File(
      [blob],
      optimizedFileName(file.name),
      {
        type: 'image/webp',
        lastModified: Date.now()
      }
    );
  } catch (error) {
    console.warn('[firebase-storage] Image optimization skipped', {
      message:
        error instanceof Error
          ? error.message
          : String(error),
      originalType: file.type,
      originalSize: file.size
    });
    return file;
  } finally {
    bitmap?.close();
  }
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

const uploadResumable = ({
  imageRef,
  file,
  metadata,
  onProgress
}: {
  imageRef: ReturnType<typeof ref>;
  file: File;
  metadata: UploadMetadata;
  onProgress?: ImageUploadProgress;
}) => new Promise<UploadTaskSnapshot>((resolve, reject) => {
  const task = uploadBytesResumable(
    imageRef,
    file,
    metadata
  );

  task.on(
    'state_changed',
    snapshot => {
      if (!onProgress) return;
      const total = snapshot.totalBytes || 1;
      const progress = Math.round(
        (snapshot.bytesTransferred / total) * 100
      );
      onProgress(Math.min(100, Math.max(0, progress)));
    },
    reject,
    () => resolve(task.snapshot)
  );
});

export const uploadUserFoodImage = async ({
  file,
  uid,
  foodId,
  onProgress
}: {
  file: File;
  uid: string;
  foodId: string;
  onProgress?: ImageUploadProgress;
}): Promise<StoredImageMetadata> => {
  validateImageFile(file);
  const user = await ensureAuthenticatedUser(uid);
  const optimizedFile = await optimizeImageForUpload(file);

  const imagePath = createFoodImagePath(
    user.uid,
    foodId,
    optimizedFile.type
  );
  const imageRef = ref(storage, imagePath);

  const metadata: UploadMetadata = {
    contentType: optimizedFile.type,
    customMetadata: {
      uploadedBy: user.uid,
      foodId,
      originalContentType: file.type,
      originalSize: String(file.size)
    }
  };

  try {
    onProgress?.(0);

    const snapshot = await uploadResumable({
      imageRef,
      file: optimizedFile,
      metadata,
      onProgress
    });
    const imageUrl = await getDownloadURL(snapshot.ref);

    onProgress?.(100);

    return {
      imageUrl,
      imagePath: snapshot.ref.fullPath,
      imageContentType: optimizedFile.type,
      imageSize: optimizedFile.size,
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
    'storage/retry-limit-exceeded': 'Tải ảnh quá thời gian cho phép. Hãy thử lại.',
    'storage/quota-exceeded': 'Firebase Storage đã chạm giới hạn quota. Ảnh chưa được lưu; vui lòng thử lại sau khi quota được khôi phục.'
  };

  return messages[code] ||
    (error instanceof Error ? error.message : 'Không thể lưu ảnh lên Firebase Storage.');
};
