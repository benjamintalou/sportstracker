"use server";

import { getSession } from "@/lib/session";
import { isDemo } from "@/lib/data/demo";
import { saveSpeeds, speedsSchema } from "@/lib/prefs";

export type SpeedsState = { ok?: boolean; error?: string };

export async function updateMoveIqSpeeds(_prev: SpeedsState, formData: FormData): Promise<SpeedsState> {
  if (!isDemo() && !(await getSession())) return { error: "Session expirée." };

  // Inputs submit their formatted text ("18,5 km/h"): keep the number only.
  const values = Object.fromEntries(
    [...formData].map(([key, value]) => [key, String(value).replace(",", ".").replace(/[^\d.]/g, "")]),
  );
  const parsed = speedsSchema.safeParse(values);
  if (!parsed.success) return { error: "Vitesses entre 0 et 60 km/h." };

  await saveSpeeds(parsed.data);
  return { ok: true };
}
