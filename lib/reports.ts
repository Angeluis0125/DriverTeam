import "server-only";
import { addDays, eachDayOfInterval, startOfMonth, subMonths, endOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import type { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/types";

export const RANGES = { week: "Esta semana", month: "Este mes", last_month: "Mes pasado", "30d": "Últimos 30 días" } as const;
export type RangeKey = keyof typeof RANGES;

const d = (x: Date) => formatInTimeZone(x, "UTC", "yyyy-MM-dd");

export function resolveRange(tz: string, key?: string, from?: string, to?: string) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (from && to && re.test(from) && re.test(to) && from <= to) return { key: "custom" as const, from, to };
  const local = toZonedTime(new Date(), tz);
  const today = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  const k = (key && key in RANGES ? key : "month") as RangeKey;
  switch (k) {
    case "week":
      return { key: k, from: d(startOfWeek(today, { weekStartsOn: 1 })), to: d(today) };
    case "last_month": {
      const lm = subMonths(today, 1);
      return { key: k, from: d(startOfMonth(lm)), to: d(endOfMonth(lm)) };
    }
    case "30d":
      return { key: k, from: d(addDays(today, -29)), to: d(today) };
    default:
      return { key: k, from: d(startOfMonth(today)), to: d(today) };
  }
}

export type Report = Awaited<ReturnType<typeof buildReport>>;

export async function buildReport(supabase: Awaited<ReturnType<typeof createClient>>, from: string, to: string) {
  const [{ data: income }, { data: expenses }] = await Promise.all([
    supabase.rpc("income_report", { p_from: from, p_to: to }),
    supabase.from("expenses").select("id, category, amount, spent_on, note").gte("spent_on", from).lte("spent_on", to).order("spent_on", { ascending: false }),
  ]);
  const rows = (income ?? []) as { day: string; method: PaymentMethod; total: number; tips: number; trips: number }[];

  const byDay = new Map<string, number>();
  const byMethod = new Map<PaymentMethod, { total: number; trips: number }>();
  let gross = 0, tips = 0, trips = 0;
  for (const r of rows) {
    const t = Number(r.total) + Number(r.tips);
    gross += Number(r.total);
    tips += Number(r.tips);
    trips += Number(r.trips);
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + t);
    const m = byMethod.get(r.method) ?? { total: 0, trips: 0 };
    byMethod.set(r.method, { total: m.total + t, trips: m.trips + Number(r.trips) });
  }
  const spent = (expenses ?? []).reduce((a, e) => a + Number(e.amount), 0);
  const days = eachDayOfInterval({ start: new Date(`${from}T00:00:00Z`), end: new Date(`${to}T00:00:00Z`) }).map((x) => {
    const key = formatInTimeZone(x, "UTC", "yyyy-MM-dd");
    return { day: key, total: byDay.get(key) ?? 0 };
  });

  return {
    gross, tips, trips, spent,
    income: gross + tips,
    net: gross + tips - spent,
    avg: trips ? (gross + tips) / trips : 0,
    days,
    methods: [...byMethod.entries()].map(([method, v]) => ({ method, ...v })).sort((a, b) => b.total - a.total),
    expenses: expenses ?? [],
  };
}
