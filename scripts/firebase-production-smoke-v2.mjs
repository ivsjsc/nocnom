import { deleteApp, initializeApp } from 'firebase/app';
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

const runId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
const email = `nocnom.smoke.${runId}@example.com`;
const password = `Nocnom-Smoke-${runId}-A1!`;
const foodId = 'smoke-food-' + runId;
const bytes = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0x0d]);

const app = initializeApp(firebaseConfig, 'nocnom-production-smoke-v2');
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

const STATE_DOMAINS = ['timetable', 'dishes', 'categories', 'logs', 'meta'];

let uid = '';
let firstPath = '';
let secondPath = '';

const stateDocRef = (userId, domain) =>
  doc(firestore, 'users', userId, 'state', domain);

const deleteUserDocuments = async userId => {
  await Promise.all([
    deleteDoc(doc(firestore, 'users', userId, 'profile', 'main')).catch(() => undefined),
    ...STATE_DOMAINS.map(domain =>
      deleteDoc(stateDocRef(userId, domain)).catch(() => undefined)
    )
  ]);
};

const safeCleanup = async () => {
  if (!auth.currentUser && uid) {
    await signInWithEmailAndPassword(auth, email, password).catch(() => undefined);
  }

  const user = auth.currentUser;
  if (!user) return;

  const storageTasks = [];
  if (firstPath) {
    storageTasks.push(
      deleteObject(ref(storage, firstPath)).catch(() => undefined)
    );
  }
  if (secondPath) {
    storageTasks.push(
      deleteObject(ref(storage, secondPath)).catch(() => undefined)
    );
  }

  await Promise.all(storageTasks);
  await deleteUserDocuments(user.uid);
  await deleteUser(user).catch(() => undefined);
};

const assertStateDocumentExists = async (reference, label) => {
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) {
    throw new Error(`${label} state document missing`);
  }
  return snapshot;
};

try {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  uid = credential.user.uid;
  firstPath = `users/${uid}/foods/${foodId}/first.png`;
  secondPath = `users/${uid}/foods/${foodId}/second.png`;

  const profileRef = doc(firestore, 'users', uid, 'profile', 'main');
  const timetableRef = stateDocRef(uid, 'timetable');
  const dishesRef = stateDocRef(uid, 'dishes');
  const categoriesRef = stateDocRef(uid, 'categories');
  const logsRef = stateDocRef(uid, 'logs');
  const metaRef = stateDocRef(uid, 'meta');

  await setDoc(profileRef, {
    fullName: 'nOcnOm Production Smoke',
    photoUrl: 'https://example.com/avatar.png',
    updatedAt: serverTimestamp()
  });

  if (!(await getDoc(profileRef)).exists()) {
    throw new Error('profile create/read failed');
  }

  await Promise.all([
    setDoc(timetableRef, {
      value: {},
      schemaVersion: 2,
      updatedAt: serverTimestamp()
    }),
    setDoc(categoriesRef, {
      items: [],
      schemaVersion: 2,
      updatedAt: serverTimestamp()
    }),
    setDoc(logsRef, {
      items: [],
      schemaVersion: 2,
      updatedAt: serverTimestamp()
    }),
    setDoc(metaRef, {
      schemaVersion: 2,
      migrationSource: 'v2',
      updatedAt: serverTimestamp()
    })
  ]);

  await Promise.all([
    assertStateDocumentExists(timetableRef, 'timetable'),
    assertStateDocumentExists(categoriesRef, 'categories'),
    assertStateDocumentExists(logsRef, 'logs'),
    assertStateDocumentExists(metaRef, 'meta')
  ]);

  const firstRef = ref(storage, firstPath);
  await uploadBytes(firstRef, bytes, {
    contentType: 'image/png',
    customMetadata: { uploadedBy: uid, foodId }
  });
  const firstUrl = await getDownloadURL(firstRef);
  await getBytes(firstRef);

  await setDoc(dishesRef, {
    items: [{
      id: foodId,
      name: 'Smoke Food',
      categoryId: 'smoke',
      isFavorite: false,
      vendors: [],
      imageUrl: firstUrl,
      imagePath: firstPath,
      imageContentType: 'image/png',
      imageSize: bytes.byteLength,
      imageSource: 'firebase-storage',
      imageUpdatedAt: Date.now()
    }],
    schemaVersion: 2,
    updatedAt: serverTimestamp()
  });

  let dishesState = await assertStateDocumentExists(dishesRef, 'dishes');
  if (dishesState.data()?.items?.[0]?.imagePath !== firstPath) {
    throw new Error('schema v2 image metadata write failed');
  }

  await signOut(auth);
  await signInWithEmailAndPassword(auth, email, password);

  if (!(await getDoc(profileRef)).exists()) {
    throw new Error('profile login persistence failed');
  }

  const persistedState = await Promise.all([
    assertStateDocumentExists(timetableRef, 'timetable'),
    assertStateDocumentExists(dishesRef, 'dishes'),
    assertStateDocumentExists(categoriesRef, 'categories'),
    assertStateDocumentExists(logsRef, 'logs'),
    assertStateDocumentExists(metaRef, 'meta')
  ]);

  dishesState = persistedState[1];
  if (dishesState.data()?.items?.[0]?.imageUrl !== firstUrl) {
    throw new Error('schema v2 app state login persistence failed');
  }
  await getBytes(firstRef);

  const secondRef = ref(storage, secondPath);
  await uploadBytes(secondRef, bytes, {
    contentType: 'image/png',
    customMetadata: { uploadedBy: uid, foodId }
  });
  const secondUrl = await getDownloadURL(secondRef);

  await setDoc(
    dishesRef,
    {
      items: [{
        id: foodId,
        name: 'Smoke Food',
        categoryId: 'smoke',
        isFavorite: false,
        vendors: [],
        imageUrl: secondUrl,
        imagePath: secondPath,
        imageContentType: 'image/png',
        imageSize: bytes.byteLength,
        imageSource: 'firebase-storage',
        imageUpdatedAt: Date.now()
      }],
      schemaVersion: 2,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  dishesState = await getDoc(dishesRef);
  if (dishesState.data()?.items?.[0]?.imagePath !== secondPath) {
    throw new Error('schema v2 image replacement metadata failed');
  }

  await deleteObject(firstRef);
  firstPath = '';
  await deleteObject(secondRef);
  secondPath = '';
  await deleteUserDocuments(uid);
  await deleteUser(auth.currentUser);

  console.log('nOcnOm production Firebase smoke: PASS', {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    stateSchemaVersion: 2,
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
  await safeCleanup();
  process.exitCode = 1;
} finally {
  await deleteApp(app).catch(() => undefined);
}
