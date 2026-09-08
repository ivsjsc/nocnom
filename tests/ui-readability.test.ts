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
const methodology = fs.readFileSync(
  'src/components/HealthMethodologyPage.tsx',
  'utf8'
);

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
assert(
  health.includes('health-value text-3xl font-black') &&
    health.includes('health-label text-[11px] font-black') &&
    health.includes('health-goal-badge') &&
    health.includes('health-coverage-badge'),
  'Health dashboard primary values and badges use semantic contrast hooks'
);
assert(
  css.includes('html:not(.dark) .health-card .health-value') &&
    css.includes('color: #0b1220 !important') &&
    css.includes('.dark .health-value') &&
    css.includes('.health-goal-badge'),
  'Health dashboard defines explicit light/dark foreground contracts'
);
assert(
  health.includes('health-card-title text-sm font-black') &&
    health.includes('BMI · {BMI_REFERENCE_LABELS[DEFAULT_BMI_REFERENCE_SYSTEM]}') &&
    health.includes('Calo nạp / Mục tiêu') &&
    health.includes('Macro · Protein / Carb / Fat'),
  'Health dashboard secondary titles use semantic foregrounds instead of light/dark utility collisions'
);
assert(
  css.includes('html:not(.dark) .health-card .health-card-title') &&
    css.includes('.dark .health-card-title') &&
    css.includes('opacity: 1 !important'),
  'Health card titles enforce readable contrast in both themes'
);
assert(
  health.includes('health-macro-note mt-3') &&
    health.includes('health-macro-note-warning') &&
    health.includes('health-macro-note-success') &&
    !health.includes('health-copy mt-3 rounded-2xl border border-slate-200 bg-white'),
  'Macro guidance panel owns its surface and foreground instead of inheriting light-surface text'
);
assert(
  css.includes('.health-macro-note {') &&
    css.includes('background: #475569;') &&
    css.includes('color: #f8fafc;') &&
    css.includes('.health-macro-note-warning') &&
    css.includes('color: #fde047;') &&
    css.includes('.dark .health-macro-note {'),
  'Macro guidance panel defines high-contrast colors for light and dark themes'
);
assert(
  css.includes('html:not(.dark) .app-shell .text-slate-950') &&
    css.includes('html:not(.dark) .app-shell .bg-white') &&
    css.includes('.dark .app-shell .text-slate-950') &&
    css.includes("input:not([type='checkbox']):not([type='radio'])"),
  'App-wide theme contract provides a neutral contrast floor for both themes and form controls'
);
assert(
  methodology.includes('methodology-hero') &&
    methodology.includes('methodology-card') &&
    methodology.includes('methodology-formula') &&
    methodology.includes('methodology-formula-row') &&
    methodology.includes('methodology-step'),
  'Methodology page uses semantic surfaces for hero, cards, formulas, presets and calculation steps'
);
assert(
  !methodology.includes('bg-slate-50 p-3 font-mono text-sm font-black text-slate-900') &&
    !methodology.includes('rounded-[24px] border border-slate-200 bg-white'),
  'Methodology page no longer relies on conflicting raw light/dark utility combinations'
);
assert(
  css.includes('.methodology-formula {') &&
    css.includes('.dark .methodology-formula') &&
    css.includes('.methodology-card-title') &&
    css.includes('.methodology-copy') &&
    css.includes('.methodology-source'),
  'Methodology semantic typography has explicit light and dark contracts'
);

if (failures > 0) process.exit(1);
console.log('UI readability tests: PASS');
