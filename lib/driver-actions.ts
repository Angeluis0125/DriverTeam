"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  BookingPrefsSchema, LoyaltySchema, MethodsSchema, PricingSchema, ProfileSchema, ScheduleSchema, checked,
} from "@/lib/validation";

export type FormState = { error?: string; ok?: string };

const first = (e: z.ZodError) => e.issues[0]?.message ?? "Datos inválidos";
const obj = (f: FormData) => Object.fromEntries(f.entries());

function parseSchedule(f: FormData) {
  try {
    return ScheduleSchema.safeParse(JSON.parse(String(f.get("schedule") ?? "[]")));
  } catch {
    return ScheduleSchema.safeParse(null);
  }
}

async function replaceSchedule(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], driverId: string, rows: z.infer<typeof ScheduleSchema>) {
  const del = await supabase.from("availability_rules").delete().eq("driver_id", driverId);
  if (del.error) return del.error.message;
  if (!rows.length) return null;
  const ins = await supabase.from("availability_rules").insert(rows.map((r) => ({ ...r, driver_id: driverId })));
  return ins.error?.message ?? null;
}

async function replaceMethods(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], driverId: string, methods: string[]) {
  await supabase.from("payment_methods_accepted").delete().eq("driver_id", driverId);
  const ins = await supabase.from("payment_methods_accepted").insert(methods.map((method) => ({ driver_id: driverId, method })));
  return ins.error?.message ?? null;
}

function slugTaken(msg: string | undefined) {
  return msg?.includes("drivers_slug_key") ? "Ese link ya está en uso, prueba otro" : msg;
}

export async function completeOnboarding(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const profile = ProfileSchema.safeParse(obj(f));
  if (!profile.success) return { error: first(profile.error) };
  const pricing = PricingSchema.safeParse(obj(f));
  if (!pricing.success) return { error: "Revisa las tarifas" };
  const methods = MethodsSchema.safeParse(f.getAll("methods"));
  if (!methods.success) return { error: first(methods.error) };
  const schedule = parseSchedule(f);
  if (!schedule.success) return { error: first(schedule.error) };
  if (!schedule.data.length) return { error: "Agrega al menos un día disponible" };

  const up = await supabase
    .from("drivers")
    .upsert({ id: user.id, email: user.email, ...profile.data, onboarded: true })
    .select("id")
    .single();
  if (up.error) return { error: slugTaken(up.error.message) };

  const results = await Promise.all([
    supabase.from("pricing").upsert({ driver_id: user.id, ...pricing.data }),
    supabase.from("loyalty_programs").upsert({ driver_id: user.id }, { onConflict: "driver_id", ignoreDuplicates: true }),
  ]);
  const err = results.find((r) => r.error)?.error?.message ?? (await replaceMethods(supabase, user.id, methods.data)) ?? (await replaceSchedule(supabase, user.id, schedule.data));
  if (err) return { error: err };
  redirect("/dashboard?welcome=1");
}

export async function saveProfile(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const p = ProfileSchema.safeParse(obj(f));
  if (!p.success) return { error: first(p.error) };
  const { error } = await supabase.from("drivers").update(p.data).eq("id", user.id);
  if (error) return { error: slugTaken(error.message) };
  revalidatePath("/dashboard", "layout");
  return { ok: "Perfil guardado" };
}

export async function savePricing(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const p = PricingSchema.safeParse(obj(f));
  if (!p.success) return { error: "Revisa las tarifas" };
  const m = MethodsSchema.safeParse(f.getAll("methods"));
  if (!m.success) return { error: first(m.error) };
  const { error } = await supabase.from("pricing").upsert({ driver_id: user.id, ...p.data });
  const err = error?.message ?? (await replaceMethods(supabase, user.id, m.data));
  if (err) return { error: err };
  revalidatePath("/dashboard/settings");
  return { ok: "Tarifas y métodos de pago guardados" };
}

export async function saveBookingPrefs(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const p = BookingPrefsSchema.safeParse({ ...obj(f), auto_confirm: checked(f, "auto_confirm") });
  if (!p.success) return { error: "Revisa las preferencias" };
  const { error } = await supabase
    .from("drivers")
    .update({ ...p.data, notify_email: checked(f, "notify_email") })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return { ok: "Preferencias guardadas" };
}

export async function saveSchedule(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const s = parseSchedule(f);
  if (!s.success) return { error: first(s.error) };
  const err = await replaceSchedule(supabase, user.id, s.data);
  if (err) return { error: err };
  revalidatePath("/dashboard/settings");
  return { ok: "Horario guardado" };
}

const ExceptionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha"),
    kind: z.enum(["blocked", "special"]),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    note: z.string().trim().max(120).optional(),
  })
  .refine((e) => e.kind === "blocked" || (e.start_time && e.end_time && e.end_time > e.start_time), "Indica un horario válido");

export async function addException(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const e = ExceptionSchema.safeParse(obj(f));
  if (!e.success) return { error: first(e.error) };
  const blocked = e.data.kind === "blocked";
  const { error } = await supabase.from("availability_exceptions").insert({
    driver_id: user.id,
    date: e.data.date,
    is_blocked: blocked,
    start_time: blocked ? null : e.data.start_time,
    end_time: blocked ? null : e.data.end_time,
    note: e.data.note || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return { ok: "Excepción agregada" };
}

export async function deleteException(f: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("availability_exceptions").delete().eq("id", String(f.get("id"))).eq("driver_id", user.id);
  revalidatePath("/dashboard/settings");
}

export async function saveLoyalty(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const l = LoyaltySchema.safeParse({ ...obj(f), active: checked(f, "active") });
  if (!l.success) return { error: "Revisa el programa de fidelización" };
  const { error } = await supabase.from("loyalty_programs").upsert({ driver_id: user.id, ...l.data });
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { ok: "Programa de fidelización guardado" };
}
