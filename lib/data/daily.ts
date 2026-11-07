import "server-only";
import { ISO_DATE, dayjs } from "@/lib/dates";
import { getAuth } from "@/lib/garmin/client";
import type { AccessToken } from "@/lib/garmin/tokens";
import type { DateRange } from "@/lib/period";

/**
 * Shared plumbing for Garmin endpoints that need one call per day (Move IQ, sleep).
 * Days are cached on the server with `'use cache'`, keyed by profile id + date only:
 * the token is handed over through this module-level map, never as a cache argument,
 * because cache keys are stored in plain text.
 */
const tokens = new Map<string, AccessToken>();

/** Registers the current session's token and returns the profile id to key cached days with. */
export async function registerToken(): Promise<string> {
  const { session, token } = await getAuth();
  const profileId = session.profile.displayName;
  tokens.set(profileId, token);
  return profileId;
}

export function tokenFor(profileId: string): AccessToken {
  const token = tokens.get(profileId);
  if (!token) throw new Error("No Garmin token registered for this profile");
  return token;
}

export function daysOf(range: DateRange): string[] {
  const days: string[] = [];
  for (let d = dayjs(range.from); !d.isAfter(dayjs(range.to)); d = d.add(1, "day")) days.push(d.format(ISO_DATE));
  return days;
}

const CONCURRENCY = 6;

/** Small worker pool: fast on a cold cache without hammering Garmin. Results keep the input order. */
export async function mapDays<T>(days: string[], fn: (day: string) => Promise<T>): Promise<T[]> {
  const results: T[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, days.length) }, async () => {
      while (next < days.length) {
        const i = next++;
        results[i] = await fn(days[i]!);
      }
    }),
  );
  return results;
}
