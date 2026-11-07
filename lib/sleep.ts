import type { DateRange } from "./period";
import { inRange } from "./period";

/** One night, keyed by the calendar date Garmin gives it (the wake-up day). Durations in seconds, HR in bpm. */
export type Night = {
  date: string;
  sleepSeconds: number;
  deepSeconds: number | null;
  lightSeconds: number | null;
  remSeconds: number | null;
  awakeSeconds: number | null;
  /** Garmin sleep score, 0–100 */
  score: number | null;
  /** Average heart rate while asleep */
  avgHr: number | null;
  /** Lowest heart rate sample while asleep */
  minHr: number | null;
  restingHr: number | null;
  /** Average overnight HRV, ms */
  hrv: number | null;
  /** Average breaths per minute */
  respiration: number | null;
};

export type SleepSummary = {
  nights: number;
  /** Mean of the nightly average sleep HR */
  avgHr: number | null;
  /** Lowest sleep HR reached in the range, and the night it happened */
  minHr: { value: number; date: string } | null;
  avgSleep: number | null;
  avgScore: number | null;
  /** Average seconds per stage, over nights that report stages */
  stages: { deep: number; light: number; rem: number; awake: number } | null;
  avgRestingHr: number | null;
  avgHrv: number | null;
  avgRespiration: number | null;
};

function mean(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) / present.length : null;
}

export function summarizeSleep(all: Night[], range: DateRange): SleepSummary {
  const nights = all.filter((n) => inRange(n.date, range));

  let minHr: SleepSummary["minHr"] = null;
  for (const n of nights) if (n.minHr !== null && (minHr === null || n.minHr < minHr.value)) minHr = { value: n.minHr, date: n.date };

  const staged = nights.filter((n) => n.deepSeconds !== null && n.lightSeconds !== null && n.remSeconds !== null);
  const stages =
    staged.length > 0
      ? {
          deep: mean(staged.map((n) => n.deepSeconds))!,
          light: mean(staged.map((n) => n.lightSeconds))!,
          rem: mean(staged.map((n) => n.remSeconds))!,
          awake: mean(staged.map((n) => n.awakeSeconds ?? 0))!,
        }
      : null;

  return {
    nights: nights.length,
    avgHr: mean(nights.map((n) => n.avgHr)),
    minHr,
    avgSleep: mean(nights.map((n) => n.sleepSeconds)),
    avgScore: mean(nights.map((n) => n.score)),
    stages,
    avgRestingHr: mean(nights.map((n) => n.restingHr)),
    avgHrv: mean(nights.map((n) => n.hrv)),
    avgRespiration: mean(nights.map((n) => n.respiration)),
  };
}
