import { NextResponse } from "next/server";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";
import { addMinutes } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeQuote, formatMoney } from "@/lib/pricing";
import { customerLoyalty, getPublicDriver, slotsFor } from "@/lib/public-booking";
import { verifyQuote } from "@/lib/quote-token";
import { allow } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { notifyDriver, sendEmail, escapeHtml } from "@/lib/notify";
import { siteUrl } from "@/lib/site";

const Body = z.object({
  slug: z.string().max(40),
  quoteToken: z.string().max(4000),
  startAt: z.iso.datetime(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(25),
  email: z.union([z.email().max(200), z.literal("")]).optional(),
  passengers: z.coerce.number().int().min(1).max(20).default(1),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del formulario" }, { status: 400 });
  const b = parsed.data;
  if (!(await allow("booking", 8, 600))) return NextResponse.json({ error: "Demasiadas reservas, intenta más tarde" }, { status: 429 });

  const phone = normalizePhone(b.phone);
  if (!phone) return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });

  const driver = await getPublicDriver(b.slug);
  if (!driver) return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });

  const q = verifyQuote(b.quoteToken);
  if (!q || q.driverId !== driver.id) return NextResponse.json({ error: "La cotización expiró, vuelve a calcular" }, { status: 400 });

  // Revalidar que el horario siga libre
  const start = new Date(b.startAt);
  const date = formatInTimeZone(start, driver.timezone, "yyyy-MM-dd");
  const slots = await slotsFor(driver, date, q.durationMin);
  if (!slots.some((s) => new Date(s.start).getTime() === start.getTime())) {
    return NextResponse.json({ error: "Ese horario ya no está disponible" }, { status: 409 });
  }

  const loyalty = await customerLoyalty(driver, phone);
  const quote = computeQuote(driver.pricing, q.distanceKm, q.durationMin, loyalty.discountPct);

  const db = createAdminClient();

  // Cliente: se identifica por teléfono dentro del chofer
  let { data: customer } = await db.from("customers").select("id, email").eq("driver_id", driver.id).eq("phone", phone).maybeSingle();
  if (!customer) {
    const ins = await db
      .from("customers")
      .insert({ driver_id: driver.id, phone, full_name: b.name, email: b.email || null })
      .select("id, email")
      .single();
    if (ins.error) {
      // carrera: otro request lo creó
      customer = (await db.from("customers").select("id, email").eq("driver_id", driver.id).eq("phone", phone).single()).data;
    } else customer = ins.data;
  } else if (!customer.email && b.email) {
    await db.from("customers").update({ email: b.email }).eq("id", customer.id);
  }
  if (!customer) return NextResponse.json({ error: "No se pudo registrar el cliente" }, { status: 500 });

  const status = driver.auto_confirm ? "confirmed" : "pending";
  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      driver_id: driver.id,
      customer_id: customer.id,
      pickup_address: q.pickup.text,
      pickup_place_id: q.pickup.placeId ?? null,
      dropoff_address: q.dropoff.text,
      dropoff_place_id: q.dropoff.placeId ?? null,
      start_at: start.toISOString(),
      est_duration_min: q.durationMin,
      est_distance_km: q.distanceKm,
      est_price: quote.total,
      discount_pct: quote.discountPct,
      passengers: b.passengers,
      notes: b.notes || null,
      status,
      busy_until: addMinutes(start, q.durationMin + driver.buffer_minutes).toISOString(),
    })
    .select("id, manage_token")
    .single();

  if (error) {
    if (error.code === "23P01") return NextResponse.json({ error: "Ese horario acaba de ocuparse" }, { status: 409 });
    console.error("booking insert", error);
    return NextResponse.json({ error: "No se pudo crear la reserva" }, { status: 500 });
  }

  const when = formatInTimeZone(start, driver.timezone, "dd/MM/yyyy HH:mm");
  const price = formatMoney(quote.total, driver.currency);
  const manageUrl = `${siteUrl()}/${driver.slug}/r/${booking.manage_token}`;

  await notifyDriver({
    driverId: driver.id,
    bookingId: booking.id,
    title: status === "pending" ? "Nueva reserva por confirmar" : "Nueva reserva confirmada",
    body: `${b.name} · ${when} · ${price}\n${q.pickup.text} → ${q.dropoff.text}`,
    url: `${siteUrl()}/dashboard/bookings/${booking.id}`,
  });

  const customerEmail = b.email || customer.email;
  if (customerEmail) {
    await sendEmail(
      customerEmail,
      `Tu reserva con ${driver.full_name}`,
      `<p>Hola ${escapeHtml(b.name)}, recibimos tu reserva para el <b>${when}</b>.</p>
       <p>${escapeHtml(q.pickup.text)} → ${escapeHtml(q.dropoff.text)}<br/>Precio estimado: <b>${price}</b></p>
       <p>Estado: ${status === "pending" ? "pendiente de confirmación" : "confirmada"}</p>
       <p><a href="${manageUrl}">Ver o cancelar mi reserva</a></p>`,
    );
  }

  return NextResponse.json({ id: booking.id, token: booking.manage_token, status, total: quote.total, discountPct: quote.discountPct });
}
