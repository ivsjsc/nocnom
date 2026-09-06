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

let uid = '';
let firstPath = '';
let secondPath = '';

const safeCleanup = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const tasks = [];
  if (firstPath) tasks.push(deleteObject(ref(storage, firstPath)).catch(() => undefined));
  if (secondPath) tasks.push(deleteObject(ref(storage, secondPath)).catch(() => undefined));
  tasks.push(deleteDoc(doc(firestore, 'users', user.uid, 'profile', 'main')).catch(() => undefined));
  tasks.push(deleteDoc(doc(firestore, 'users', user.uid, 'data', 'appState')).catch(() => undefined));
  await Promise.all(tasks);
  await deleteUser(user).catch(() => undefined);
};

try {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  uid = credential.user.uid;
  firstPath = `users/${uid}/foods/${foodId}/first.png`;
  secondPath = `users/${uid}/foods/${foodId}/second.png`;

  const profileRef = doc(firestore, 'users', uid, 'profile', 'main');
  const stateRef = doc(firestore, 'users', uid, 'data', 'appState');

  await setDoc(profileRef, {
    fullName: 'nOcnOm Production Smoke',
    photoUrl: 'https://example.com/avatar.png',
    updatedAt: serverTimestamp()
  });
  if (!(await getDoc(profileRef)).exists()) throw new Error('profile create/read failed');

  const firstRef = ref(storage, firstPath);
  await uploadBytes(firstRef, bytes, {
    contentType: 'image/png',
    customMetadata: { uploadedBy: uid, foodId }
  });
  const firstUrl = await getDownloadURL(firstRef);
  await getBytes(firstRef);

  await setDoc(stateRef, {
    timetable: {},
    categories: [],
    logs: [],
    dishes: [{
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
    updatedAt: serverTimestamp()
  });

  let state = await getDoc(stateRef);
  if (state.data()?.dishes?.[0]?.imagePath !== firstPath) {
    throw new Error('image metadata write failed');
  }

  await signOut(auth);
  await signInWithEmailAndPassword(auth, email, password);

  if (!(await getDoc(profileRef)).exists()) throw new Error('profile login persistence failed');
  state = await getDoc(stateRef);
  if (state.data()?.dishes?.[0]?.imageUrl !== firstUrl) {
    throw new Error('app state login persistence failed');
  }
  await getBytes(firstRef);

  const secondRef = ref(storage, secondPath);
  await uploadBytes(secondRef, bytes, {
    contentType: 'image/png',
    customMetadata: { uploadedBy: uid, foodId }
  });
  const secondUrl = await getDownloadURL(secondRef);

  await setDoc(stateRef, {
    dishes: [{
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
    updatedAt: serverTimestamp()
  }, { merge: true });

  state = await getDoc(stateRef);
  if (state.data()?.dishes?.[0]?.imagePath !== secondPath) {
    throw new Error('image replacement metadata failed');
  }

  await deleteObject(firstRef);
  firstPath = '';
  await deleteObject(secondRef);
  secondPath = '';
  await deleteDoc(profileRef);
  await deleteDoc(stateRef);
  await deleteUser(auth.currentUser);

  console.log('nOcnOm production Firebase smoke: PASS', {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    uid
  });
} catch (error) {
  console.error('nOcnOm production Firebase smoke: FAIL', {
    code: typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'unknown',
    message: error instanceof Error ? error.message : String(error),
    uid: uid || null
  });
  await safeCleanup();
  process.exitCode = 1;
} finally {
  await deleteApp(app).catch(() => undefined);
}
