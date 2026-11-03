import "server-only";
import { z } from "zod";
import type { Activity } from "@/lib/activity";
import type { DateRange } from "@/lib/period";
import { toSportCategory } from "@/lib/sports";
import { garminFetch } from "./client";

const num = z.number().nullish();

const activitySchema = z.object({
  activityId: z.number(),
  activityName: z.string().nullish(),
  startTimeLocal: z.string(),
  activityType: z.object({ typeKey: z.string() }),
  duration: num,
  elapsedDuration: num,
  movingDuration: num,
  distance: num,
  elevationGain: num,
  averageSpeed: num,
  averageHR: num,
  maxHR: num,
  calories: num,
  locationName: z.string().nullish(),
  hrTimeInZone_1: num,
  hrTimeInZone_2: num,
  hrTimeInZone_3: num,
  hrTimeInZone_4: num,
  hrTimeInZone_5: num,
});

type GarminActivity = z.infer<typeof activitySchema>;

export function normalizeActivity(raw: GarminActivity): Activity {
  // `duration` is timer time (auto-pause excluded); fall back to it when a field is missing.
  const timer = raw.duration ?? 0;
  const elapsed = raw.elapsedDuration ?? timer;
  const moving = Math.min(raw.movingDuration ?? timer, elapsed);
  const zones = [raw.hrTimeInZone_1, raw.hrTimeInZone_2, raw.hrTimeInZone_3, raw.hrTimeInZone_4, raw.hrTimeInZone_5];

  return {
    id: raw.activityId,
    name: raw.activityName?.trim() || "Activité",
    startLocal: raw.startTimeLocal,
    date: raw.startTimeLocal.slice(0, 10),
    typeKey: raw.activityType.typeKey,
    category: toSportCategory(raw.activityType.typeKey),
    source: "device",
    movingTime: moving,
    elapsedTime: elapsed,
    distance: raw.distance ?? 0,
    elevationGain: raw.elevationGain ?? 0,
    averageSpeed: raw.averageSpeed ?? null,
    averageHR: raw.averageHR ?? null,
    maxHR: raw.maxHR ?? null,
    calories: raw.calories ?? null,
    location: raw.locationName ?? null,
    hrZones: zones.some((z) => z != null) ? (zones.map((z) => z ?? 0) as Activity["hrZones"]) : null,
  };
}

const PAGE_SIZE = 100;
const MAX_PAGES = 30;

/** All activities whose local start date is within the range (inclusive), newest first. */
export async function fetchActivities(range: DateRange): Promise<Activity[]> {
  const activities: Activity[] = [];
  // Sequential pages: polite with Garmin's rate limits.
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({
      startDate: range.from,
      endDate: range.to,
      start: String(page * PAGE_SIZE),
      limit: String(PAGE_SIZE),
    });
    const batch = await garminFetch(`/activitylist-service/activities/search/activities?${query}`, z.array(activitySchema));
    activities.push(...batch.map(normalizeActivity));
    if (batch.length < PAGE_SIZE) break;
  }
  return activities;
}
