import dayjs from "dayjs";
import "dayjs/locale/fr";
import isoWeek from "dayjs/plugin/isoWeek";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.locale("fr");

export const TIMEZONE = "Europe/Paris";
export const ISO_DATE = "YYYY-MM-DD";

/** Today in the app timezone (servers run in UTC). */
export const today = () => dayjs().tz(TIMEZONE).startOf("day");

export { dayjs };
