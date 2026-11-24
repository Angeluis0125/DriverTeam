"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyDriver } from "@/lib/notify";
import { fmtDateTime } from "@/lib/format";
import { allow } from "@/lib/rate-limit";

export async function cancelByCustomer(f: FormData) {
  const token = String(f.get("token") ?? "");
  if (!/^[a-f0-9]{36}$/.test(token) || !(await allow("cancel", 10))) return;
  const db = createAdminClient();
  const { data: b } = await db
    .from("bookings")
    .select("id, driver_id, status, start_at, customers(full_name), drivers(slug, timezone)")
    .eq("manage_token", token)
    .single();
  if (!b || !["pending", "confirmed"].includes(b.status) || new Date(b.start_at) < new Date()) return;
  await db.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
  const c = b.customers as unknown as { full_name: string };
  const d = b.drivers as unknown as { slug: string; timezone: string };
  await notifyDriver({
    driverId: b.driver_id,
    bookingId: b.id,
    title: "Reserva cancelada por el cliente",
    body: `${c.full_name} canceló el viaje del ${fmtDateTime(b.start_at, d.timezone)}`,
  });
  revalidatePath(`/${d.slug}/r/${token}`);
}
