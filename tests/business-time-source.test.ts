import fs from 'node:fs';
import path from 'node:path';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const collect = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

const sourceFiles = collect(path.join(process.cwd(), 'src'));
const offenders = [];

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (
    source.includes('.toDateString()') ||
    /new\s+Date\s*\(\s*\)\s*\.getDay\s*\(/.test(source)
  ) {
    offenders.push(path.relative(process.cwd(), file));
  }
}

assert(
  offenders.length === 0,
  offenders.length === 0
    ? 'Application source has no device-timezone business-date patterns'
    : `Device-timezone business-date patterns found: ${offenders.join(', ')}`
);

const timezoneLiteralFiles = sourceFiles
  .filter(file => file !== path.join(process.cwd(), 'src', 'lib', 'dateTime.ts'))
  .filter(file =>
    fs.readFileSync(file, 'utf8').includes("'Asia/Ho_Chi_Minh'")
  );

assert(
  timezoneLiteralFiles.length === 0,
  timezoneLiteralFiles.length === 0
    ? 'Asia/Ho_Chi_Minh is centralized in dateTime.ts'
    : `Raw timezone literals found outside dateTime.ts: ${timezoneLiteralFiles.join(', ')}`
);

if (failures > 0) process.exit(1);
console.log('Business-time source guard tests: PASS');
