export type DayPhase = 'sunrise' | 'day' | 'sunset' | 'night';

export interface DayPhaseInfo {
  phase: DayPhase;
  greeting: string;
  label: string;
}

/**
 * Local-time day phase used by the Home dashboard.
 *
 * 05:00-08:59  Sunrise
 * 09:00-15:59  Day
 * 16:00-18:59  Sunset
 * 19:00-04:59  Night
 */
export function getDayPhase(date: Date): DayPhaseInfo {
  const hour = date.getHours();

  if (hour >= 5 && hour < 9) {
    return {
      phase: 'sunrise',
      greeting: 'Chào buổi sáng',
      label: 'Bình minh'
    };
  }

  if (hour >= 9 && hour < 16) {
    return {
      phase: 'day',
      greeting: hour < 11 ? 'Chào buổi sáng' : 'Chào buổi trưa',
      label: 'Ban ngày'
    };
  }

  if (hour >= 16 && hour < 19) {
    return {
      phase: 'sunset',
      greeting: 'Chào buổi chiều',
      label: 'Hoàng hôn'
    };
  }

  return {
    phase: 'night',
    greeting: 'Chào buổi tối',
    label: 'Ban đêm'
  };
}
