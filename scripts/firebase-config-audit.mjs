import {
  access,
  readFile
} from 'node:fs/promises';

const EXPECTED_PROJECT_ID = 'cocoa-35632';
const EXPECTED_STORAGE_BUCKET =
  'cocoa-35632.firebasestorage.app';
const EXPECTED_HOSTING_TARGET = 'nocnom';

const fail = message => {
  throw new Error('[firebase-config-audit] ' + message);
};

const escapeRegex = value =>
  value.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');

const [
  firebaseRcRaw,
  firebaseJsonRaw,
  firebaseClientSource,
  mergeWorkflow,
  prWorkflow
] = await Promise.all([
  readFile('.firebaserc', 'utf8'),
  readFile('firebase.json', 'utf8'),
  readFile('src/lib/firebase.ts', 'utf8'),
  readFile(
    '.github/workflows/firebase-hosting-merge.yml',
    'utf8'
  ),
  readFile(
    '.github/workflows/firebase-hosting-pull-request.yml',
    'utf8'
  )
]);

const firebaseRc = JSON.parse(firebaseRcRaw);
const firebaseJson = JSON.parse(firebaseJsonRaw);

if (firebaseRc?.projects?.default !== EXPECTED_PROJECT_ID) {
  fail(
    'Default Firebase project must be ' +
      EXPECTED_PROJECT_ID +
      '.'
  );
}

const hostingTarget =
  firebaseRc?.targets?.[EXPECTED_PROJECT_ID]?.hosting?.[
    EXPECTED_HOSTING_TARGET
  ];

if (
  !Array.isArray(hostingTarget) ||
  !hostingTarget.includes(EXPECTED_HOSTING_TARGET)
) {
  fail(
    'Hosting target "' +
      EXPECTED_HOSTING_TARGET +
      '" is not bound to project ' +
      EXPECTED_PROJECT_ID +
      '.'
  );
}

const hostingEntries = Array.isArray(firebaseJson.hosting)
  ? firebaseJson.hosting
  : [firebaseJson.hosting].filter(Boolean);

if (
  !hostingEntries.some(
    entry => entry?.target === EXPECTED_HOSTING_TARGET
  )
) {
  fail(
    'firebase.json is missing hosting target "' +
      EXPECTED_HOSTING_TARGET +
      '".'
  );
}

if (firebaseJson?.firestore?.rules !== 'firestore.rules') {
  fail('firebase.json must reference firestore.rules.');
}

if (
  firebaseJson?.firestore?.indexes !==
  'firestore.indexes.json'
) {
  fail(
    'firebase.json must reference firestore.indexes.json.'
  );
}

if (firebaseJson?.storage?.rules !== 'storage.rules') {
  fail('firebase.json must reference storage.rules.');
}

for (const path of [
  'firestore.rules',
  'firestore.indexes.json',
  'storage.rules'
]) {
  await access(path).catch(() =>
    fail('Required Firebase config file missing: ' + path)
  );
}

const sourceExpectations = [
  [
    'projectId',
    new RegExp(
      'projectId\\s*:\\s*["\\\']' +
        escapeRegex(EXPECTED_PROJECT_ID) +
        '["\\\']'
    )
  ],
  [
    'storageBucket',
    new RegExp(
      'storageBucket\\s*:\\s*["\\\']' +
        escapeRegex(EXPECTED_STORAGE_BUCKET) +
        '["\\\']'
    )
  ],
  [
    'authDomain',
    new RegExp(
      'authDomain\\s*:\\s*["\\\']' +
        escapeRegex(
          EXPECTED_PROJECT_ID + '.firebaseapp.com'
        ) +
        '["\\\']'
    )
  ]
];

for (const [label, pattern] of sourceExpectations) {
  if (!pattern.test(firebaseClientSource)) {
    fail(
      'Firebase client ' +
        label +
        ' does not match the production project.'
    );
  }
}

for (const [name, workflow] of [
  ['merge workflow', mergeWorkflow],
  ['PR workflow', prWorkflow]
]) {
  if (!workflow.includes('projectId: ' + EXPECTED_PROJECT_ID)) {
    fail(name + ' does not pin projectId.');
  }
}

if (
  !mergeWorkflow.includes(
    'FIREBASE_STORAGE_BUCKET: ' +
      EXPECTED_STORAGE_BUCKET
  )
) {
  fail(
    'Merge workflow does not pin the expected Storage bucket.'
  );
}

console.log('Firebase config audit: PASS', {
  projectId: EXPECTED_PROJECT_ID,
  storageBucket: EXPECTED_STORAGE_BUCKET,
  hostingTarget: EXPECTED_HOSTING_TARGET,
  firestoreRules: firebaseJson.firestore.rules,
  storageRules: firebaseJson.storage.rules
});
