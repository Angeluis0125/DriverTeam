import { addDays, addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type Rule = { weekday: number; start_time: string; end_time: string };
export type Exception = { date: string; is_blocked: boolean; start_time: string | null; end_time: string | null };
export type Busy = { start: Date; end: Date };

export type SlotInput = {
  date: string; // YYYY-MM-DD en la zona horaria del chofer
  timezone: string;
  rules: Rule[];
  exceptions: Exception[];
  busy: Busy[];
  durationMin: number;
  bufferMin: number;
  stepMin: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  now?: Date;
};

export type Slot = { start: string; label: string };

const hhmm = (t: string) => t.slice(0, 5);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Día de la semana (0 = domingo) de una fecha de calendario, sin depender de la zona horaria. */
export function weekdayOf(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Ventanas de trabajo del día: excepciones mandan sobre las reglas semanales. */
export function windowsFor(date: string, rules: Rule[], exceptions: Exception[]) {
  const ex = exceptions.filter((e) => e.date === date);
  if (ex.some((e) => e.is_blocked)) return [];
  if (ex.length) return ex.map((e) => ({ start: hhmm(e.start_time!), end: hhmm(e.end_time!) }));
  const wd = weekdayOf(date);
  return rules.filter((r) => r.weekday === wd).map((r) => ({ start: hhmm(r.start_time), end: hhmm(r.end_time) }));
}

/**
 * Horarios disponibles para iniciar un viaje de `durationMin`.
 * El viaje debe terminar dentro de la ventana; el bloque ocupado (viaje + buffer)
 * no puede traslaparse con otras reservas activas.
 */
export function availableSlots(i: SlotInput): Slot[] {
  if (!DATE_RE.test(i.date)) throw new Error("Fecha inválida");
  const now = i.now ?? new Date();
  const earliest = addMinutes(now, i.minNoticeHours * 60);
  const today = formatInTimeZone(now, i.timezone, "yyyy-MM-dd");
  const lastDay = formatInTimeZone(addDays(fromZonedTime(`${today}T12:00:00`, i.timezone), i.maxDaysAhead), i.timezone, "yyyy-MM-dd");
  if (i.date < today || i.date > lastDay) return [];

  const step = Math.max(5, i.stepMin);
  const seen = new Set<number>();
  const slots: Slot[] = [];

  for (const w of windowsFor(i.date, i.rules, i.exceptions)) {
    const wStart = fromZonedTime(`${i.date}T${w.start}:00`, i.timezone);
    const wEnd = fromZonedTime(`${i.date}T${w.end}:00`, i.timezone);
    for (let t = wStart; addMinutes(t, i.durationMin) <= wEnd; t = addMinutes(t, step)) {
      if (t < earliest || seen.has(t.getTime())) continue;
      const busyEnd = addMinutes(t, i.durationMin + i.bufferMin);
      const clash = i.busy.some((b) => t < b.end && b.start < busyEnd);
      if (clash) continue;
      seen.add(t.getTime());
      slots.push({ start: t.toISOString(), label: formatInTimeZone(t, i.timezone, "HH:mm") });
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}
