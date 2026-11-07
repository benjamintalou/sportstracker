import type { Activity } from "./activity";
import { ISO_DATE, dayjs } from "./dates";
import type { DateRange } from "./period";

export type SpeedPoint = {
  date: string;
  /** Average speed of the day's rides (km/h), null on days without a ride */
  day: number | null;
  /** Average speed over the trailing 30 days (km/h), null when no ride in the window */
  rolling: number | null;
};

export const ROLLING_DAYS = 30;

/**
 * Outdoor rides: recorded ones and Move IQ trips (whose distance, hence speed, is estimated
 * from the user's setting). Indoor rides are left out: their speed is simulated.
 */
export const countsForSpeed = (a: Activity) => a.category === "bike" && a.distance > 0 && a.movingTime > 0;

/**
 * Daily average speed (total distance ÷ total moving time of the day, so long rides weigh more)
 * and its trailing 30-day average, one point per calendar day of the range.
 */
export function dailySpeeds(activities: Activity[], range: DateRange): SpeedPoint[] {
  const perDay = new Map<string, { distance: number; time: number }>();
  for (const a of activities) {
    if (!countsForSpeed(a)) continue;
    const d = perDay.get(a.date) ?? { distance: 0, time: 0 };
    d.distance += a.distance;
    d.time += a.movingTime;
    perDay.set(a.date, d);
  }

  const kmh = (distance: number, time: number) => (time > 0 ? (distance / time) * 3.6 : null);
  const days: { date: string; distance: number; time: number }[] = [];
  for (let d = dayjs(range.from); !d.isAfter(dayjs(range.to)); d = d.add(1, "day")) {
    const date = d.format(ISO_DATE);
    days.push({ date, ...(perDay.get(date) ?? { distance: 0, time: 0 }) });
  }

  // Sliding window sums.
  let distance = 0;
  let time = 0;
  return days.map((day, i) => {
    distance += day.distance;
    time += day.time;
    const out = days[i - ROLLING_DAYS];
    if (out) {
      distance -= out.distance;
      time -= out.time;
    }
    return { date: day.date, day: kmh(day.distance, day.time), rolling: kmh(distance, time) };
  });
}
