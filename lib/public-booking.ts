import "server-only";
import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { availableSlots, type Busy } from "@/lib/availability";
import { loyaltyStatus, type LoyaltyProgram } from "@/lib/loyalty";
import type { Pricing } from "@/lib/pricing";
import type { Driver, PaymentMethod } from "@/lib/types";

export type PublicDriver = Driver & {
  pricing: Pricing;
  methods: PaymentMethod[];
  loyalty: LoyaltyProgram | null;
};

export async function getPublicDriver(slug: string): Promise<PublicDriver | null> {
  const db = createAdminClient();
  const { data: d } = await db.from("drivers").select("*").eq("slug", slug.toLowerCase()).eq("onboarded", true).maybeSingle();
  if (!d) return null;
  const [{ data: pricing }, { data: methods }, { data: loyalty }] = await Promise.all([
    db.from("pricing").select("base, per_km, per_min, minimum").eq("driver_id", d.id).maybeSingle(),
    db.from("payment_methods_accepted").select("method").eq("driver_id", d.id),
    db.from("loyalty_programs").select("active, trips_required, discount_pct").eq("driver_id", d.id).maybeSingle(),
  ]);
  return {
    ...(d as Driver),
    pricing: pricing ?? { base: 0, per_km: 0, per_min: 0, minimum: 0 },
    methods: (methods ?? []).map((m) => m.method as PaymentMethod),
    loyalty: loyalty ?? null,
  };
}

/** Versión segura para enviar al navegador (sin email ni ajustes internos). */
export function toPublicProfile(d: PublicDriver) {
  return {
    slug: d.slug,
    full_name: d.full_name,
    bio: d.bio,
    photo_url: d.photo_url,
    vehicle: d.vehicle,
    currency: d.currency,
    timezone: d.timezone,
    max_days_ahead: d.max_days_ahead,
    methods: d.methods,
    loyalty: d.loyalty?.active ? { trips_required: d.loyalty.trips_required, discount_pct: Number(d.loyalty.discount_pct) } : null,
  };
}
export type PublicProfile = ReturnType<typeof toPublicProfile>;

export async function slotsFor(d: Driver, date: string, durationMin: number) {
  const db = createAdminClient();
  const dayStart = fromZonedTime(`${date}T00:00:00`, d.timezone);
  const from = addDays(dayStart, -1).toISOString();
  const to = addDays(dayStart, 2).toISOString();
  const [{ data: rules }, { data: exceptions }, { data: bookings }] = await Promise.all([
    db.from("availability_rules").select("weekday, start_time, end_time").eq("driver_id", d.id),
    db.from("availability_exceptions").select("date, is_blocked, start_time, end_time").eq("driver_id", d.id).eq("date", date),
    db
      .from("bookings")
      .select("start_at, busy_until")
      .eq("driver_id", d.id)
      .in("status", ["pending", "confirmed"])
      .lt("start_at", to)
      .gt("busy_until", from),
  ]);
  const busy: Busy[] = (bookings ?? []).map((b) => ({ start: new Date(b.start_at), end: new Date(b.busy_until) }));
  return availableSlots({
    date,
    timezone: d.timezone,
    rules: rules ?? [],
    exceptions: exceptions ?? [],
    busy,
    durationMin,
    bufferMin: d.buffer_minutes,
    stepMin: d.slot_step_minutes,
    minNoticeHours: d.min_notice_hours,
    maxDaysAhead: d.max_days_ahead,
  });
}

/** Estado de fidelización del cliente (por teléfono) con este chofer. */
export async function customerLoyalty(d: PublicDriver, phone: string) {
  if (!d.loyalty?.active) return loyaltyStatus(null, 0);
  const db = createAdminClient();
  const { data: c } = await db.from("customers").select("id").eq("driver_id", d.id).eq("phone", phone).maybeSingle();
  if (!c) return loyaltyStatus(d.loyalty, 0);
  const { count } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", c.id)
    .in("status", ["completed", "pending", "confirmed"]);
  return loyaltyStatus(d.loyalty, count ?? 0);
}
