import { useEffect, useState } from 'react';
import {
  getMsUntilNextVietnamMidnight,
  getVietnamDateKey,
  getVietnamDayKey
} from '../lib/dateTime';

type BusinessDateState = {
  now: number;
  dateKey: string;
  dayKey: ReturnType<typeof getVietnamDayKey>;
};

const snapshot = (): BusinessDateState => {
  const now = Date.now();
  return {
    now,
    dateKey: getVietnamDateKey(now),
    dayKey: getVietnamDayKey(now)
  };
};

export const useVietnamBusinessDate = (): BusinessDateState => {
  const [state, setState] = useState<BusinessDateState>(snapshot);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => setState(snapshot());

    const schedule = () => {
      if (timer) clearTimeout(timer);
      // 1.5s buffer avoids clock precision/race around 00:00:00.
      const delay = getMsUntilNextVietnamMidnight() + 1500;
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, delay);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        schedule();
      }
    };

    const handleFocus = () => {
      refresh();
      schedule();
    };

    schedule();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return state;
};
