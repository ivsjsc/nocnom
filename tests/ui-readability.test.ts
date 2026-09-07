import fs from 'node:fs';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const home = fs.readFileSync('src/components/HomePage.tsx', 'utf8');
const health = fs.readFileSync('src/components/LogsPage.tsx', 'utf8');
const menu = fs.readFileSync('src/components/MenuPage.tsx', 'utf8');
const css = fs.readFileSync('src/index.css', 'utf8');

assert(home.includes('data-ui="weekly-schedule-intro"'), 'Weekly schedule intro has a dedicated readable surface');
assert(
  home.includes('theme-text-secondary mt-1 text-xs font-semibold leading-relaxed') &&
    css.includes('.theme-text-secondary'),
  'Weekly schedule description uses semantic readable mobile copy'
);
assert(health.includes('data-ui="health-profile-warning"'), 'Health completion warning has a dedicated readable surface');
assert(health.includes('warning-title text-sm font-black') && css.includes('.warning-title'), 'Health warning heading uses semantic strong foreground contrast');
assert(health.includes("Chưa có số đo") && health.includes('health-chip-muted'), 'Missing BMI measurement is rendered as a clear semantic chip');
assert(health.includes('health-copy mt-2 grid grid-cols-4 gap-1 text-[10px] font-black'), 'BMI range labels use a legible semantic grid hierarchy');
assert(health.includes('truncate text-base font-black text-slate-950'), 'History modal dish name is promoted to primary readable text');
assert(health.includes('text-xs font-extrabold text-slate-700'), 'History modal metadata uses readable supporting text');
assert(menu.includes('border-2 border-slate-400') && menu.includes('placeholder:text-slate-700'), 'Kho mon search has a clear border and readable placeholder');
assert(menu.includes('h-5 w-5') && menu.includes('text-slate-700'), 'Kho mon search icon is visually stronger');
assert(css.includes('.surface-info-strip') && css.includes('.surface-warning-readable'), 'Semantic readable surfaces are defined');

if (failures > 0) process.exit(1);
console.log('UI readability tests: PASS');
