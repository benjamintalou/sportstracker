import { NextResponse, type NextRequest } from "next/server";
import { getDailySleepRaw } from "@/lib/data/sleep";
import { GarminError } from "@/lib/garmin/errors";
import { parseNight } from "@/lib/garmin/sleep";

/** Dev-only sleep diagnostics: `?date=YYYY-MM-DD` returns Garmin's raw payload next to the parsed night. */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });

  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Utiliser ?date=YYYY-MM-DD" }, { status: 400 });

  try {
    const raw = await getDailySleepRaw(date);
    return NextResponse.json({ date, parsed: parseNight(raw, date), raw });
  } catch (error) {
    const code = error instanceof GarminError ? error.code : "unexpected";
    return NextResponse.json({ error: code, message: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
