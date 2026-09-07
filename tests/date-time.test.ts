import {
  getMsUntilNextVietnamMidnight,
  getVietnamDateKey,
  getVietnamDateKeyOffset,
  getVietnamDayKey,
  getVietnamStartOfDay,
  isVietnamToday
} from '../src/lib/dateTime';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`[PASS] ${message}`);
  else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

console.log('=== VIETNAM BUSINESS TIME TESTS ===');

const beforeMidnight = Date.parse('2026-09-06T16:59:59Z');
const afterMidnight = Date.parse('2026-09-06T17:00:01Z');

assert(
  getVietnamDateKey(beforeMidnight) === '2026-09-06',
  '23:59:59 Asia/Ho_Chi_Minh stays on Sep 6'
);
assert(
  getVietnamDateKey(afterMidnight) === '2026-09-07',
  '00:00:01 Asia/Ho_Chi_Minh rolls to Sep 7'
);
assert(
  getVietnamDayKey(afterMidnight) === 'mon',
  'Vietnam day key is Monday after rollover'
);

const sameInstantUtc = Date.parse('2026-09-06T18:30:00Z');
const sameInstantNewYorkNotation = Date.parse('2026-09-06T14:30:00-04:00');
const sameInstantVietnamNotation = Date.parse('2026-09-07T01:30:00+07:00');

assert(
  sameInstantUtc === sameInstantNewYorkNotation &&
    sameInstantUtc === sameInstantVietnamNotation,
  'Reference timestamp is identical across UTC/New York/Vietnam notations'
);
assert(
  getVietnamDateKey(sameInstantUtc) ===
    getVietnamDateKey(sameInstantNewYorkNotation) &&
    getVietnamDateKey(sameInstantUtc) ===
      getVietnamDateKey(sameInstantVietnamNotation),
  'Business date is independent of device/source timezone notation'
);

assert(
  isVietnamToday(afterMidnight, afterMidnight + 60_000),
  'isVietnamToday uses Vietnam business date'
);
assert(
  !isVietnamToday(beforeMidnight, afterMidnight),
  'Vietnam midnight separates business dates'
);

assert(
  getVietnamDateKeyOffset('2026-09-07', -3) === '2026-09-04',
  'Date-key offset is calendar-safe'
);
assert(
  getVietnamStartOfDay(afterMidnight) ===
    Date.parse('2026-09-07T00:00:00+07:00'),
  'Vietnam start-of-day is 00:00 +07:00'
);

const ms = getMsUntilNextVietnamMidnight(
  Date.parse('2026-09-07T23:59:59+07:00')
);
assert(ms === 1000, 'Midnight scheduler resolves one second boundary');

if (failures > 0) process.exit(1);
console.log('Vietnam business time tests: PASS');
