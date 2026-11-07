import "server-only";
import { cacheLife } from "next/cache";
import { matchesSport, type Activity, type SportFilter } from "@/lib/activity";
import { fetchActivities } from "@/lib/garmin/activities";
import { inRange, type DateRange, type Period } from "@/lib/period";
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

type Options = {
  moveIq?: boolean;
  speeds: Speeds;
  /** Narrower range for Move IQ (one Garmin call per day): defaults to the whole range */
  moveIqRange?: DateRange;
};

/** Recorded + Move IQ activities of a range for a sport (Move IQ distance estimated from the user's speeds). */
export async function getRangeActivities(range: DateRange, sport: SportFilter, { moveIq = true, speeds, moveIqRange = range }: Options) {
  const [recorded, detected] = await Promise.all([
    activitiesBetween(range.from, range.to),
    moveIq ? moveIqBetween(moveIqRange.from, moveIqRange.to) : { activities: [], failed: false },
  ]);
  const estimated = detected.activities.map((a) => withEstimatedDistance(a, speeds));
  return {
    activities: [...recorded, ...estimated].filter((a) => matchesSport(a, sport)),
    moveIqFailed: detected.failed,
  };
}

/** Activities of the period and of the comparison period (a single Garmin query for recorded ones). */
export async function getPeriodActivities(period: Period, sport: SportFilter, options: Options) {
  const { activities, moveIqFailed } = await getRangeActivities({ from: period.previous.from, to: period.to }, sport, options);
  return {
    current: activities.filter((a) => inRange(a.date, period)),
    previous: activities.filter((a) => inRange(a.date, period.previous)),
    moveIqFailed,
  };
}
