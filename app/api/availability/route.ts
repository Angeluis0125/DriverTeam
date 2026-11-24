import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicDriver, slotsFor } from "@/lib/public-booking";
import { allow } from "@/lib/rate-limit";

const Query = z.object({
  slug: z.string().max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().int().min(1).max(24 * 60),
});

export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  if (!(await allow("availability", 60))) return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  const driver = await getPublicDriver(parsed.data.slug);
  if (!driver) return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });
  const slots = await slotsFor(driver, parsed.data.date, parsed.data.duration);
  return NextResponse.json({ slots, timezone: driver.timezone });
}
