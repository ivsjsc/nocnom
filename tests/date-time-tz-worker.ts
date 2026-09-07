import {
  getVietnamDateKey,
  getVietnamDayKey,
  getVietnamWeekday
} from '../src/lib/dateTime';

const timestamp = Number(process.argv[2]);
process.stdout.write(JSON.stringify({
  dateKey: getVietnamDateKey(timestamp),
  dayKey: getVietnamDayKey(timestamp),
  weekday: getVietnamWeekday(timestamp)
}));
