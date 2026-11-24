import { NextResponse } from "next/server";
import { z } from "zod";
import { computeRoute, MapsError } from "@/lib/maps";
import { computeQuote } from "@/lib/pricing";
import { getPublicDriver } from "@/lib/public-booking";
import { signQuote } from "@/lib/quote-token";
import { allow } from "@/lib/rate-limit";

const Place = z.object({ text: z.string().trim().min(3).max(300), placeId: z.string().max(300).optional() });
const Body = z.object({ slug: z.string().max(40), pickup: Place, dropoff: Place });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  if (!(await allow("quote", 30))) return NextResponse.json({ error: "Demasiadas solicitudes, intenta en un minuto" }, { status: 429 });

  const { slug, pickup, dropoff } = parsed.data;
  const driver = await getPublicDriver(slug);
  if (!driver) return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });

  // Los placeId "mock:" solo valen en modo de prueba
  const clean = (p: typeof pickup) => (p.placeId?.startsWith("mock:") ? { text: p.text } : p);

  try {
    const route = await computeRoute(clean(pickup), clean(dropoff));
    const quote = computeQuote(driver.pricing, route.distanceKm, route.durationMin);
    const token = signQuote({ driverId: driver.id, pickup, dropoff, distanceKm: quote.distanceKm, durationMin: quote.durationMin });
    return NextResponse.json({ quote, token, currency: driver.currency });
  } catch (e) {
    const msg = e instanceof MapsError ? e.message : "No se pudo calcular el trayecto";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
