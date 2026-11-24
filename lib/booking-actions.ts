"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDriver } from "@/lib/auth";
import { sendEmail, escapeHtml } from "@/lib/notify";
import { fmtDateTime } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { METHODS } from "@/lib/validation";
import type { BookingStatus } from "@/lib/types";
import type { FormState } from "@/lib/driver-actions";

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  rejected: [],
  cancelled: [],
  no_show: [],
};

const CUSTOMER_MSG: Partial<Record<BookingStatus, string>> = {
  confirmed: "confirmó tu reserva",
  rejected: "no puede atender tu reserva",
  cancelled: "canceló tu reserva",
};

function refresh(id: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/dashboard/bookings/${id}`);
}

export async function changeStatus(f: FormData) {
  const id = String(f.get("id"));
  const to = String(f.get("status")) as BookingStatus;
  const { supabase, driver } = await requireDriver();
  const { data: b } = await supabase
    .from("bookings")
    .select("id, status, start_at, manage_token, pickup_address, dropoff_address, customers(full_name, email)")
    .eq("id", id)
    .single();
  if (!b || !TRANSITIONS[b.status as BookingStatus]?.includes(to)) return;

  const { error } = await supabase.from("bookings").update({ status: to }).eq("id", id);
  if (error) throw new Error(error.message);

  const c = b.customers as unknown as { full_name: string; email: string | null } | null;
  const msg = CUSTOMER_MSG[to];
  if (c?.email && msg) {
    await sendEmail(
      c.email,
      `${driver.full_name} ${msg}`,
      `<p>Hola ${escapeHtml(c.full_name)}, ${escapeHtml(driver.full_name)} ${msg} del <b>${fmtDateTime(b.start_at, driver.timezone)}</b>.</p>
       <p>${escapeHtml(b.pickup_address)} → ${escapeHtml(b.dropoff_address)}</p>
       <p><a href="${siteUrl()}/${driver.slug}/r/${b.manage_token}">Ver reserva</a></p>`,
    );
  }
  refresh(id);
}

const PaymentSchema = z.object({
  booking_id: z.uuid(),
  amount: z.coerce.number().min(0).max(1_000_000),
  tip: z.coerce.number().min(0).max(1_000_000).default(0),
  method: z.enum(METHODS),
  note: z.string().trim().max(300).optional(),
});

/** Registra (o corrige) el pago de un viaje y lo marca como completado. No cobra nada: solo deja constancia. */
export async function recordPayment(_: FormState, f: FormData): Promise<FormState> {
  const p = PaymentSchema.safeParse(Object.fromEntries(f.entries()));
  if (!p.success) return { error: "Revisa el monto y el método" };
  const { supabase, driver } = await requireDriver();
  const { data: b } = await supabase.from("bookings").select("id, status").eq("id", p.data.booking_id).single();
  if (!b) return { error: "Reserva no encontrada" };
  if (!["confirmed", "completed"].includes(b.status)) return { error: "Primero confirma la reserva" };

  const { error } = await supabase.from("payments").upsert(
    { driver_id: driver.id, booking_id: b.id, amount: p.data.amount, tip: p.data.tip, method: p.data.method, note: p.data.note || null },
    { onConflict: "booking_id" },
  );
  if (error) return { error: error.message };
  await supabase.from("bookings").update({ status: "completed", final_price: p.data.amount }).eq("id", b.id);
  refresh(b.id);
  return { ok: "Pago registrado" };
}

export async function saveDriverNotes(f: FormData) {
  const id = String(f.get("id"));
  const { supabase } = await requireDriver();
  await supabase.from("bookings").update({ driver_notes: String(f.get("driver_notes") ?? "").slice(0, 1000) || null }).eq("id", id);
  refresh(id);
}
