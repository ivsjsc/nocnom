import fs from 'node:fs';

const css = fs.readFileSync('src/index.css', 'utf8');
let failures = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function channel(value: number) {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground: string, background: string) {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function token(name: string) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  return match?.[1] || '';
}

const surface = token('light-surface');
const secondary = token('light-text-secondary');
const tertiary = token('light-text-tertiary');
const accent = token('light-accent');
const healthCardLight = token('health-card-light');
const healthCardDark = token('health-card-dark');
const healthTextLight = token('health-text-light');
const healthMutedLight = token('health-muted-light');
const healthTextDark = token('health-text-dark');
const healthMutedDark = token('health-muted-dark');
const appSurface = token('app-surface');
const appTextPrimary = token('app-text-primary');
const appTextSecondary = token('app-text-secondary');
const appTextMuted = token('app-text-muted');

assert(
  Boolean(
    surface &&
    secondary &&
    tertiary &&
    accent &&
    healthCardLight &&
    healthCardDark &&
    healthTextLight &&
    healthMutedLight &&
    healthTextDark &&
    healthMutedDark &&
    appSurface &&
    appTextPrimary &&
    appTextSecondary &&
    appTextMuted
  ),
  'Required contrast tokens exist'
);
assert(contrast(secondary, surface) >= 7, 'Secondary text reaches enhanced contrast on white');
assert(contrast(tertiary, surface) >= 4.5, 'Tertiary text reaches WCAG AA contrast on white');
assert(contrast(accent, surface) >= 4.5, 'Blue accent text reaches WCAG AA contrast on white');
assert(!css.includes('html:not(.dark) .text-blue-300,'), 'Blue-300 is not globally remapped on branded surfaces');
assert(contrast(healthTextLight, healthCardLight) >= 7, 'Health primary text reaches enhanced contrast in light mode');
assert(contrast(healthMutedLight, healthCardLight) >= 7, 'Health supporting text reaches enhanced contrast in light mode');
assert(contrast(healthTextDark, healthCardDark) >= 7, 'Health primary text reaches enhanced contrast in dark mode');
assert(contrast(healthMutedDark, healthCardDark) >= 7, 'Health supporting text reaches enhanced contrast in dark mode');
assert(css.includes('.health-card') && css.includes('.health-copy'), 'Health semantic contrast classes are defined');
assert(
  contrast(appTextPrimary, appSurface) >= 7,
  'Semantic app primary text reaches enhanced contrast in light mode'
);
assert(
  contrast(appTextSecondary, appSurface) >= 7,
  'Semantic app secondary text reaches enhanced contrast in light mode'
);
assert(
  contrast(appTextMuted, appSurface) >= 4.5,
  'Semantic app muted text reaches WCAG AA in light mode'
);
assert(
  css.includes('.app-header-surface') &&
    css.includes('.home-stat-card') &&
    css.includes('.weekly-day-card') &&
    css.includes('.app-nav-item.is-active'),
  'Core navigation and dashboard surfaces use semantic theme classes'
);

if (failures > 0) process.exit(1);
console.log('UI contrast tests: PASS');
