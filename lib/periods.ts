import { addDays, startOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** Inicio (UTC) de hoy, semana (lunes) y mes en la zona horaria del chofer. */
export function periodStarts(tz: string, now = new Date()) {
  const local = toZonedTime(now, tz);
  const toUtc = (d: Date) => fromZonedTime(`${formatInTimeZone(d, "UTC", "yyyy-MM-dd")}T00:00:00`, tz);
  const day = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  return {
    today: toUtc(day),
    tomorrow: toUtc(addDays(day, 1)),
    week: toUtc(new Date(Date.UTC(...ymd(startOfWeek(local, { weekStartsOn: 1 }))))),
    month: toUtc(new Date(Date.UTC(...ymd(startOfMonth(local))))),
  };
}
const ymd = (d: Date) => [d.getFullYear(), d.getMonth(), d.getDate()] as const;

export function localDate(d: Date, tz: string) {
  return formatInTimeZone(d, tz, "yyyy-MM-dd");
}
