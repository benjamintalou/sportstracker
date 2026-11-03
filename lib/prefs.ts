import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

/** Average speeds (km/h) used to estimate the distance of Move IQ events, which have none. */
export const SPEED_KEYS = ["cycling", "walking", "running", "lap_swimming"] as const;
export type SpeedKey = (typeof SPEED_KEYS)[number];
export type Speeds = Record<SpeedKey, number>;

export const DEFAULT_SPEEDS: Speeds = { cycling: 15, walking: 5, running: 10, lap_swimming: 2 };

const speed = z.coerce.number().min(0).max(60);
export const speedsSchema = z.object({ cycling: speed, walking: speed, running: speed, lap_swimming: speed });

const COOKIE = "gt_prefs";

export async function getSpeeds(): Promise<Speeds> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return DEFAULT_SPEEDS;
  try {
    const parsed = speedsSchema.partial().safeParse(JSON.parse(raw));
    return parsed.success ? { ...DEFAULT_SPEEDS, ...parsed.data } : DEFAULT_SPEEDS;
  } catch {
    return DEFAULT_SPEEDS;
  }
}

export async function saveSpeeds(speeds: Speeds) {
  (await cookies()).set(COOKIE, JSON.stringify(speeds), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 5,
  });
}
