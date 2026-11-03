import { NextResponse, type NextRequest } from "next/server";
import { getDailyEventsRaw } from "@/lib/data/moveiq";
import { dayjs } from "@/lib/dates";
import { GarminError } from "@/lib/garmin/errors";
import { eventsOf, parseMoveIqEvents } from "@/lib/garmin/moveiq";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 62;

/**
 * Dev-only Move IQ diagnostics.
 * - ?date=YYYY-MM-DD: raw Garmin timeline for one day next to the parsed events.
 * - ?from=YYYY-MM-DD&to=YYYY-MM-DD: compact per-day summary (raw vs parsed),
 *   with every field name and type value seen, plus one raw sample.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });

  const q = request.nextUrl.searchParams;
  const date = q.get("date");
  const from = date ?? q.get("from") ?? "";
  const to = date ?? q.get("to") ?? "";
  if (!ISO.test(from) || !ISO.test(to) || from > to) {
    return NextResponse.json({ error: "Utiliser ?date=YYYY-MM-DD ou ?from=YYYY-MM-DD&to=YYYY-MM-DD" }, { status: 400 });
  }
  if (dayjs(to).diff(dayjs(from), "day") >= MAX_DAYS) {
    return NextResponse.json({ error: `${MAX_DAYS} jours maximum` }, { status: 400 });
  }

  try {
    const days = await getDailyEventsRaw({ from, to });

    if (date) {
      const raw = days[0]?.raw;
      return NextResponse.json({ date, parsed: parseMoveIqEvents(raw, date), raw });
    }

    const keys = new Set<string>();
    const typeValues: Record<string, number> = {};
    let sample: unknown = null;
    const perDay = days.map(({ date: day, raw }) => {
      const items = eventsOf(raw);
      for (const item of items) {
        sample ??= item;
        for (const [key, value] of Object.entries(item)) {
          keys.add(key);
          if (/type/i.test(key)) {
            const v = typeof value === "string" ? value : (value as { typeKey?: unknown } | null)?.typeKey;
            if (typeof v === "string") typeValues[`${key}=${v}`] = (typeValues[`${key}=${v}`] ?? 0) + 1;
          }
        }
      }
      const parsed = parseMoveIqEvents(raw, day);
      return {
        date: day,
        rawShape: Array.isArray(raw) ? "array" : raw === null ? "null" : typeof raw,
        rawItems: items.length,
        parsed: parsed.length,
        parsedMinutes: Math.round(parsed.reduce((s, a) => s + a.movingTime, 0) / 60),
      };
    });

    return NextResponse.json({
      from,
      to,
      totals: {
        days: perDay.length,
        daysWithRawItems: perDay.filter((d) => d.rawItems > 0).length,
        rawItems: perDay.reduce((s, d) => s + d.rawItems, 0),
        parsed: perDay.reduce((s, d) => s + d.parsed, 0),
        parsedHours: Math.round(perDay.reduce((s, d) => s + d.parsedMinutes, 0) / 6) / 10,
      },
      typeValues,
      keysSeen: [...keys].sort(),
      sample,
      days: perDay,
    });
  } catch (error) {
    const code = error instanceof GarminError ? error.code : "unexpected";
    return NextResponse.json({ error: code, message: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
