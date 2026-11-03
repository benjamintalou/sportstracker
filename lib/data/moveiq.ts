import "server-only";
import { cacheLife } from "next/cache";
import type { Activity } from "@/lib/activity";
import { ISO_DATE, dayjs, today } from "@/lib/dates";
import { fetchWithToken, getAuth } from "@/lib/garmin/client";
import { dailyEventsSchema, parseMoveIqEvents } from "@/lib/garmin/moveiq";
import type { AccessToken } from "@/lib/garmin/tokens";
import type { DateRange } from "@/lib/period";
import { demoMoveIq, isDemo } from "./demo";

/**
 * Move IQ needs one Garmin call per day, so each day is cached on the server
 * (past days never change). Cache keys hold only the profile id and the date:
 * the token is handed over through this module-level map, never as an argument,
 * because cache keys are stored in plain text.
 */
const tokens = new Map<string, AccessToken>();

/** Raw payload is cached (not parsed events), so parser fixes apply to already-cached days. */
async function dailyEventsRaw(profileId: string, date: string, past: boolean): Promise<unknown> {
  "use cache";
  if (past) cacheLife("max");
  else cacheLife("minutes");
  const token = tokens.get(profileId);
  if (!token) throw new Error("Move IQ: no token registered for this profile");
  return fetchWithToken(token, `/wellness-service/wellness/dailyEvents?calendarDate=${date}`, dailyEventsSchema);
}

async function moveIqDay(profileId: string, date: string, past: boolean): Promise<Activity[]> {
  return parseMoveIqEvents(await dailyEventsRaw(profileId, date, past), date);
}

/** Raw timeline payloads for a range, through the same cache (used by the debug route). */
export async function getDailyEventsRaw(range: DateRange): Promise<{ date: string; raw: unknown }[]> {
  const { session, token } = await getAuth();
  const profileId = session.profile.displayName;
  tokens.set(profileId, token);
  const todayIso = today().format(ISO_DATE);
  const out: { date: string; raw: unknown }[] = [];
  for (const date of daysOf(range)) out.push({ date, raw: await dailyEventsRaw(profileId, date, date < todayIso) });
  return out;
}

function daysOf(range: DateRange) {
  const days: string[] = [];
  for (let d = dayjs(range.from); !d.isAfter(dayjs(range.to)); d = d.add(1, "day")) days.push(d.format(ISO_DATE));
  return days;
}

const CONCURRENCY = 6;

export async function getMoveIqActivities(range: DateRange): Promise<Activity[]> {
  if (isDemo()) return demoMoveIq(range.from, range.to);

  const { session, token } = await getAuth();
  const profileId = session.profile.displayName;
  tokens.set(profileId, token);

  const todayIso = today().format(ISO_DATE);
  const days = daysOf(range);

  // Small worker pool: fast on a cold cache without hammering Garmin.
  const results: Activity[][] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, days.length) }, async () => {
      while (next < days.length) {
        const i = next++;
        const day = days[i]!;
        results[i] = await moveIqDay(profileId, day, day < todayIso);
      }
    }),
  );
  return results.flat();
}
