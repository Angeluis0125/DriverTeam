import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_LABELS, STATUS_LABELS, type BookingStatus, type PaymentMethod } from "@/lib/types";
import { fmt } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

const csv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Evita inyección de fórmulas en Excel
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const shift = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * 86400_000).toISOString();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return new NextResponse("Rango inválido", { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });
  const { data: driver } = await supabase.from("drivers").select("timezone").eq("id", user.id).single();
  const tz = driver?.timezone ?? "UTC";

  const { data } = await supabase
    .from("payments")
    .select("amount, tip, method, paid_at, note, bookings(start_at, status, pickup_address, dropoff_address, est_distance_km, customers(full_name, phone))")
    // margen de ±1 día para cubrir la zona horaria; se filtra exacto abajo
    .gte("paid_at", shift(`${from}T00:00:00Z`, -1))
    .lte("paid_at", shift(`${to}T23:59:59Z`, 1))
    .order("paid_at");

  type Row = {
    amount: number; tip: number; method: PaymentMethod; paid_at: string; note: string | null;
    bookings: { start_at: string; status: BookingStatus; pickup_address: string; dropoff_address: string; est_distance_km: number; customers: { full_name: string; phone: string } | null } | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => {
    const day = fmt(r.paid_at, tz, "yyyy-MM-dd");
    return day >= from && day <= to;
  });

  const header = ["Fecha de pago", "Fecha del viaje", "Cliente", "Teléfono", "Origen", "Destino", "Km", "Estado", "Método", "Monto", "Propina", "Total", "Nota"];
  const lines = rows.map((r) => [
    fmt(r.paid_at, tz, "yyyy-MM-dd HH:mm"),
    r.bookings ? fmt(r.bookings.start_at, tz, "yyyy-MM-dd HH:mm") : "",
    r.bookings?.customers?.full_name, r.bookings?.customers?.phone ? formatPhone(r.bookings.customers.phone) : "",
    r.bookings?.pickup_address, r.bookings?.dropoff_address, r.bookings?.est_distance_km,
    r.bookings ? STATUS_LABELS[r.bookings.status] : "",
    PAYMENT_LABELS[r.method], r.amount, r.tip, Number(r.amount) + Number(r.tip), r.note,
  ].map(csv).join(","));

  return new NextResponse("﻿" + [header.join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="driverteam-${from}-a-${to}.csv"`,
    },
  });
}
