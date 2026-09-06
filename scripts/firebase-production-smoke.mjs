import {
  deleteApp,
  initializeApp
} from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import {
  deleteObject,
  getBytes,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAk3xmDXDBWxiqWc2iqMpKMjzsEUebHiJU',
  authDomain: 'cocoa-35632.firebaseapp.com',
  projectId: 'cocoa-35632',
  storageBucket: 'cocoa-35632.firebasestorage.app',
  messagingSenderId: '135997735106',
  appId: '1:135997735106:web:645fa543d81de4eeb63b5b'
};

const runId =
  Date.now().toString(36) +
  '-' +
  Math.random().toString(36).slice(2, 10);

const email = `nocnom.smoke.${runId}@example.com`;
const password = `Nocnom-Smoke-${runId}-A1!`;
const foodId = 'smoke-food-' + runId;
const imagePath1 = `users/__UID__/foods/${foodId}/first.png`;
const imagePath2 = `users/__UID__/foods/${foodId}/second.png`;
const imageBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d
]);

let app = initializeApp(firebaseConfig, 'nocnom-production-smoke-1');
let auth = getAuth(app);
let firestore = getFirestore(app);
let storage = getStorage(app);
let uid = '';
let path1 = '';
let path2 = '';

const cleanup = async () => {
  if (!auth.currentUser) return;

  const operations = [];

  if (path1) {
    operations.push(
      deleteObject(ref(storage, path1)).catch(() => undefined)
    );
  }
  if (path2) {
    operations.push(
      deleteObject(ref(storage, path2)).catch(() => undefined)
    );
  }

  operations.push(
    deleteDoc(
      doc(firestore, 'users', auth.currentUser.uid, 'profile', 'main')
    ).catch(() => undefined)
  );
  operations.push(
    deleteDoc(
      doc(firestore, 'users', auth.currentUser.uid, 'data', 'appState')
    ).catch(() => undefined)
  );

  await Promise.all(operations);
  await deleteUser(auth.currentUser).catch(() => undefined);
};

try {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  uid = credential.user.uid;
  path1 = imagePath1.replace('__UID__', uid);
  path2 = imagePath2.replace('__UID__', uid);

  // Firestore CREATE + READ.
  const profileRef = doc(
    firestore,
    'users',
    uid,
    'profile',
    'main'
  );
  await setDoc(profileRef, {
    fullName: 'nOcnOm Production Smoke',
    photoUrl: 'https://example.com/avatar.png',
    updatedAt: serverTimestamp()
  });

  const profileSnapshot = await getDoc(profileRef);
  if (!profileSnapshot.exists()) {
    throw new Error('Production smoke: profile create/read failed.');
  }

  // Storage upload + getDownloadURL.
  const firstRef = ref(storage, path1);
  await uploadBytes(firstRef, imageBytes, {
    contentType: 'image/png',
    customMetadata: {
      uploadedBy: uid,
      foodId
    }
  });
  const firstUrl = await getDownloadURL(firstRef);
  await getBytes(firstRef);

  // Firestore metadata persistence after Storage success.
  const stateRef = doc(
    firestore,
    'users',
    uid,
    'data',
    'appState'
  );
  await setDoc(stateRef, {
    timetable: {},
    categories: [],
    logs: [],
    dishes: [
      {
        id: foodId,
        name: 'Smoke Food',
        categoryId: 'smoke',
        isFavorite: false,
        vendors: [],
        imageUrl: firstUrl,
        imagePath: path1,
        imageContentType: 'image/png',
        imageSize: imageBytes.byteLength,
        imageSource: 'firebase-storage',
        imageUpdatedAt: Date.now()
      }
    ],
    updatedAt: serverTimestamp()
  });

  let stateSnapshot = await getDoc(stateRef);
  if (
    !stateSnapshot.exists() ||
    stateSnapshot.data().dishes?.[0]?.imagePath !== path1
  ) {
    throw new Error('Production smoke: image metadata write failed.');
  }

  // Simulate logout/login + application reload.
  await signOut(auth);
  await deleteApp(app);

  app = initializeApp(firebaseConfig, 'nocnom-production-smoke-2');
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);

  await signInWithEmailAndPassword(auth, email, password);

  const reloadedStateRef = doc(
    firestore,
    'users',
    uid,
    'data',
    'appState'
  );
  stateSnapshot = await getDoc(reloadedStateRef);
  if (
    !stateSnapshot.exists() ||
    stateSnapshot.data().dishes?.[0]?.imageUrl !== firstUrl
  ) {
    throw new Error('Production smoke: logout/login persistence failed.');
  }
  await getBytes(ref(storage, path1));

  // Replacement order: upload new -> Firestore update -> delete old.
  const secondRef = ref(storage, path2);
  await uploadBytes(secondRef, imageBytes, {
    contentType: 'image/png',
    customMetadata: {
      uploadedBy: uid,
      foodId
    }
  });
  const secondUrl = await getDownloadURL(secondRef);

  await setDoc(
    reloadedStateRef,
    {
      dishes: [
        {
          id: foodId,
          name: 'Smoke Food',
          categoryId: 'smoke',
          isFavorite: false,
          vendors: [],
          imageUrl: secondUrl,
          imagePath: path2,
          imageContentType: 'image/png',
          imageSize: imageBytes.byteLength,
          imageSource: 'firebase-storage',
          imageUpdatedAt: Date.now()
        }
      ],
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  stateSnapshot = await getDoc(reloadedStateRef);
  if (stateSnapshot.data().dishes?.[0]?.imagePath !== path2) {
    throw new Error('Production smoke: image replacement metadata failed.');
  }

  await deleteObject(ref(storage, path1));
  path1 = '';

  // DELETE only isolated smoke-owned data.
  await deleteObject(ref(storage, path2));
  path2 = '';
  await deleteDoc(profileRef);
  await deleteDoc(reloadedStateRef);

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Production smoke: auth user unexpectedly missing.');
  }
  await deleteUser(user);

  console.log('nOcnOm production Firebase smoke: PASS', {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    uid
  });
} catch (error) {
  console.error('nOcnOm production Firebase smoke: FAIL', {
    code:
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : 'unknown',
    message: error instanceof Error ? error.message : String(error),
    uid: uid || null
  });

  await cleanup();
  process.exitCode = 1;
} finally {
  await deleteApp(app).catch(() => undefined);
}
