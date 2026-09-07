import fs from 'node:fs';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const files = [
  'src/components/HomePage.tsx',
  'src/components/LogsPage.tsx',
  'src/components/WeeklyTable.tsx'
];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  assert(
    !source.includes('.toDateString()') &&
      !source.includes('.getDay()'),
    `${file} has no device-timezone business-date logic`
  );
}

const home = fs.readFileSync(files[0], 'utf8');
const logs = fs.readFileSync(files[1], 'utf8');
const weekly = fs.readFileSync(files[2], 'utf8');

assert(
  home.includes('getVietnamDateKey') &&
    home.includes('getVietnamDayKey') &&
    home.includes('calculateConsumedCalories') &&
    home.includes('calculatePlannedCalories'),
  'Home dashboard is wired to Vietnam date + centralized meal analytics'
);
assert(
  logs.includes('useVietnamBusinessDate') &&
    logs.includes('getLogsForVietnamDate') &&
    logs.includes('buildRecentConsumedSeries'),
  'Health/history page is wired to Vietnam business date + centralized analytics'
);
assert(
  weekly.includes('useVietnamBusinessDate'),
  'Weekly table highlights today from Vietnam business date'
);

assert(
  !fs.existsSync('src/components/TodayMenu.tsx'),
  'Unused duplicate TodayMenu implementation is removed'
);

if (failures > 0) process.exit(1);
console.log('Timezone integration tests: PASS');
