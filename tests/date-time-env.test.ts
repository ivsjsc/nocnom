import { spawnSync } from 'node:child_process';
import path from 'node:path';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

const worker = path.join(process.cwd(), 'tests', 'date-time-tz-worker.ts');
const timestamp = Date.parse('2026-09-13T02:00:00+07:00');
const timezones = [
  'UTC',
  'Asia/Ho_Chi_Minh',
  'America/New_York',
  'Europe/London'
];

const outputs = timezones.map(TZ => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', worker, String(timestamp)],
    {
      env: { ...process.env, TZ },
      encoding: 'utf8'
    }
  );

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    return { TZ, value: null };
  }

  return { TZ, value: JSON.parse(result.stdout) };
});

const first = outputs[0]?.value;
assert(Boolean(first), 'Timezone worker produced a reference result');

for (const output of outputs) {
  assert(
    JSON.stringify(output.value) === JSON.stringify(first),
    `Business date is identical under TZ=${output.TZ}`
  );
}

assert(
  first?.dateKey === '2026-09-13' && first?.dayKey === 'sun',
  '2026-09-13 02:00 Vietnam resolves to Sunday consistently'
);

if (failures > 0) process.exit(1);
console.log('Timezone environment matrix tests: PASS');
