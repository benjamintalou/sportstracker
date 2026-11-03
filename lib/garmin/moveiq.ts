import "server-only";
import { z } from "zod";
import type { Activity } from "@/lib/activity";
import { toSportCategory } from "@/lib/sports";

/**
 * Move IQ: movements the watch detects on its own (commute by bike, walks…).
 * They only live in the daily timeline (`dailyEvents`), not in the activity list,
 * and carry a type, a start and a duration: no GPS, distance or heart-rate zones.
 *
 * The payload is undocumented. Observed shape (2026-10): a bare array of
 * { calendarDate, activityType: "cycling", startTimestampGMT/Local, endTimestampGMT/Local, duration (minutes) }.
 * Parsing stays tolerant to other shapes.
 */
export const dailyEventsSchema = z.unknown();

const MOVE_IQ_TYPES: Record<string, { typeKey: string; label: string }> = {
  cycling: { typeKey: "cycling", label: "Vélo" },
  biking: { typeKey: "cycling", label: "Vélo" },
  bike: { typeKey: "cycling", label: "Vélo" },
  walking: { typeKey: "walking", label: "Marche" },
  walk: { typeKey: "walking", label: "Marche" },
  running: { typeKey: "running", label: "Course" },
  run: { typeKey: "running", label: "Course" },
  swimming: { typeKey: "lap_swimming", label: "Natation" },
  swim: { typeKey: "lap_swimming", label: "Natation" },
  elliptical: { typeKey: "elliptical", label: "Elliptique" },
};

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Events may come as a bare array or wrapped in an object: collect every object found in arrays. */
export function eventsOf(payload: unknown): Raw[] {
  if (Array.isArray(payload)) return payload.filter(isObject);
  if (isObject(payload)) return Object.values(payload).flatMap((v) => (Array.isArray(v) ? v.filter(isObject) : []));
  return [];
}

function typeOf(e: Raw) {
  const raw = e.activityType;
  const key = str(raw) ?? (isObject(raw) ? str(raw.typeKey) : undefined) ?? str(e.activityTypeKey) ?? str(e.eventType);
  return key ? MOVE_IQ_TYPES[key.toLowerCase()] : undefined;
}

/** Garmin timestamps have no zone suffix ("2026-10-27T07:47:00.0"); read them as UTC so differences are exact. */
const utcMs = (v: unknown) => (typeof v === "string" ? Date.parse(`${v.replace(" ", "T")}Z`) : NaN);

/**
 * Seconds. Observed payload: `startTimestampGMT`/`endTimestampGMT` plus `duration` in MINUTES
 * (07:47 → 08:15 has `duration: 28`). Timestamps are preferred: they don't depend on a unit.
 */
function durationOf(e: Raw) {
  const fromTimestamps = (utcMs(e.endTimestampGMT) - utcMs(e.startTimestampGMT)) / 1000;
  if (Number.isFinite(fromTimestamps) && fromTimestamps > 0) return fromTimestamps;
  const minutes = num(e.duration);
  return minutes === undefined ? undefined : minutes * 60;
}

/** "2026-10-12T08:05:00.0" or "2026-10-12 08:05:00" → "2026-10-12 08:05:00" */
const localTime = (v: string) => v.replace("T", " ").slice(0, 19);

export function parseMoveIqEvents(payload: unknown, date: string): Activity[] {
  return eventsOf(payload).flatMap((e, index) => {
    const type = typeOf(e);
    const duration = durationOf(e);
    if (!type || !duration || duration <= 0) return [];
    const start = localTime(str(e.startTimestampLocal) ?? str(e.startTimeLocal) ?? str(e.startTimestampGMT) ?? `${date} 00:00:00`);
    const seconds = Math.round(duration);

    return [
      {
        id: num(e.id) ?? num(e.eventId) ?? Number(`${date.replaceAll("-", "")}${index}`),
        name: `${type.label} (Move IQ)`,
        startLocal: start,
        date: str(e.calendarDate) ?? start.slice(0, 10),
        typeKey: type.typeKey,
        category: toSportCategory(type.typeKey),
        source: "moveiq",
        movingTime: seconds,
        elapsedTime: seconds,
        distance: 0,
        elevationGain: 0,
        averageSpeed: null,
        averageHR: null,
        maxHR: null,
        calories: null,
        location: null,
        hrZones: null,
      } satisfies Activity,
    ];
  });
}
