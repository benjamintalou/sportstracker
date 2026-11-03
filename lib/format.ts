const number = (digits: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const int = number(0);
const one = number(1);

/** 45296 → "12 h 34 min"; 754 → "12 min 34 s". */
export function formatDuration(seconds: number) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${int.format(h)} h ${String(m).padStart(2, "0")} min`;
  if (m > 0) return `${m} min ${String(s % 60).padStart(2, "0")} s`;
  return `${s} s`;
}

/** Compact clock form for tables: 1:02:03 or 12:34. */
export function formatClock(seconds: number) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const formatKm = (meters: number) => `${(meters >= 100_000 ? int : one).format(meters / 1000)} km`;
export const formatMeters = (meters: number) => `${int.format(meters)} m`;
export const formatCount = (n: number) => int.format(n);
/** Counts that can be fractional (averages): "0,4". */
export const formatDecimal = (n: number) => (n >= 10 ? int : one).format(n);
export const formatPercent = (ratio: number) => `${int.format(ratio * 100)} %`;

/** Running pace from m/s: "5:12 /km". */
export function formatPace(metersPerSecond: number | null) {
  if (!metersPerSecond || metersPerSecond <= 0) return "—";
  const secPerKm = 1000 / metersPerSecond;
  return `${formatClock(secPerKm)} /km`;
}

/** Cycling speed from m/s: "28,4 km/h". */
export function formatSpeed(metersPerSecond: number | null) {
  if (!metersPerSecond || metersPerSecond <= 0) return "—";
  return `${one.format(metersPerSecond * 3.6)} km/h`;
}
