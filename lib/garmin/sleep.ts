import "server-only";
import { z } from "zod";
import type { Night } from "@/lib/sleep";

/**
 * Nightly sleep: `/wellness-service/wellness/dailySleepData/{displayName}?date=&nonSleepBufferMinutes=60`.
 * Undocumented payload (shape from garth / python-garminconnect), so parsing stays tolerant:
 * { dailySleepDTO: { calendarDate, sleepTimeSeconds, deep/light/rem/awakeSleepSeconds,
 *   sleepStart/EndTimestampGMT (ms), averageRespirationValue, avgHeartRate?, sleepScores.overall.value },
 *   sleepHeartRate: [{ value, startGMT (ms) }], restingHeartRate, avgOvernightHrv, … }
 * Check it with the dev-only `/api/debug/sleep?date=`.
 */
export const dailySleepSchema = z.unknown();

export const sleepPath = (displayName: string, date: string) =>
  `/wellness-service/wellness/dailySleepData/${encodeURIComponent(displayName)}?date=${date}&nonSleepBufferMinutes=60`;

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const positive = (v: unknown) => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};
const time = (v: unknown) => num(v) ?? (typeof v === "string" ? Date.parse(v.endsWith("Z") ? v : `${v}Z`) : NaN);

/** HR samples recorded while asleep (the payload adds a buffer before and after the night). */
function sleepHrSamples(payload: Raw, start: number | null, end: number | null): number[] {
  const samples = Array.isArray(payload.sleepHeartRate) ? payload.sleepHeartRate.filter(isObject) : [];
  return samples.flatMap((s) => {
    const value = positive(s.value);
    if (value === null) return [];
    const at = time(s.startGMT);
    if (start !== null && end !== null && Number.isFinite(at) && (at < start || at > end)) return [];
    return [value];
  });
}

export function parseNight(payload: unknown, date: string): Night | null {
  if (!isObject(payload) || !isObject(payload.dailySleepDTO)) return null;
  const dto = payload.dailySleepDTO;
  const sleepSeconds = positive(dto.sleepTimeSeconds);
  if (sleepSeconds === null) return null;

  const hr = sleepHrSamples(payload, num(dto.sleepStartTimestampGMT), num(dto.sleepEndTimestampGMT));
  const mean = hr.length > 0 ? hr.reduce((a, b) => a + b, 0) / hr.length : null;
  const scores = isObject(dto.sleepScores) && isObject(dto.sleepScores.overall) ? dto.sleepScores.overall : null;

  return {
    date: typeof dto.calendarDate === "string" ? dto.calendarDate : date,
    sleepSeconds,
    deepSeconds: num(dto.deepSleepSeconds),
    lightSeconds: num(dto.lightSleepSeconds),
    remSeconds: num(dto.remSleepSeconds),
    awakeSeconds: num(dto.awakeSleepSeconds),
    score: positive(scores?.value),
    avgHr: positive(dto.avgHeartRate) ?? mean,
    minHr: hr.length > 0 ? Math.min(...hr) : positive(dto.lowestHeartRate),
    restingHr: positive(payload.restingHeartRate) ?? positive(dto.restingHeartRate),
    hrv: positive(payload.avgOvernightHrv),
    respiration: positive(dto.averageRespirationValue),
  };
}
