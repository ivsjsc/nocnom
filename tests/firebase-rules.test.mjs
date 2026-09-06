import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import {
  deleteObject,
  getBytes,
  ref,
  uploadBytes
} from 'firebase/storage';

const projectId = process.env.GCLOUD_PROJECT || 'cocoa-35632';

const [firestoreRules, storageRules] = await Promise.all([
  readFile('firestore.rules', 'utf8'),
  readFile('storage.rules', 'utf8')
]);

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { rules: firestoreRules },
  storage: { rules: storageRules }
});

const alice = testEnv.authenticatedContext('alice');
const bob = testEnv.authenticatedContext('bob');
const guest = testEnv.unauthenticatedContext();

try {
  await testEnv.clearFirestore();

  // Firestore owner isolation.
  const aliceProfile = doc(
    alice.firestore(),
    'users',
    'alice',
    'profile',
    'main'
  );
  const aliceState = doc(
    alice.firestore(),
    'users',
    'alice',
    'data',
    'appState'
  );

  await assertSucceeds(
    setDoc(aliceProfile, {
      fullName: 'Alice',
      photoUrl: 'https://example.com/alice.jpg'
    })
  );

  await assertSucceeds(
    setDoc(aliceState, {
      dishes: [],
      logs: [],
      categories: [],
      timetable: {}
    })
  );

  await assertSucceeds(getDoc(aliceProfile));
  await assertSucceeds(getDoc(aliceState));

  await assertFails(
    getDoc(doc(bob.firestore(), 'users', 'alice', 'profile', 'main'))
  );
  await assertFails(
    getDoc(doc(bob.firestore(), 'users', 'alice', 'data', 'appState'))
  );
  await assertFails(
    setDoc(
      doc(bob.firestore(), 'users', 'alice', 'profile', 'main'),
      { fullName: 'Hijack' }
    )
  );
  await assertFails(
    getDoc(doc(guest.firestore(), 'users', 'alice', 'profile', 'main'))
  );

  await assertFails(
    setDoc(
      aliceProfile,
      {
        fullName: 'Alice',
        unexpectedPrivateField: 'must be rejected'
      },
      { merge: true }
    )
  );

  await assertFails(
    setDoc(
      aliceState,
      {
        dishes: [],
        unsupportedField: true
      },
      { merge: true }
    )
  );

  // Storage owner isolation and MIME/size validation.
  const validPng = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d
  ]);
  const imagePath = 'users/alice/foods/dish-1/test.png';

  await assertSucceeds(
    uploadBytes(
      ref(alice.storage(), imagePath),
      validPng,
      { contentType: 'image/png' }
    )
  );
  await assertSucceeds(getBytes(ref(alice.storage(), imagePath)));

  await assertFails(getBytes(ref(bob.storage(), imagePath)));
  await assertFails(
    uploadBytes(
      ref(bob.storage(), 'users/alice/foods/dish-1/hijack.png'),
      validPng,
      { contentType: 'image/png' }
    )
  );
  await assertFails(
    uploadBytes(
      ref(guest.storage(), 'users/alice/foods/dish-1/guest.png'),
      validPng,
      { contentType: 'image/png' }
    )
  );

  await assertFails(
    uploadBytes(
      ref(alice.storage(), 'users/alice/foods/dish-1/not-image.txt'),
      new TextEncoder().encode('not an image'),
      { contentType: 'text/plain' }
    )
  );

  await assertFails(
    uploadBytes(
      ref(alice.storage(), 'users/alice/foods/dish-1/too-large.png'),
      new Uint8Array(5 * 1024 * 1024 + 1),
      { contentType: 'image/png' }
    )
  );

  await assertFails(
    uploadBytes(
      ref(alice.storage(), 'foods/public-wrong-path.png'),
      validPng,
      { contentType: 'image/png' }
    )
  );

  await assertSucceeds(deleteObject(ref(alice.storage(), imagePath)));

  console.log('Firebase rules tests: PASS');
} finally {
  await testEnv.cleanup();
}
