export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const VIETNAM_UTC_OFFSET = '+07:00';
export const DAY_MS = 24 * 60 * 60 * 1000;

export type VietnamDayKey =
  | 'sun'
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat';

const DAY_KEYS: readonly VietnamDayKey[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat'
];

export type VietnamDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const vietnamFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: VIETNAM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

export const getVietnamDateTimeParts = (
  timestamp = Date.now()
): VietnamDateTimeParts => {
  const parts = vietnamFormatter.formatToParts(new Date(timestamp));
  const lookup = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second)
  };
};

export const getVietnamNow = (timestamp = Date.now()): Date =>
  new Date(timestamp);

export const getVietnamDateKey = (timestamp = Date.now()): string => {
  const { year, month, day } = getVietnamDateTimeParts(timestamp);
  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-');
};

export const parseDateKeyToUtcDay = (dateKey: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(utc / DAY_MS);
};

export const dateKeyFromUtcDay = (utcDay: number): string => {
  const date = new Date(utcDay * DAY_MS);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
};

export const getVietnamDateKeyOffset = (
  dateKey: string,
  offsetDays: number
): string | null => {
  const utcDay = parseDateKeyToUtcDay(dateKey);
  if (utcDay === null || !Number.isInteger(offsetDays)) return null;
  return dateKeyFromUtcDay(utcDay + offsetDays);
};

export const getVietnamDayKey = (
  timestamp = Date.now()
): VietnamDayKey => {
  const dateKey = getVietnamDateKey(timestamp);
  const utcDay = parseDateKeyToUtcDay(dateKey);
  if (utcDay === null) return 'mon';
  const day = new Date(utcDay * DAY_MS).getUTCDay();
  return DAY_KEYS[day];
};

export const getVietnamWeekday = (
  timestamp = Date.now(),
  locale = 'vi-VN'
): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: VIETNAM_TIME_ZONE,
    weekday: 'long'
  }).format(new Date(timestamp));

export const isVietnamToday = (
  timestamp: number,
  now = Date.now()
): boolean =>
  getVietnamDateKey(timestamp) === getVietnamDateKey(now);

export const getVietnamStartOfDay = (
  timestamp = Date.now()
): number => {
  const dateKey = getVietnamDateKey(timestamp);
  return Date.parse(`${dateKey}T00:00:00${VIETNAM_UTC_OFFSET}`);
};

export const getVietnamEndOfDay = (
  timestamp = Date.now()
): number => {
  const dateKey = getVietnamDateKey(timestamp);
  const end = getVietnamTimestampForDateKey(dateKey, '23:59:59');
  return end === null ? getVietnamStartOfDay(timestamp) + DAY_MS - 1 : end + 999;
};

export const getVietnamTimestampForDateKey = (
  dateKey: string,
  time = '12:00:00'
): number | null => {
  if (parseDateKeyToUtcDay(dateKey) === null) return null;
  if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) return null;
  const timestamp = Date.parse(
    `${dateKey}T${time}${VIETNAM_UTC_OFFSET}`
  );
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const getVietnamDateRange = ({
  endTimestamp = Date.now(),
  days
}: {
  endTimestamp?: number;
  days: number;
}): { startDateKey: string; endDateKey: string } | null => {
  if (!Number.isInteger(days) || days <= 0 || days > 3660) return null;
  const endDateKey = getVietnamDateKey(endTimestamp);
  const startDateKey = getVietnamDateKeyOffset(endDateKey, -(days - 1));
  if (!startDateKey) return null;
  return { startDateKey, endDateKey };
};

export const getMsUntilNextVietnamMidnight = (
  now = Date.now()
): number => {
  const todayKey = getVietnamDateKey(now);
  const nextKey = getVietnamDateKeyOffset(todayKey, 1);
  if (!nextKey) return DAY_MS;
  const nextMidnight = getVietnamTimestampForDateKey(
    nextKey,
    '00:00:00'
  );
  if (nextMidnight === null) return DAY_MS;
  return Math.max(0, nextMidnight - now);
};

export const formatVietnamTime = (
  timestamp = Date.now()
): string =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp));
