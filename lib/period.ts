import { ISO_DATE, dayjs, today } from "./dates";

export const PRESETS = {
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
  "30d": "30 derniers jours",
  "12m": "12 derniers mois",
  custom: "Personnalisé",
} as const;

export type Preset = keyof typeof PRESETS;
export type DateRange = { from: string; to: string };
export type Period = DateRange & { preset: Preset; label: string; previous: DateRange; previousLabel: string };

export const DEFAULT_PRESET = "month" satisfies Preset;

const isPreset = (value: unknown): value is Preset => typeof value === "string" && value in PRESETS;
const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value, ISO_DATE).isValid();

const fmt = (d: dayjs.Dayjs) => d.format(ISO_DATE);

/**
 * Resolves the period from URL search params. Calendar presets run "to date"
 * and compare against the same span of the previous week/month/year,
 * so a half-done month is not compared to a full one.
 */
export function parsePeriod(params: { preset?: string | string[]; from?: string | string[]; to?: string | string[] }): Period {
  const now = today();
  const { from, to } = params;

  if (isIsoDate(from) && isIsoDate(to)) {
    const [start, end] = [dayjs(from), dayjs(to)].sort((a, b) => a.valueOf() - b.valueOf()) as [dayjs.Dayjs, dayjs.Dayjs];
    const days = end.diff(start, "day") + 1;
    return {
      preset: "custom",
      from: fmt(start),
      to: fmt(end),
      label: `${start.format("D MMM YYYY")} – ${end.format("D MMM YYYY")}`,
      previous: { from: fmt(start.subtract(days, "day")), to: fmt(start.subtract(1, "day")) },
      previousLabel: `les ${days} jours précédents`,
    };
  }

  const requested = params.preset;
  const preset: Exclude<Preset, "custom"> = isPreset(requested) && requested !== "custom" ? requested : DEFAULT_PRESET;

  if (preset === "30d" || preset === "12m") {
    const start = preset === "30d" ? now.subtract(29, "day") : now.subtract(12, "month").add(1, "day");
    const days = now.diff(start, "day") + 1;
    return {
      preset,
      from: fmt(start),
      to: fmt(now),
      label: PRESETS[preset],
      previous: { from: fmt(start.subtract(days, "day")), to: fmt(start.subtract(1, "day")) },
      previousLabel: preset === "30d" ? "les 30 jours précédents" : "les 12 mois précédents",
    };
  }

  const { startOf, step, previousLabel } = CALENDAR[preset];
  const start = now.startOf(startOf);
  return {
    preset,
    from: fmt(start),
    to: fmt(now),
    label: PRESETS[preset],
    previous: { from: fmt(start.subtract(1, step)), to: fmt(now.subtract(1, step)) },
    previousLabel,
  };
}

const CALENDAR = {
  week: { startOf: "isoWeek", step: "week", previousLabel: "la semaine dernière" },
  month: { startOf: "month", step: "month", previousLabel: "le mois dernier" },
  year: { startOf: "year", step: "year", previousLabel: "l'année dernière" },
} as const;

export const inRange = (date: string, range: DateRange) => date >= range.from && date <= range.to;

/** Number of calendar days in the range, both ends included. */
export const daysIn = (range: DateRange) => dayjs(range.to).diff(dayjs(range.from), "day") + 1;
