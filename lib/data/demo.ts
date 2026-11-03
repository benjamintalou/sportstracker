import type { Activity } from "@/lib/activity";
import { dayjs } from "@/lib/dates";
import type { SportCategory } from "@/lib/sports";

/** Dev-only: `GARMIN_DEMO=1 npm run dev` serves generated data without a Garmin session. */
export const isDemo = () => process.env.GARMIN_DEMO === "1" && process.env.NODE_ENV !== "production";

// Small deterministic PRNG so a given day always yields the same activities.
function rng(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Template = { category: SportCategory; typeKey: string; name: string; minutes: [number, number]; speed: number; stops: number; climb: number };

const TEMPLATES: Template[] = [
  { category: "run", typeKey: "running", name: "Footing", minutes: [35, 70], speed: 3.0, stops: 0.06, climb: 4 },
  { category: "run", typeKey: "running", name: "Fractionné", minutes: [45, 65], speed: 3.3, stops: 0.15, climb: 3 },
  { category: "trail", typeKey: "trail_running", name: "Trail", minutes: [70, 200], speed: 2.3, stops: 0.12, climb: 45 },
  { category: "run_indoor", typeKey: "treadmill_running", name: "Tapis", minutes: [30, 50], speed: 3.1, stops: 0.01, climb: 0 },
  { category: "bike", typeKey: "road_biking", name: "Sortie vélo", minutes: [90, 240], speed: 8.1, stops: 0.14, climb: 12 },
  { category: "bike_indoor", typeKey: "virtual_ride", name: "Home trainer", minutes: [45, 90], speed: 9, stops: 0.01, climb: 6 },
  { category: "swim", typeKey: "lap_swimming", name: "Natation", minutes: [35, 60], speed: 0.75, stops: 0.2, climb: 0 },
  { category: "other", typeKey: "strength_training", name: "Renforcement", minutes: [25, 50], speed: 0, stops: 0, climb: 0 },
];
const WEIGHTS = [26, 10, 7, 4, 20, 10, 9, 14];

function pick(r: () => number): Template {
  let roll = r() * WEIGHTS.reduce((a, b) => a + b, 0);
  for (const [i, w] of WEIGHTS.entries()) if ((roll -= w) < 0) return TEMPLATES[i]!;
  return TEMPLATES[0]!;
}

export function demoActivities(from: string, to: string): Activity[] {
  const out: Activity[] = [];
  for (let d = dayjs(to); !d.isBefore(dayjs(from)); d = d.subtract(1, "day")) {
    const r = rng(Number(d.format("YYYYMMDD")));
    const sessions = r() < 0.32 ? 0 : r() < 0.85 ? 1 : 2;
    for (let s = 0; s < sessions; s++) {
      const t = pick(r);
      const moving = Math.round((t.minutes[0] + r() * (t.minutes[1] - t.minutes[0])) * 60);
      const elapsed = Math.round(moving * (1 + t.stops * (0.5 + r())));
      const distance = t.speed * moving * (0.9 + r() * 0.2);
      const hour = s === 0 ? 7 + Math.floor(r() * 3) : 17 + Math.floor(r() * 3);
      const zoneSplit = [0.08, 0.42, 0.3, 0.15, 0.05].map((z) => z * (0.7 + r() * 0.6));
      const zoneSum = zoneSplit.reduce((a, b) => a + b, 0);
      out.push({
        id: Number(d.format("YYYYMMDD")) * 10 + s,
        name: t.name,
        startLocal: `${d.format("YYYY-MM-DD")} ${String(hour).padStart(2, "0")}:${String(Math.floor(r() * 60)).padStart(2, "0")}:00`,
        date: d.format("YYYY-MM-DD"),
        typeKey: t.typeKey,
        category: t.category,
        source: "device",
        movingTime: moving,
        elapsedTime: elapsed,
        distance: Math.round(distance),
        elevationGain: Math.round((distance / 1000) * t.climb * (0.5 + r())),
        averageSpeed: t.speed > 0 ? distance / moving : null,
        averageHR: t.category === "swim" ? null : Math.round(125 + r() * 35),
        maxHR: t.category === "swim" ? null : Math.round(160 + r() * 25),
        calories: Math.round(moving / 60 * (8 + r() * 5)),
        location: t.category.endsWith("indoor") ? null : "Lyon",
        hrZones: t.category === "swim" ? null : (zoneSplit.map((z) => Math.round((z / zoneSum) * moving)) as Activity["hrZones"]),
      });
    }
  }
  return out;
}

/** Weekday bike commutes and a few walks, as Move IQ would detect them. */
export function demoMoveIq(from: string, to: string): Activity[] {
  const out: Activity[] = [];
  for (let d = dayjs(to); !d.isBefore(dayjs(from)); d = d.subtract(1, "day")) {
    const r = rng(Number(d.format("YYYYMMDD")) + 7);
    const date = d.format("YYYY-MM-DD");
    const commute = d.day() >= 1 && d.day() <= 5 && r() < 0.7;
    const events: [string, string, SportCategory, string, number][] = [];
    if (commute) {
      events.push(["08:1" + Math.floor(r() * 10), "cycling", "bike", "Vélo (Move IQ)", 900 + r() * 900]);
      events.push(["18:0" + Math.floor(r() * 10), "cycling", "bike", "Vélo (Move IQ)", 900 + r() * 900]);
    }
    if (r() < 0.35) events.push(["12:3" + Math.floor(r() * 10), "walking", "other", "Marche (Move IQ)", 600 + r() * 1500]);
    events.forEach(([time, typeKey, category, name, seconds], i) => {
      const s = Math.round(seconds);
      out.push({
        id: Number(d.format("YYYYMMDD")) * 100 + 50 + i,
        name,
        startLocal: `${date} ${time}:00`,
        date,
        typeKey,
        category,
        source: "moveiq",
        movingTime: s,
        elapsedTime: s,
        distance: 0,
        elevationGain: 0,
        averageSpeed: null,
        averageHR: null,
        maxHR: null,
        calories: null,
        location: null,
        hrZones: null,
      });
    });
  }
  return out;
}
