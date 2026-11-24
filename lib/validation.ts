import { z } from "zod";

const money = z.coerce.number().min(0).max(1_000_000);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");

export const RESERVED_SLUGS = new Set([
  "api", "auth", "login", "signup", "dashboard", "onboarding", "admin", "app", "www", "static", "_next",
  "manifest", "sw", "favicon", "robots", "sitemap", "terminos", "privacidad", "ayuda",
]);

export const ProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Escribe tu nombre").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "El link solo puede tener letras, números y guiones (3–40)")
    .refine((s) => !RESERVED_SLUGS.has(s), "Ese link está reservado"),
  phone: z.string().trim().max(25).optional().default(""),
  vehicle: z.string().trim().max(120).optional().default(""),
  bio: z.string().trim().max(400).optional().default(""),
  photo_url: z.union([z.url().max(500), z.literal("")]).optional().default(""),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("MXN"),
  timezone: z.string().trim().min(3).max(64).refine(isValidTz, "Zona horaria inválida"),
});

export const PricingSchema = z.object({ base: money, per_km: money, per_min: money, minimum: money });

export const METHODS = ["cash", "card", "terminal", "transfer"] as const;
export const MethodsSchema = z.array(z.enum(METHODS)).min(1, "Elige al menos un método de pago");

export const BookingPrefsSchema = z.object({
  auto_confirm: z.coerce.boolean(),
  buffer_minutes: z.coerce.number().int().min(0).max(240),
  min_notice_hours: z.coerce.number().int().min(0).max(168),
  max_days_ahead: z.coerce.number().int().min(1).max(365),
  slot_step_minutes: z.coerce.number().int().refine((n) => [15, 30, 60].includes(n)),
});

export const ScheduleSchema = z
  .array(z.object({ weekday: z.number().int().min(0).max(6), start_time: time, end_time: time }))
  .max(50)
  .refine((rows) => rows.every((r) => r.end_time > r.start_time), "La hora de fin debe ser posterior al inicio");

export const LoyaltySchema = z.object({
  active: z.coerce.boolean(),
  trips_required: z.coerce.number().int().min(1).max(100),
  discount_pct: z.coerce.number().min(1).max(100),
});

export function isValidTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Lee un checkbox de FormData como booleano. */
export const checked = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

export const EXPENSE_CATEGORIES = ["Gasolina", "Mantenimiento", "Lavado", "Casetas", "Estacionamiento", "Seguro", "Celular", "Otro"];
