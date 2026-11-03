export const SPORT_CATEGORIES = ["run", "trail", "run_indoor", "bike", "bike_indoor", "swim", "other"] as const;
export type SportCategory = (typeof SPORT_CATEGORIES)[number];

export const SPORT_GROUPS = {
  all: SPORT_CATEGORIES,
  running: ["run", "trail", "run_indoor"],
  cycling: ["bike", "bike_indoor"],
} as const satisfies Record<string, readonly SportCategory[]>;

type SportMeta = { label: string; color: string };

/** One color per sport (CSS token from globals.css), reused across tiles, charts, lists and map. */
export const SPORTS: Record<SportCategory, SportMeta> = {
  run: { label: "Course sur route", color: "var(--sport-run)" },
  trail: { label: "Trail", color: "var(--sport-trail)" },
  run_indoor: { label: "Course indoor", color: "var(--sport-run_indoor)" },
  bike: { label: "Vélo", color: "var(--sport-bike)" },
  bike_indoor: { label: "Vélo indoor", color: "var(--sport-bike_indoor)" },
  swim: { label: "Natation", color: "var(--sport-swim)" },
  other: { label: "Autres (renfo, marche…)", color: "var(--sport-other)" },
};

const TYPE_TO_CATEGORY: Record<string, SportCategory> = {
  running: "run",
  street_running: "run",
  track_running: "run",
  trail_running: "trail",
  ultra_run: "trail",
  treadmill_running: "run_indoor",
  indoor_running: "run_indoor",
  cycling: "bike",
  road_biking: "bike",
  mountain_biking: "bike",
  gravel_cycling: "bike",
  cyclocross: "bike",
  e_bike_fitness: "bike",
  e_bike_mountain: "bike",
  indoor_cycling: "bike_indoor",
  virtual_ride: "bike_indoor",
  lap_swimming: "swim",
  open_water_swimming: "swim",
  swimming: "swim",
};

/** Maps a Garmin `activityType.typeKey` to a sport category. */
export function toSportCategory(typeKey: string): SportCategory {
  return TYPE_TO_CATEGORY[typeKey] ?? "other";
}
