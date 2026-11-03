import type { Activity } from "./activity";
import { SPORT_CATEGORIES, type SportCategory } from "./sports";

export type Totals = {
  /** Activities recorded on the watch */
  count: number;
  /** Movements detected by Move IQ */
  autoCount: number;
  movingTime: number;
  elapsedTime: number;
  /** elapsed − moving: time lost to stops and pauses */
  stoppedTime: number;
  /** Part of movingTime detected by Move IQ (not recorded on the watch) */
  autoTime: number;
  distance: number;
  /** Part of distance estimated for Move IQ events (no GPS) */
  autoDistance: number;
  elevationGain: number;
};

export type Summary = Totals & {
  byCategory: { category: SportCategory; movingTime: number; autoTime: number; distance: number; autoDistance: number; count: number; autoCount: number; share: number }[];
  /** Seconds per HR zone 1–5, over activities that recorded HR */
  hrZones: [number, number, number, number, number];
  /** Share of watch-recorded activities with HR zones (Move IQ never has HR) */
  hrCoverage: number;
};

const empty = (): Totals => ({ count: 0, autoCount: 0, movingTime: 0, elapsedTime: 0, stoppedTime: 0, autoTime: 0, distance: 0, autoDistance: 0, elevationGain: 0 });

function add(totals: Totals, a: Activity) {
  if (a.source === "moveiq") totals.autoCount += 1;
  else totals.count += 1;
  totals.movingTime += a.movingTime;
  totals.elapsedTime += a.elapsedTime;
  totals.stoppedTime += Math.max(0, a.elapsedTime - a.movingTime);
  if (a.source === "moveiq") {
    totals.autoTime += a.movingTime;
    totals.autoDistance += a.distance;
  }
  totals.distance += a.distance;
  totals.elevationGain += a.elevationGain;
}

export function summarize(activities: Activity[]): Summary {
  const totals = empty();
  const perCategory = new Map<SportCategory, Totals>();
  const hrZones: Summary["hrZones"] = [0, 0, 0, 0, 0];
  let withHr = 0;

  for (const a of activities) {
    add(totals, a);
    const cat = perCategory.get(a.category) ?? empty();
    add(cat, a);
    perCategory.set(a.category, cat);
    if (a.hrZones) {
      withHr += 1;
      for (let i = 0; i < 5; i++) hrZones[i as 0] += a.hrZones[i as 0];
    }
  }

  // Fixed category order (never sorted by value): sport colors were validated for this adjacency.
  const byCategory = SPORT_CATEGORIES.flatMap((category) => {
    const t = perCategory.get(category);
    if (!t) return [];
    const share = totals.movingTime > 0 ? t.movingTime / totals.movingTime : 0;
    return [{ category, movingTime: t.movingTime, autoTime: t.autoTime, distance: t.distance, autoDistance: t.autoDistance, count: t.count, autoCount: t.autoCount, share }];
  });

  return { ...totals, byCategory, hrZones, hrCoverage: totals.count > 0 ? withHr / totals.count : 0 };
}

/** Relative change vs the previous period; null when there is nothing to compare to. */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}
