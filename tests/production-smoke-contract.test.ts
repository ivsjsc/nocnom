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
const profileModal = fs.readFileSync(
  'src/components/ProfileModal.tsx',
  'utf8'
);
const logsPage = fs.readFileSync(
  'src/components/LogsPage.tsx',
  'utf8'
);
const loginMenu = fs.readFileSync(
  'src/components/Login.tsx',
  'utf8'
);
const healthMethodologyPage = fs.readFileSync(
  'src/components/HealthMethodologyPage.tsx',
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
  menuPage.includes('Tổng danh mục') &&
    menuPage.includes('{categories.length}') &&
    !menuPage.includes('Lượt phục vụ') &&
    !menuPage.includes('subscribeLogs(setLogs)'),
  'Kho mon summary reports category count without subscribing to unrelated meal logs'
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
  homePage.includes('data-calorie-value="consumed"') &&
    homePage.includes('Đã tiêu thụ') &&
    homePage.includes('data-calorie-value="target"') &&
    homePage.includes('Mục tiêu ngày'),
  'Home calorie card separates consumed calories from the daily target'
);
assert(
  !homePage.includes('Calo hôm nay') &&
    !homePage.includes('Còn lại ≈'),
  'Home calorie card omits redundant title and remaining-calorie footer'
);
assert(
  homePage.includes('profile?.dailyCalorieTarget'),
  'Home calorie target supports a user-defined override'
);
assert(
  profileModal.includes('Mục tiêu calo/ngày tùy chỉnh') &&
    profileModal.includes("updateField('dailyCalorieTarget'") &&
    logsPage.includes('profile?.dailyCalorieTarget'),
  'Custom calorie target is editable in profile and reused on the Health screen'
);
assert(
  profileModal.includes('Mục tiêu Macro') &&
    profileModal.includes("macroTargetMode === 'ratio'") &&
    profileModal.includes("macroTargetMode === 'grams'") &&
    logsPage.includes("profile?.macroTargetMode") &&
    logsPage.includes('Tùy chỉnh Macro'),
  'Macro targets support auto, percentage and gram modes and are reused on Health'
);
assert(
  logsPage.includes('todayMacros.missingItems') &&
    logsPage.includes('Chưa đủ Macro:'),
  'Health macro card identifies consumed items with missing P/C/F instead of inventing values'
);
assert(
  loginMenu.includes('<span>Quản lý tài khoản</span>') &&
    !loginMenu.includes('<span>Quản lý tài khoản nOcnOm</span>') &&
    loginMenu.includes('<span>Chỉ số & cơ sở tính toán</span>'),
  'Account menu exposes methodology between account management and logout with concise labels'
);
assert(
  healthMethodologyPage.includes('BMI = kg / m²') &&
    healthMethodologyPage.includes('10W + 6.25H') &&
    healthMethodologyPage.includes('TDEE ≈ RMR × hệ số vận động') &&
    healthMethodologyPage.includes('Carb = (kcal mục tiêu') &&
    healthMethodologyPage.includes('Nguồn học thuật chính'),
  'Health methodology page documents formulas, estimates and academic bibliography'
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
