import { readFile } from 'node:fs/promises';
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

const firebaseSource = await readFile('src/lib/firebase.ts', 'utf8');

const readConfig = key => {
  const match = firebaseSource.match(
    new RegExp(key + '\\s*:\\s*["\\\']([^"\\\']+)["\\\']')
  );
  if (!match) {
    throw new Error('Unable to read Firebase client config key: ' + key);
  }
  return match[1];
};

const firebaseConfig = {
  apiKey: readConfig('apiKey'),
  authDomain: readConfig('authDomain'),
  projectId: readConfig('projectId'),
  messagingSenderId: readConfig('messagingSenderId'),
  appId: readConfig('appId')
};

const runId =
  Date.now().toString(36) +
  '-' +
  Math.random().toString(36).slice(2, 10);
const email = `nocnom.smoke.${runId}@example.com`;
const password = `Nocnom-Smoke-${runId}-A1!`;
const foodId = 'smoke-food-' + runId;
const publicImageUrl =
  'https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg';

const app = initializeApp(firebaseConfig, 'nocnom-production-smoke-public-url');
const auth = getAuth(app);
const firestore = getFirestore(app);

const STATE_DOMAINS = [
  'timetable',
  'dishes',
  'categories',
  'logs',
  'meta'
];

let uid = '';

const stateDocRef = (userId, domain) =>
  doc(firestore, 'users', userId, 'state', domain);

const deleteUserDocuments = async userId => {
  await Promise.all([
    deleteDoc(
      doc(firestore, 'users', userId, 'profile', 'main')
    ).catch(() => undefined),
    ...STATE_DOMAINS.map(domain =>
      deleteDoc(stateDocRef(userId, domain)).catch(() => undefined)
    )
  ]);
};

const safeCleanup = async () => {
  if (!auth.currentUser && uid) {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    ).catch(() => undefined);
  }

  const user = auth.currentUser;
  if (!user) return;

  await deleteUserDocuments(user.uid);
  await deleteUser(user).catch(() => undefined);
};

const assertStateDocumentExists = async (reference, label) => {
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) {
    throw new Error(label + ' state document missing');
  }
  return snapshot;
};

try {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  uid = credential.user.uid;

  const profileRef = doc(
    firestore,
    'users',
    uid,
    'profile',
    'main'
  );
  const timetableRef = stateDocRef(uid, 'timetable');
  const dishesRef = stateDocRef(uid, 'dishes');
  const categoriesRef = stateDocRef(uid, 'categories');
  const logsRef = stateDocRef(uid, 'logs');
  const metaRef = stateDocRef(uid, 'meta');

  await setDoc(profileRef, {
    fullName: 'nOcnOm Production Smoke',
    photoUrl: publicImageUrl,
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
      mediaPolicy: 'PUBLIC_URL_ONLY',
      updatedAt: serverTimestamp()
    }),
    setDoc(dishesRef, {
      items: [
        {
          id: foodId,
          name: 'Smoke Food',
          categoryId: 'smoke',
          isFavorite: false,
          vendors: [],
          imageUrl: publicImageUrl,
          imageSource: 'wikimedia-commons'
        }
      ],
      schemaVersion: 2,
      updatedAt: serverTimestamp()
    })
  ]);

  const initialState = await Promise.all([
    assertStateDocumentExists(timetableRef, 'timetable'),
    assertStateDocumentExists(dishesRef, 'dishes'),
    assertStateDocumentExists(categoriesRef, 'categories'),
    assertStateDocumentExists(logsRef, 'logs'),
    assertStateDocumentExists(metaRef, 'meta')
  ]);

  if (
    initialState[1].data()?.items?.[0]?.imageUrl !==
    publicImageUrl
  ) {
    throw new Error('public image URL metadata write failed');
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

  if (
    persistedState[1].data()?.items?.[0]?.imageUrl !==
    publicImageUrl
  ) {
    throw new Error('public image URL login persistence failed');
  }

  if (
    persistedState[4].data()?.mediaPolicy !==
    'PUBLIC_URL_ONLY'
  ) {
    throw new Error('public URL media policy metadata missing');
  }

  await deleteUserDocuments(uid);
  await deleteUser(auth.currentUser);

  console.log('nOcnOm production Firebase smoke: PASS', {
    projectId: firebaseConfig.projectId,
    stateSchemaVersion: 2,
    mediaPolicy: 'PUBLIC_URL_ONLY',
    uid
  });
} catch (error) {
  console.error('nOcnOm production Firebase smoke: FAIL', {
    code:
      typeof error === 'object' &&
      error !== null &&
      'code' in error
        ? String(error.code)
        : 'unknown',
    message:
      error instanceof Error
        ? error.message
        : String(error),
    uid: uid || null
  });

  await safeCleanup();
  process.exitCode = 1;
} finally {
  await deleteApp(app).catch(() => undefined);
}
