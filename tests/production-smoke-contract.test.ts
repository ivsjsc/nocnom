import fs from 'node:fs';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const smoke = fs.readFileSync(
  'scripts/firebase-production-smoke-v2.mjs',
  'utf8'
);
const workflow = fs.readFileSync(
  '.github/workflows/firebase-hosting-merge.yml',
  'utf8'
);

console.log('=== PRODUCTION SMOKE CONTRACT TESTS ===');

for (const domain of [
  'timetable',
  'dishes',
  'categories',
  'logs',
  'meta'
]) {
  assert(
    smoke.includes(`stateDocRef(uid, '${domain}')`),
    `Production smoke exercises schema v2 state/${domain}`
  );
}

assert(
  smoke.includes('schemaVersion: 2'),
  'Production smoke writes schemaVersion 2'
);
assert(
  smoke.includes("migrationSource: 'v2'"),
  'Production smoke writes schema v2 metadata'
);
assert(
  !smoke.includes("'data', 'appState'"),
  'Production smoke does not mistake legacy appState for the active state path'
);
assert(
  smoke.includes('signOut(auth)') &&
    smoke.includes('signInWithEmailAndPassword(auth, email, password)'),
  'Production smoke verifies logout/login persistence'
);
assert(
  smoke.includes('getDownloadURL(firstRef)') &&
    smoke.includes('getBytes(firstRef)') &&
    smoke.includes('deleteObject(firstRef)'),
  'Production smoke verifies Storage URL, read and cleanup'
);
assert(
  smoke.includes('secondRef') &&
    smoke.includes('schema v2 image replacement metadata failed'),
  'Production smoke verifies image replacement against schema v2'
);

const hostingDeploy = workflow.indexOf(
  'FirebaseExtended/action-hosting-deploy@v0'
);
const productionSmoke = workflow.indexOf(
  'Production Firebase smoke test'
);

assert(
  hostingDeploy >= 0 && productionSmoke > hostingDeploy,
  'Production workflow runs live smoke only after Hosting deployment'
);
assert(
  workflow.includes('Firestore + Storage security rules tests'),
  'Production workflow gates deploy on Firebase emulator rules tests'
);
assert(
  workflow.includes('npm run lint') &&
    workflow.includes('npm run firebase:audit') &&
    workflow.includes('npm test') &&
    workflow.includes('npm run build'),
  'Production workflow retains lint, Firebase audit, tests and build gates'
);

if (failures > 0) process.exit(1);
console.log('Production smoke contract tests: PASS');
