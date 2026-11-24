import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyDriver } from "@/lib/notify";
import { fmtTime } from "@/lib/format";
import { periodStarts } from "@/lib/periods";

export const maxDuration = 60;

/**
 * Cron diario (vercel.json):
 * 1. Las reservas pendientes cuya hora ya pasó se marcan como canceladas.
 * 2. Cada chofer con viajes hoy recibe su agenda del día.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const db = createAdminClient();

  const expired = await db.from("bookings").update({ status: "cancelled" }).eq("status", "pending").lt("start_at", new Date().toISOString()).select("id");

  const { data: drivers } = await db.from("drivers").select("id, timezone").eq("onboarded", true);
  let notified = 0;
  for (const d of drivers ?? []) {
    const p = periodStarts(d.timezone);
    const { data: today } = await db
      .from("bookings")
      .select("start_at, pickup_address, customers(full_name)")
      .eq("driver_id", d.id)
      .in("status", ["confirmed", "pending"])
      .gte("start_at", new Date().toISOString())
      .lt("start_at", p.tomorrow.toISOString())
      .order("start_at");
    if (!today?.length) continue;
    const lines = today.map((b) => `${fmtTime(b.start_at, d.timezone)} · ${(b.customers as unknown as { full_name: string })?.full_name ?? "Cliente"} · ${b.pickup_address}`);
    await notifyDriver({
      driverId: d.id,
      title: `Hoy tienes ${today.length} viaje${today.length > 1 ? "s" : ""}`,
      body: lines.join("\n"),
    });
    notified++;
  }

  return NextResponse.json({ expired: expired.data?.length ?? 0, notified });
}
