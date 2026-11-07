import "server-only";
import { cacheLife } from "next/cache";
import type { Activity } from "@/lib/activity";
import { ISO_DATE, today } from "@/lib/dates";
import { fetchWithToken } from "@/lib/garmin/client";
import { dailyEventsSchema, parseMoveIqEvents } from "@/lib/garmin/moveiq";
import type { DateRange } from "@/lib/period";
import { daysOf, mapDays, registerToken, tokenFor } from "./daily";
import { demoMoveIq, isDemo } from "./demo";

/**
 * Move IQ needs one Garmin call per day, so each day is cached on the server
 * (past days never change). See `./daily` for how the token reaches the cached function.
 * Raw payload is cached (not parsed events), so parser fixes apply to already-cached days.
 */
async function dailyEventsRaw(profileId: string, date: string, past: boolean): Promise<unknown> {
  "use cache";
  if (past) cacheLife("max");
  else cacheLife("minutes");
  return fetchWithToken(tokenFor(profileId), `/wellness-service/wellness/dailyEvents?calendarDate=${date}`, dailyEventsSchema);
}

/** Raw timeline payloads for a range, through the same cache (used by the debug route). */
export async function getDailyEventsRaw(range: DateRange): Promise<{ date: string; raw: unknown }[]> {
  const profileId = await registerToken();
  const todayIso = today().format(ISO_DATE);
  const out: { date: string; raw: unknown }[] = [];
  for (const date of daysOf(range)) out.push({ date, raw: await dailyEventsRaw(profileId, date, date < todayIso) });
  return out;
}

export async function getMoveIqActivities(range: DateRange): Promise<Activity[]> {
  if (isDemo()) return demoMoveIq(range.from, range.to);

  const profileId = await registerToken();
  const todayIso = today().format(ISO_DATE);
  const days = await mapDays(daysOf(range), async (day) =>
    parseMoveIqEvents(await dailyEventsRaw(profileId, day, day < todayIso), day),
  );
  return days.flat();
}
