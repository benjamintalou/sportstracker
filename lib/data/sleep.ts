import "server-only";
import { cacheLife } from "next/cache";
import { ISO_DATE, today } from "@/lib/dates";
import { fetchWithToken } from "@/lib/garmin/client";
import { dailySleepSchema, parseNight, sleepPath } from "@/lib/garmin/sleep";
import type { DateRange } from "@/lib/period";
import type { Night } from "@/lib/sleep";
import { daysOf, mapDays, registerToken, tokenFor } from "./daily";
import { demoSleep, isDemo } from "./demo";

/**
 * Sleep needs one Garmin call per night, so each day is cached on the server like Move IQ
 * (past nights never change). Raw payload is cached so parser fixes apply to cached days.
 * The profile id is also Garmin's display name, which the endpoint path needs.
 */
async function dailySleepRaw(profileId: string, date: string, past: boolean): Promise<unknown> {
  "use cache";
  if (past) cacheLife("max");
  else cacheLife("minutes");
  return fetchWithToken(tokenFor(profileId), sleepPath(profileId, date), dailySleepSchema);
}

export async function getDailySleepRaw(date: string): Promise<unknown> {
  const profileId = await registerToken();
  return dailySleepRaw(profileId, date, date < today().format(ISO_DATE));
}

export async function getNights(range: DateRange): Promise<Night[]> {
  if (isDemo()) return demoSleep(range.from, range.to);

  const profileId = await registerToken();
  const todayIso = today().format(ISO_DATE);
  const nights = await mapDays(daysOf(range), async (day) => parseNight(await dailySleepRaw(profileId, day, day < todayIso), day));
  return nights.filter((n): n is Night => n !== null);
}
