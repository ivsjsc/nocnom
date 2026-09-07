import { getDayPhase } from '../src/lib/dayPhase';

let failures = 0;

function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

function at(hour: number, minute = 0) {
  return new Date(2026, 8, 7, hour, minute, 0, 0);
}

console.log('=== HOME DAY PHASE TESTS ===');

assert(getDayPhase(at(4, 59)).phase === 'night', '04:59 is night');
assert(getDayPhase(at(5, 0)).phase === 'sunrise', '05:00 starts sunrise');
assert(getDayPhase(at(8, 59)).phase === 'sunrise', '08:59 remains sunrise');
assert(getDayPhase(at(9, 0)).phase === 'day', '09:00 starts daytime');
assert(getDayPhase(at(10, 59)).greeting === 'Chào buổi sáng', 'Morning greeting remains before 11:00');
assert(getDayPhase(at(11, 0)).greeting === 'Chào buổi trưa', '11:00 switches to midday greeting');
assert(getDayPhase(at(15, 59)).phase === 'day', '15:59 remains daytime');
assert(getDayPhase(at(16, 0)).phase === 'sunset', '16:00 starts sunset');
assert(getDayPhase(at(18, 59)).phase === 'sunset', '18:59 remains sunset');
assert(getDayPhase(at(19, 0)).phase === 'night', '19:00 starts night');
assert(getDayPhase(at(23, 59)).phase === 'night', '23:59 remains night');
assert(getDayPhase(at(0, 0)).phase === 'night', '00:00 remains night');

if (failures > 0) process.exit(1);
console.log('Home day phase tests: PASS');
