import { SPORT_CATEGORIES, SPORT_GROUPS, type SportCategory } from "./sports";

/** Activity normalized from Garmin, with every duration in seconds and distances in meters. */
export type Activity = {
  id: number;
  name: string;
  /** Local start, "YYYY-MM-DD HH:mm:ss" */
  startLocal: string;
  /** Local start date, "YYYY-MM-DD" */
  date: string;
  typeKey: string;
  category: SportCategory;
  /** "device": recorded on the watch; "moveiq": detected automatically (timeline only, duration only) */
  source: "device" | "moveiq";
  movingTime: number;
  elapsedTime: number;
  distance: number;
  elevationGain: number;
  averageSpeed: number | null;
  averageHR: number | null;
  maxHR: number | null;
  calories: number | null;
  location: string | null;
  /** Seconds in HR zones 1–5, null when the device didn't record HR */
  hrZones: [number, number, number, number, number] | null;
};

export type SportFilter = keyof typeof SPORT_GROUPS | SportCategory;

export const SPORT_FILTERS: { value: SportFilter; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "running", label: "Course" },
  { value: "cycling", label: "Vélo" },
  { value: "swim", label: "Natation" },
  { value: "other", label: "Autres" },
];

export function parseSportFilter(value: unknown): SportFilter {
  if (typeof value !== "string") return "all";
  if (value in SPORT_GROUPS || (SPORT_CATEGORIES as readonly string[]).includes(value)) return value as SportFilter;
  return "all";
}

export function matchesSport(activity: Activity, filter: SportFilter) {
  const group: readonly SportCategory[] = filter in SPORT_GROUPS ? SPORT_GROUPS[filter as keyof typeof SPORT_GROUPS] : [filter as SportCategory];
  return group.includes(activity.category);
}

/** Pace makes sense for foot sports, speed for the rest. */
export const usesPace = (category: SportCategory) => category === "run" || category === "trail" || category === "run_indoor";
