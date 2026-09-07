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
  'scripts/firebase-production-smoke-public-url.mjs',
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
  'mealAddons',
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
  smoke.includes("mediaPolicy: 'PUBLIC_URL_ONLY'") &&
    smoke.includes("imageSource: 'wikimedia-commons'") &&
    smoke.includes('publicImageUrl'),
  'Production smoke verifies public image URL persistence'
);
assert(
  !smoke.includes("from 'firebase/storage'") &&
    !smoke.includes('uploadBytes(') &&
    !smoke.includes('getBytes(') &&
    !smoke.includes('deleteObject('),
  'Production smoke has no Firebase Storage dependency'
);

const addDishModal = fs.readFileSync(
  'src/components/AddDishModal.tsx',
  'utf8'
);
const editDishModal = fs.readFileSync(
  'src/components/EditDishModal.tsx',
  'utf8'
);
const menuPage = fs.readFileSync(
  'src/components/MenuPage.tsx',
  'utf8'
);
const userDataStore = fs.readFileSync(
  'src/services/userDataStore.ts',
  'utf8'
);
const firebaseClient = fs.readFileSync(
  'src/lib/firebase.ts',
  'utf8'
);
const homePage = fs.readFileSync(
  'src/components/HomePage.tsx',
  'utf8'
);
const mealAddonPicker = fs.readFileSync(
  'src/components/MealAddonPicker.tsx',
  'utf8'
);

assert(
  addDishModal.includes('Ảnh công khai qua URL') &&
    addDishModal.includes('dán URL ảnh HTTPS ổn định'),
  'Add Dish UI exposes the public URL media policy'
);
assert(
  !addDishModal.includes('type="file"') &&
    !addDishModal.includes('uploadUserFoodImage') &&
    !addDishModal.includes("source: 'firebase-storage'"),
  'Add Dish UI does not offer Firebase Storage uploads'
);

assert(
  editDishModal.includes('Ảnh công khai qua URL') &&
    editDishModal.includes('Không tải file lên Firebase Storage'),
  'Edit Dish UI uses the public URL media policy'
);
assert(
  !editDishModal.includes('type="file"') &&
    !menuPage.includes("window.prompt('URL hình ảnh:"),
  'Dish image editing no longer uses file uploads or browser URL prompts'
);
assert(
  userDataStore.includes('stripUndefinedFields(state.dishes)') &&
    firebaseClient.includes('ignoreUndefinedProperties: true'),
  'Firestore persistence has defense-in-depth protection against undefined fields'
);
assert(
  userDataStore.includes("'mealAddons'") &&
    userDataStore.includes('stripUndefinedFields(state.mealAddons)') &&
    smoke.includes("stateDocRef(uid, 'mealAddons')"),
  'Custom meal addons persist in the owner-scoped schema v2 state'
);
assert(
  mealAddonPicker.includes('Tạo món kèm của tôi') &&
    mealAddonPicker.includes('Tạo và chọn món kèm') &&
    mealAddonPicker.includes('Nước ép cam') &&
    mealAddonPicker.includes('Dưa hấu'),
  'Meal addon UI supports custom creation for fruit, drink and related categories'
);

assert(
  homePage.includes('data-calorie-value="consumed"') &&
    homePage.includes('Đã tiêu thụ') &&
    homePage.includes('data-calorie-value="target"') &&
    homePage.includes('Mục tiêu ngày'),
  'Home calorie card separates consumed calories from the daily target'
);
assert(
  !homePage.includes('≈ {plannedCalories.toLocaleString'),
  'Home calorie headline no longer presents planned menu calories as consumed calories'
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
