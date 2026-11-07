import type { Activity } from "./activity";
import { ISO_DATE, dayjs } from "./dates";
import type { DateRange } from "./period";

export type DistancePoint = {
  date: string;
  /** Km ridden that day, null on days without a ride (no dot drawn) */
  day: number | null;
  /** Km per day over the trailing 30 days, rest days included (like the "Moyenne par jour" cards) */
  rolling: number;
};

export const ROLLING_DAYS = 30;

/** One point per calendar day of the range. Pass activities already filtered to the sport. */
export function dailyDistances(activities: Activity[], range: DateRange): DistancePoint[] {
  const perDay = new Map<string, number>();
  for (const a of activities) if (a.distance > 0) perDay.set(a.date, (perDay.get(a.date) ?? 0) + a.distance);

  const days: { date: string; km: number }[] = [];
  for (let d = dayjs(range.from); !d.isAfter(dayjs(range.to)); d = d.add(1, "day")) {
    const date = d.format(ISO_DATE);
    days.push({ date, km: (perDay.get(date) ?? 0) / 1000 });
  }

  // Sliding window sum; the first days average over the days available so far.
  let sum = 0;
  return days.map((day, i) => {
    sum += day.km;
    const out = days[i - ROLLING_DAYS];
    if (out) sum -= out.km;
    return { date: day.date, day: day.km > 0 ? day.km : null, rolling: sum / Math.min(i + 1, ROLLING_DAYS) };
  });
}
