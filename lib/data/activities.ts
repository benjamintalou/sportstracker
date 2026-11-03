import "server-only";
import { cacheLife } from "next/cache";
import { matchesSport, type Activity, type SportFilter } from "@/lib/activity";
import { fetchActivities } from "@/lib/garmin/activities";
import { inRange, type Period } from "@/lib/period";
import { SPEED_KEYS, type SpeedKey, type Speeds } from "@/lib/prefs";
import { demoActivities, isDemo } from "./demo";
import { getMoveIqActivities } from "./moveiq";

/**
 * Private cache: may read the session cookie, dedupes within a request and keeps
 * results in the browser for client navigations, never in a server cache, so
 * Garmin data and tokens stay out of shared storage and cache keys.
 */
async function activitiesBetween(from: string, to: string): Promise<Activity[]> {
  "use cache: private";
  cacheLife({ stale: 300 });
  if (isDemo()) return demoActivities(from, to);
  return fetchActivities({ from, to });
}

/** Move IQ is a bonus: if Garmin's timeline fails, the dashboard still shows recorded activities. */
async function moveIqBetween(from: string, to: string): Promise<{ activities: Activity[]; failed: boolean }> {
  try {
    return { activities: await getMoveIqActivities({ from, to }), failed: false };
  } catch (error) {
    console.warn("[garmin] Move IQ unavailable:", error instanceof Error ? error.message : error);
    return { activities: [], failed: true };
  }
}

const isSpeedKey = (key: string): key is SpeedKey => (SPEED_KEYS as readonly string[]).includes(key);

/** Move IQ has no GPS: distance is estimated as duration × the user's average speed for that sport. */
function withEstimatedDistance(activity: Activity, speeds: Speeds): Activity {
  const kmh = isSpeedKey(activity.typeKey) ? speeds[activity.typeKey] : 0;
  if (kmh <= 0) return activity;
  const metersPerSecond = kmh / 3.6;
  return { ...activity, distance: Math.round(activity.movingTime * metersPerSecond), averageSpeed: metersPerSecond };
}

/** Activities of the period and of the comparison period (a single Garmin query for recorded ones). */
export async function getPeriodActivities(
  period: Period,
  sport: SportFilter,
  { moveIq = true, speeds }: { moveIq?: boolean; speeds: Speeds },
) {
  const [recorded, detected] = await Promise.all([
    activitiesBetween(period.previous.from, period.to),
    moveIq ? moveIqBetween(period.previous.from, period.to) : { activities: [], failed: false },
  ]);
  const estimated = detected.activities.map((a) => withEstimatedDistance(a, speeds));
  const filtered = [...recorded, ...estimated].filter((a) => matchesSport(a, sport));
  return {
    current: filtered.filter((a) => inRange(a.date, period)),
    previous: filtered.filter((a) => inRange(a.date, period.previous)),
    moveIqFailed: detected.failed,
  };
}
